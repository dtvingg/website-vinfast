const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { appendJson } = require('../services/fileDb');

const MAX_VISITS = 10000;

router.post('/', async (req, res) => {
  const { page, referrer, sessionId } = req.body;

  const rawIp = req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';
  const ip = rawIp.replace(/\.\d+$/, '.x');

  const visit = {
    id: uuidv4(),
    page: (page || '/').substring(0, 200),
    ip,
    userAgent: (req.headers['user-agent'] || '').substring(0, 200),
    referrer: (referrer || '').substring(0, 500),
    sessionId: (sessionId || '').substring(0, 100),
    timestamp: new Date().toISOString()
  };

  await appendJson('visits.json', visit, { maxItems: MAX_VISITS });

  res.status(204).end();
});

module.exports = router;
