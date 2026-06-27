const express = require('express');
const { handleGHLWebhook } = require('../webhooks/ghl');

const router = express.Router();

router.post('/ghl', handleGHLWebhook);

module.exports = router;
