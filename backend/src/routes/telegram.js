const express = require('express');
const router = express.Router();
const { readJson } = require('../services/fileDb');
const { sendTelegramMessage } = require('../services/telegram');

const TZ = 'Asia/Ho_Chi_Minh';

function toLocal(isoStr) {
  return new Date(new Date(isoStr).toLocaleString('en-US', { timeZone: TZ }));
}

function nowLocal() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

// filter: { type: 'day'|'month'|'quarter'|'year', day, month (0-based), quarter (0-based), year }
function getStats(filter) {
  const visits        = readJson('visits.json')        || [];
  const consultations = readJson('consultations.json') || [];

  function match(isoStr) {
    if (!isoStr) return false;
    const d = toLocal(isoStr);
    switch (filter.type) {
      case 'day':
        return d.getFullYear() === filter.year &&
               d.getMonth()    === filter.month &&
               d.getDate()     === filter.day;
      case 'month':
        return d.getFullYear() === filter.year &&
               d.getMonth()    === filter.month;
      case 'quarter':
        return d.getFullYear() === filter.year &&
               Math.floor(d.getMonth() / 3) === filter.quarter;
      case 'year':
        return d.getFullYear() === filter.year;
    }
  }

  const fv = visits.filter(v => match(v.timestamp));
  const fc = consultations.filter(c => match(c.createdAt));
  return {
    visits:        fv.length,
    sessions:      new Set(fv.map(v => v.sessionId).filter(Boolean)).size,
    consultations: fc.length,
  };
}

// Parse "/thongke ngay [dd/mm/yyyy]"
function parseDay(arg) {
  if (!arg) {
    const n = nowLocal();
    return { type: 'day', day: n.getDate(), month: n.getMonth(), year: n.getFullYear(), label: 'Hôm nay' };
  }
  const m = arg.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m.map(Number);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return { type: 'day', day: dd, month: mm - 1, year: yyyy, label: `Ngày ${dd}/${mm}/${yyyy}` };
}

// Parse "/thongke thang [mm/yyyy]"
function parseMonth(arg) {
  if (!arg) {
    const n = nowLocal();
    return { type: 'month', month: n.getMonth(), year: n.getFullYear(), label: `Tháng ${n.getMonth() + 1}/${n.getFullYear()}` };
  }
  const m = arg.match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, yyyy] = m.map(Number);
  if (mm < 1 || mm > 12) return null;
  return { type: 'month', month: mm - 1, year: yyyy, label: `Tháng ${mm}/${yyyy}` };
}

// Parse "/thongke quy [q/yyyy]"
function parseQuarter(arg) {
  if (!arg) {
    const n = nowLocal();
    const q = Math.floor(n.getMonth() / 3) + 1;
    return { type: 'quarter', quarter: q - 1, year: n.getFullYear(), label: `Quý ${q}/${n.getFullYear()}` };
  }
  const m = arg.match(/^([1-4])\/(\d{4})$/);
  if (!m) return null;
  const [, q, yyyy] = m.map(Number);
  return { type: 'quarter', quarter: q - 1, year: yyyy, label: `Quý ${q}/${yyyy}` };
}

// Parse "/thongke nam [yyyy]"
function parseYear(arg) {
  if (!arg) {
    const n = nowLocal();
    return { type: 'year', year: n.getFullYear(), label: `Năm ${n.getFullYear()}` };
  }
  const m = arg.match(/^(\d{4})$/);
  if (!m) return null;
  const yyyy = Number(m[1]);
  return { type: 'year', year: yyyy, label: `Năm ${yyyy}` };
}

function statsText(filter) {
  const s   = getStats(filter);
  const now = new Date().toLocaleString('vi-VN', { timeZone: TZ });
  return `📊 <b>THỐNG KÊ — ${filter.label.toUpperCase()}</b>\n` +
    `──────────────────\n` +
    `👁 Lượt truy cập: <b>${s.visits}</b>\n` +
    `👤 Phiên duy nhất: <b>${s.sessions}</b>\n` +
    `📋 Yêu cầu tư vấn: <b>${s.consultations}</b>\n` +
    `──────────────────\n` +
    `⏰ ${now}`;
}

function block(label, s) {
  return `<b>📅 ${label}</b>\n` +
    `  👁 Truy cập: <b>${s.visits}</b>  |  👤 Phiên: <b>${s.sessions}</b>  |  📋 Tư vấn: <b>${s.consultations}</b>`;
}

function overviewText() {
  const n   = nowLocal();
  const now = new Date().toLocaleString('vi-VN', { timeZone: TZ });
  const q   = Math.floor(n.getMonth() / 3) + 1;
  return `📊 <b>THỐNG KÊ TỔNG QUAN</b>\n` +
    `──────────────────\n` +
    block('Hôm nay',   getStats({ type: 'day',     day: n.getDate(), month: n.getMonth(), year: n.getFullYear() })) + '\n\n' +
    block(`Tháng ${n.getMonth() + 1}/${n.getFullYear()}`, getStats({ type: 'month',   month: n.getMonth(),   year: n.getFullYear() })) + '\n\n' +
    block(`Quý ${q}/${n.getFullYear()}`,  getStats({ type: 'quarter', quarter: q - 1,        year: n.getFullYear() })) + '\n\n' +
    block(`Năm ${n.getFullYear()}`,       getStats({ type: 'year',    year: n.getFullYear() })) + '\n' +
    `──────────────────\n` +
    `⏰ ${now}`;
}

const HELP =
  `👋 <b>VinFast Mạnh Hiển Bot</b>\n\n` +
  `📊 <b>Lệnh thống kê:</b>\n` +
  `/thongke — Tổng quan hiện tại\n\n` +
  `<b>Hôm nay / ngày cụ thể:</b>\n` +
  `/thongke ngay\n` +
  `/thongke ngay 02/06/2026\n\n` +
  `<b>Tháng này / tháng cụ thể:</b>\n` +
  `/thongke thang\n` +
  `/thongke thang 06/2026\n\n` +
  `<b>Quý này / quý cụ thể:</b>\n` +
  `/thongke quy\n` +
  `/thongke quy 2/2026\n\n` +
  `<b>Năm này / năm cụ thể:</b>\n` +
  `/thongke nam\n` +
  `/thongke nam 2026`;

router.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const botToken    = process.env.TELEGRAM_BOT_TOKEN;
    const allowedChat = process.env.TELEGRAM_CHAT_ID;
    if (!botToken) return;

    const message = req.body?.message;
    if (!message?.text) return;

    const chatId = String(message.chat?.id);
    if (allowedChat && chatId !== String(allowedChat)) return;

    const raw   = message.text.trim().replace(/\s+/g, ' ');
    const lower = raw.toLowerCase();
    const parts = lower.split(' ');
    let reply   = null;

    if (lower === '/start' || lower === '/help') {
      reply = HELP;
    } else if (lower === '/thongke') {
      reply = overviewText();
    } else if (parts[0] === '/thongke' && parts[1] === 'ngay') {
      const filter = parseDay(parts[2] || null);
      reply = filter ? statsText(filter) : `❌ Sai cú pháp. Dùng:\n/thongke ngay\n/thongke ngay dd/mm/yyyy`;
    } else if (parts[0] === '/thongke' && parts[1] === 'thang') {
      const filter = parseMonth(parts[2] || null);
      reply = filter ? statsText(filter) : `❌ Sai cú pháp. Dùng:\n/thongke thang\n/thongke thang mm/yyyy`;
    } else if (parts[0] === '/thongke' && parts[1] === 'quy') {
      const filter = parseQuarter(parts[2] || null);
      reply = filter ? statsText(filter) : `❌ Sai cú pháp. Dùng:\n/thongke quy\n/thongke quy q/yyyy  (q từ 1-4)`;
    } else if (parts[0] === '/thongke' && parts[1] === 'nam') {
      const filter = parseYear(parts[2] || null);
      reply = filter ? statsText(filter) : `❌ Sai cú pháp. Dùng:\n/thongke nam\n/thongke nam yyyy`;
    }

    if (reply) {
      await sendTelegramMessage(botToken, chatId, reply);
    }
  } catch (err) {
    console.error('Telegram webhook error:', err.message);
  }
});

module.exports = router;
