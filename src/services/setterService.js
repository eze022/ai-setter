const Anthropic = require('@anthropic-ai/sdk');
const { getSystemPrompt } = require('../prompts/setter');
const ghlService = require('./ghlService');

const client = new Anthropic();

// In-memory conversation state — keyed by contactId
const conversations = new Map();

const BUSINESS_INFO = {
  setterName: process.env.SETTER_NAME || 'Sofía',
  businessName: process.env.BUSINESS_NAME || '',
  service: process.env.BUSINESS_SERVICE || '',
  targetClient: process.env.BUSINESS_TARGET_CLIENT || '',
  calendarLink: process.env.CALENDAR_LINK || '',
  minEmployees: parseInt(process.env.MIN_EMPLOYEES || '5', 10),
};

const FALLBACK_MESSAGE =
  'Disculpa, estoy teniendo un problema técnico. Te contactamos en breve.';

const BOOKING_SIGNALS = ['link', 'calendario', 'calendly', 'agendá', 'agendar', 'reservá'];
const CLOSED_SIGNALS = [
  'no encaja',
  'por ahora no',
  'no es el momento',
  'mucho éxito',
  'te deseo éxito',
  'cualquier cosa, aquí',
];

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SLOT_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
const ORDINALS = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'];

// ─── State ────────────────────────────────────────────────────────────────────

function getOrCreateContact(contactId, firstName, channel) {
  if (!conversations.has(contactId)) {
    conversations.set(contactId, {
      history: [],
      stage: 'greeting',
      qualified: null,
      firstName,
      channel,
      availableSlots: null,
    });
  }
  return conversations.get(contactId);
}

// ─── Stage detection ──────────────────────────────────────────────────────────

function detectStage(responseText) {
  const lower = responseText.toLowerCase();
  if (BOOKING_SIGNALS.some((s) => lower.includes(s))) return 'booking';
  if (CLOSED_SIGNALS.some((s) => lower.includes(s))) return 'closed';
  return null;
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function getNextBusinessDays(count) {
  const days = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1); // start tomorrow
  cursor.setHours(0, 0, 0, 0);

  while (days.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function normalizeSlots(apiResponse) {
  // GHL returns { data: { slots: { "YYYY-MM-DD": ["ISO",...] } } }
  const raw = apiResponse?.data?.slots ?? apiResponse?.slots ?? {};
  const times = [];
  for (const daySlots of Object.values(raw)) {
    for (const t of Array.isArray(daySlots) ? daySlots : []) {
      times.push(typeof t === 'string' ? t : t.time ?? t.startTime);
    }
  }
  return times.sort();
}

function formatSlotLabel(isoString) {
  const date = new Date(isoString);
  const day = DAY_NAMES[date.getDay()];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${d}/${m} a las ${hh}:${mm} hs`;
}

// ─── Slot selection parser ─────────────────────────────────────────────────────

function extractSlotChoice(body, count) {
  // Bare number: "2", " 3 "
  const bare = body.trim().match(/^(\d+)$/);
  if (bare) {
    const n = parseInt(bare[1], 10);
    if (n >= 1 && n <= count) return n;
  }

  // Digit embedded in text: "el 2 me viene bien"
  const embedded = body.match(/\b([1-9])\b/);
  if (embedded) {
    const n = parseInt(embedded[1], 10);
    if (n >= 1 && n <= count) return n;
  }

  // Spanish ordinals
  const lower = body.toLowerCase();
  for (let i = 0; i < ORDINALS.length; i++) {
    if (lower.includes(ORDINALS[i]) && i + 1 <= count) return i + 1;
  }

  return null;
}

// ─── Booking flow ─────────────────────────────────────────────────────────────

async function handleBooking(contactId, conversationId) {
  const state = conversations.get(contactId);
  if (!state) return;

  const channel = state.channel ?? 'WhatsApp';
  const businessDays = getNextBusinessDays(5);
  const startDate = businessDays[0].toISOString().split('T')[0];
  const endDate = businessDays[4].toISOString().split('T')[0];

  let rawSlots;
  try {
    const response = await ghlService.getCalendarSlots(
      process.env.GHL_CALENDAR_ID,
      startDate,
      endDate
    );
    rawSlots = normalizeSlots(response).slice(0, 6);
  } catch {
    await ghlService.sendMessage(
      conversationId,
      'Tuve un problema para ver la disponibilidad. Te contactamos para coordinar manualmente.',
      channel
    );
    return;
  }

  if (!rawSlots.length) {
    await ghlService.sendMessage(
      conversationId,
      'Por el momento no tengo horarios disponibles esta semana. Te escribo cuando se libere un espacio. 🗓️',
      channel
    );
    return;
  }

  state.availableSlots = rawSlots.map((iso, i) => ({
    index: i + 1,
    label: formatSlotLabel(iso),
    startTime: iso,
    endTime: new Date(new Date(iso).getTime() + 30 * 60 * 1000).toISOString(),
  }));

  const lines = state.availableSlots
    .map((s) => `${SLOT_EMOJIS[s.index - 1]} ${s.label}`)
    .join('\n');

  const message =
    `Tengo disponibilidad en estos horarios:\n\n${lines}\n\n` +
    `¿Con cuál te queda mejor? Respondé con el número.`;

  state.history.push({ role: 'assistant', content: message });
  conversations.set(contactId, state);

  await ghlService.sendMessage(conversationId, message, channel);
}

async function confirmAppointment(contactId, conversationId, slot) {
  const state = conversations.get(contactId);
  if (!state) return;

  const channel = state.channel ?? 'WhatsApp';

  try {
    await ghlService.createAppointment(contactId, slot);
  } catch {
    await ghlService.sendMessage(
      conversationId,
      'Hubo un problema al confirmar la cita. Te contactamos en breve para coordinar.',
      channel
    );
    return;
  }

  const confirmation =
    `¡Perfecto! Agendé tu llamada para el ${slot.label}.\n` +
    `Te llega una invitación por email. ¡Nos vemos entonces! 🎯`;

  state.history.push({ role: 'assistant', content: confirmation });
  state.stage = 'closed';
  state.qualified = true;
  conversations.set(contactId, state);

  await ghlService.sendMessage(conversationId, confirmation, channel);

  // Best-effort: tag the contact in GHL (non-blocking)
  ghlService
    .updateContact(contactId, {
      tags: ['cita-agendada'],
      customFields: [{ key: 'setter_stage', value: 'closed' }],
    })
    .catch((err) => console.error('[SetterService] updateContact failed:', err.message));
}

// ─── Main entry point ─────────────────────────────────────────────────────────

async function processMessage({ contactId, conversationId, channel, body, firstName }) {
  const state = getOrCreateContact(contactId, firstName, channel);

  if (state.stage === 'closed') return;

  // When awaiting slot selection, try to resolve before calling Claude
  if (state.stage === 'booking' && state.availableSlots?.length) {
    const choice = extractSlotChoice(body, state.availableSlots.length);
    if (choice !== null) {
      state.history.push({ role: 'user', content: body });
      conversations.set(contactId, state);
      await confirmAppointment(contactId, conversationId, state.availableSlots[choice - 1]);
      return;
    }
  }

  state.history.push({ role: 'user', content: body });

  let responseText;
  let claudeOk = true;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      temperature: 0.7,
      system: getSystemPrompt(BUSINESS_INFO),
      messages: state.history,
    });
    responseText = response.content[0].text;
  } catch (err) {
    console.error('[SetterService] Claude API error:', err.message);
    responseText = FALLBACK_MESSAGE;
    claudeOk = false;
  }

  state.history.push({ role: 'assistant', content: responseText });

  if (claudeOk) {
    const newStage = detectStage(responseText);
    if (newStage) {
      state.stage = newStage;
      state.qualified = newStage === 'booking';
    } else if (state.stage === 'greeting') {
      state.stage = 'qualifying';
    }
  }

  conversations.set(contactId, state);

  await ghlService.sendMessage(conversationId, responseText, channel);

  // Trigger booking flow the first time Claude transitions to booking
  if (state.stage === 'booking' && !state.availableSlots) {
    await handleBooking(contactId, conversationId);
  }
}

module.exports = { processMessage, handleBooking };
