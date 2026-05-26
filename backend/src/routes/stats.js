const express = require('express');
const router = express.Router();
const { readJson } = require('../services/fileDb');

router.get('/', (req, res) => {
  const apiKey = process.env.STATS_API_KEY;
  if (apiKey) {
    const provided = req.headers['x-api-key'] || req.query.key;
    if (provided !== apiKey) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const visits = readJson('visits.json');

  const totalVisits = visits.length;
  const uniqueSessions = new Set(visits.map(v => v.sessionId).filter(Boolean)).size;

  const visitsByPage = {};
  const visitsByDay = {};
  const referrerCounts = {};

  visits.forEach(v => {
    // Page stats
    const page = v.page || '/';
    visitsByPage[page] = (visitsByPage[page] || 0) + 1;

    // Daily stats
    const day = v.timestamp ? v.timestamp.split('T')[0] : 'unknown';
    visitsByDay[day] = (visitsByDay[day] || 0) + 1;

    // Referrer stats
    let ref = 'direct';
    if (v.referrer) {
      try {
        ref = new URL(v.referrer).hostname || 'direct';
      } catch {
        ref = 'direct';
      }
    }
    referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
  });

  // Sort days descending, keep last 30
  const visitsByDaySorted = Object.entries(visitsByDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30)
    .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});

  res.json({
    totalVisits,
    uniqueSessions,
    visitsByPage,
    visitsByDay: visitsByDaySorted,
    topReferrers: referrerCounts
  });
});

module.exports = router;
