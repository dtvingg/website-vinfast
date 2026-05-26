const express = require('express');
const router = express.Router();
const { readJsonObject } = require('../services/fileDb');

router.get('/', (req, res) => {
  const settings = readJsonObject('settings.json');
  // Never expose telegram credentials to frontend
  const { telegram, ...publicSettings } = settings;
  res.json(publicSettings);
});

module.exports = router;
