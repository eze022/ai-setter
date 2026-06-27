const axios = require('axios');

const BASE_URL = 'https://services.leadconnectorhq.com';

const ghl = axios.create({
  baseURL: BASE_URL,
  headers: {
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  },
});

// Inject API key at request time so it picks up the env var after dotenv loads
ghl.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${process.env.GHL_API_KEY}`;
  return config;
});

async function sendMessage(conversationId, message, channel) {
  const endpoint = '/conversations/messages';
  try {
    const { data } = await ghl.post(endpoint, {
      conversationId,
      message,
      type: channel === 'WhatsApp' ? 'WhatsApp' : 'Instagram',
    });
    return data;
  } catch (err) {
    console.error(`[GHL] POST ${endpoint} failed:`, err.response?.data ?? err.message);
    throw err;
  }
}

async function updateContact(contactId, data) {
  const endpoint = `/contacts/${contactId}`;
  try {
    const { data: response } = await ghl.put(endpoint, data);
    return response;
  } catch (err) {
    console.error(`[GHL] PUT ${endpoint} failed:`, err.response?.data ?? err.message);
    throw err;
  }
}

async function getCalendarSlots(calendarId, startDate, endDate) {
  const endpoint = `/calendars/${calendarId}/free-slots`;
  try {
    const { data } = await ghl.get(endpoint, {
      params: {
        startDate,
        endDate,
        timezone: 'America/Argentina/Buenos_Aires',
      },
    });
    return data;
  } catch (err) {
    console.error(`[GHL] GET ${endpoint} failed:`, err.response?.data ?? err.message);
    throw err;
  }
}

async function createAppointment(contactId, slot) {
  const endpoint = '/calendars/events/appointments';
  try {
    const { data } = await ghl.post(endpoint, {
      calendarId: process.env.GHL_CALENDAR_ID,
      locationId: process.env.GHL_LOCATION_ID,
      contactId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      title: 'Llamada de diagnóstico',
    });
    return data;
  } catch (err) {
    console.error(`[GHL] POST ${endpoint} failed:`, err.response?.data ?? err.message);
    throw err;
  }
}

module.exports = { sendMessage, updateContact, getCalendarSlots, createAppointment };
