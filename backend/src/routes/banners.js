const express = require('express');
const router = express.Router();
const { readJson } = require('../services/fileDb');

router.get('/', (req, res) => {
  const banners = readJson('banners.json');
  res.json(banners.sort((a, b) => a.order - b.order));
});

module.exports = router;
