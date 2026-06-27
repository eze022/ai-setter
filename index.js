require('dotenv').config();
const express = require('express');
const webhookRouter = require('./src/routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/webhook', webhookRouter);

app.listen(PORT, () => {
  console.log(`AI Setter server running on port ${PORT}`);
});
