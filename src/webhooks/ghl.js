const setterService = require('../services/setterService');

const SUPPORTED_CHANNELS = ['Instagram', 'WhatsApp'];

async function handleGHLWebhook(req, res) {
  const payload = req.body;

  // Verify request belongs to our GHL location
  if (!payload.locationId || payload.locationId !== process.env.GHL_LOCATION_ID) {
    return res.sendStatus(401);
  }

  // Only process inbound messages
  if (payload.type !== 'InboundMessage') {
    return res.sendStatus(200);
  }

  // Only Instagram and WhatsApp
  if (!SUPPORTED_CHANNELS.includes(payload.channel)) {
    return res.sendStatus(200);
  }

  // Respond immediately so GHL doesn't timeout
  res.sendStatus(200);

  const contactData = {
    contactId: payload.contactId,
    conversationId: payload.conversationId,
    channel: payload.channel,
    body: payload.body,
    firstName: payload.firstName,
  };

  setterService.processMessage(contactData).catch((err) => {
    console.error('[GHL] processMessage failed:', err.message);
  });
}

module.exports = { handleGHLWebhook };
