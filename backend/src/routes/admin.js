const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, requireAdmin } = require('../middleware/auth');
const { readJson } = require('../services/fileDb');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vinfast2024';

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

router.get('/stats', requireAdmin, (req, res) => {
  const visits = readJson('visits.json');
  const consultations = readJson('consultations.json');

  const { period, value } = req.query;
  let filtered, filteredC, breakdown = {}, periodLabel = '';

  const thisMonth = new Date().toISOString().slice(0, 7);
  const p = period || 'month';
  const v = value || thisMonth;

  function buildBreakdown(visitList, consultList, keyFn) {
    const map = {};
    visitList.forEach(x => {
      const k = keyFn(x.timestamp);
      if (!k) return;
      if (!map[k]) map[k] = { visits: 0, sessionIds: new Set(), consultations: 0 };
      map[k].visits++;
      if (x.sessionId) map[k].sessionIds.add(x.sessionId);
    });
    consultList.forEach(x => {
      const k = keyFn(x.createdAt);
      if (!k) return;
      if (!map[k]) map[k] = { visits: 0, sessionIds: new Set(), consultations: 0 };
      map[k].consultations++;
    });
    const result = {};
    Object.entries(map).forEach(([k, val]) => {
      result[k] = { visits: val.visits, sessions: val.sessionIds.size, consultations: val.consultations };
    });
    return result;
  }

  if (p === 'day') {
    filtered  = visits.filter(x => x.timestamp && x.timestamp.startsWith(v));
    filteredC = consultations.filter(x => x.createdAt && x.createdAt.startsWith(v));
    periodLabel = v;
  } else if (p === 'month') {
    filtered  = visits.filter(x => x.timestamp && x.timestamp.startsWith(v));
    filteredC = consultations.filter(x => x.createdAt && x.createdAt.startsWith(v));
    breakdown = buildBreakdown(filtered, filteredC, ts => ts ? ts.split('T')[0] : null);
    periodLabel = v;
  } else if (p === 'quarter') {
    const [year, q] = v.split('-Q');
    const qMonths = { '1':['01','02','03'], '2':['04','05','06'], '3':['07','08','09'], '4':['10','11','12'] };
    const months = (qMonths[q] || []).map(m => `${year}-${m}`);
    filtered  = visits.filter(x => x.timestamp && months.some(m => x.timestamp.startsWith(m)));
    filteredC = consultations.filter(x => x.createdAt && months.some(m => x.createdAt.startsWith(m)));
    breakdown = buildBreakdown(filtered, filteredC, ts => ts ? ts.slice(0, 7) : null);
    periodLabel = `Quý ${q}/${year}`;
  } else if (p === 'year') {
    filtered  = visits.filter(x => x.timestamp && x.timestamp.startsWith(v));
    filteredC = consultations.filter(x => x.createdAt && x.createdAt.startsWith(v));
    breakdown = buildBreakdown(filtered, filteredC, ts => ts ? ts.slice(0, 7) : null);
    periodLabel = `Năm ${v}`;
  }

  res.json({
    periodVisits: filtered.length,
    periodSessions: new Set(filtered.map(x => x.sessionId).filter(Boolean)).size,
    periodConsultations: filteredC.length,
    periodLabel,
    breakdown,
  });
});

router.get('/stats/detail', requireAdmin, (req, res) => {
  const { date, type, page = '1', pageSize = '20' } = req.query;
  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;

  if (!date) return res.status(400).json({ error: 'date required' });

  if (type === 'visits') {
    const visits = readJson('visits.json');
    const filtered = visits.filter(x => x.timestamp && x.timestamp.startsWith(date)).reverse();
    return res.json({ total: filtered.length, page: p, pageSize: ps, data: filtered.slice((p - 1) * ps, p * ps) });
  }

  if (type === 'sessions') {
    const visits = readJson('visits.json');
    const filtered = visits.filter(x => x.timestamp && x.timestamp.startsWith(date));
    const sessionMap = {};
    filtered.forEach(v => {
      const sid = v.sessionId || '(no-session)';
      if (!sessionMap[sid]) sessionMap[sid] = { sessionId: sid, pages: [], ips: new Set(), first: v.timestamp, last: v.timestamp };
      const s = sessionMap[sid];
      s.pages.push(v.page || '/');
      if (v.ip) s.ips.add(v.ip);
      if (v.timestamp < s.first) s.first = v.timestamp;
      if (v.timestamp > s.last) s.last = v.timestamp;
    });
    const sessions = Object.values(sessionMap).sort((a, b) => (b.last || '').localeCompare(a.last || ''));
    const data = sessions.slice((p - 1) * ps, p * ps).map(s => ({
      sessionId: s.sessionId,
      pages: [...new Set(s.pages)],
      pageCount: s.pages.length,
      ips: [...s.ips],
      first: s.first,
      last: s.last,
    }));
    return res.json({ total: sessions.length, page: p, pageSize: ps, data });
  }

  if (type === 'consultations') {
    const consultations = readJson('consultations.json');
    const filtered = consultations.filter(x => x.createdAt && x.createdAt.startsWith(date)).reverse();
    return res.json({ total: filtered.length, page: p, pageSize: ps, data: filtered.slice((p - 1) * ps, p * ps) });
  }

  res.status(400).json({ error: 'type must be visits, sessions, or consultations' });
});

function filterByPeriod(items, field, period, value) {
  if (!period || !value) return items;
  if (period === 'day' || period === 'month' || period === 'year') {
    return items.filter(x => x[field] && x[field].startsWith(value));
  }
  if (period === 'quarter') {
    const [year, q] = value.split('-Q');
    const qMonths = { '1':['01','02','03'], '2':['04','05','06'], '3':['07','08','09'], '4':['10','11','12'] };
    const months = (qMonths[q] || []).map(m => `${year}-${m}`);
    return items.filter(x => x[field] && months.some(m => x[field].startsWith(m)));
  }
  return items;
}

router.get('/visits', requireAdmin, (req, res) => {
  const { period, value, page = '1', pageSize = '20' } = req.query;
  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;
  const all = readJson('visits.json').reverse();
  const filtered = filterByPeriod(all, 'timestamp', period, value);
  res.json({ total: filtered.length, page: p, pageSize: ps, data: filtered.slice((p - 1) * ps, p * ps) });
});

router.get('/sessions', requireAdmin, (req, res) => {
  const { period, value, page = '1', pageSize = '20' } = req.query;
  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;
  const all = readJson('visits.json');
  const filtered = filterByPeriod(all, 'timestamp', period, value);
  const sessionMap = {};
  filtered.forEach(v => {
    const sid = v.sessionId || '(no-session)';
    if (!sessionMap[sid]) sessionMap[sid] = { sessionId: sid, pages: [], ips: new Set(), first: v.timestamp, last: v.timestamp };
    const s = sessionMap[sid];
    s.pages.push(v.page || '/');
    if (v.ip) s.ips.add(v.ip);
    if (v.timestamp < s.first) s.first = v.timestamp;
    if (v.timestamp > s.last) s.last = v.timestamp;
  });
  const sessions = Object.values(sessionMap).sort((a, b) => (b.last || '').localeCompare(a.last || ''));
  const data = sessions.slice((p - 1) * ps, p * ps).map(s => ({
    sessionId: s.sessionId,
    pages: [...new Set(s.pages)],
    pageCount: s.pages.length,
    ips: [...s.ips],
    first: s.first,
    last: s.last,
  }));
  res.json({ total: sessions.length, page: p, pageSize: ps, data });
});

router.get('/consultations', requireAdmin, (req, res) => {
  const { period, value, page = '1', pageSize = '20' } = req.query;
  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;
  const all = readJson('consultations.json').reverse();
  const filtered = filterByPeriod(all, 'createdAt', period, value);
  res.json({ total: filtered.length, page: p, pageSize: ps, data: filtered.slice((p - 1) * ps, p * ps) });
});

module.exports = router;
