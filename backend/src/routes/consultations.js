const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { appendJson } = require('../services/fileDb');
const { sendTelegramMessage } = require('../services/telegram');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function validatePhone(phone) {
  const cleaned = phone.replace(/[\s\-]/g, '');
  return /^[0-9]{9,11}$/.test(cleaned);
}

router.post('/', async (req, res) => {
  const { carId, carName, name, phone, address, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Họ và tên là bắt buộc' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Họ và tên không được vượt quá 100 ký tự' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Số điện thoại là bắt buộc' });
  }
  if (!validatePhone(phone.trim())) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ (9-11 chữ số)' });
  }
  if ((address || '').trim().length > 200) {
    return res.status(400).json({ error: 'Địa chỉ không được vượt quá 200 ký tự' });
  }
  if ((notes || '').trim().length > 500) {
    return res.status(400).json({ error: 'Ghi chú không được vượt quá 500 ký tự' });
  }

  const consultation = {
    id: uuidv4(),
    carId: carId || '',
    carName: carName || 'Chưa chọn xe',
    name: name.trim(),
    phone: phone.trim(),
    address: (address || '').trim(),
    notes: (notes || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await appendJson('consultations.json', consultation);

  // Send Telegram notification (non-blocking)
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const text =
        `🚗 <b>YÊU CẦU TƯ VẤN MỚI</b>\n` +
        `──────────────────────\n` +
        `Xe: <b>${escapeHtml(consultation.carName)}</b>\n` +
        `Khách hàng: ${escapeHtml(consultation.name)}\n` +
        `SĐT: <b>${escapeHtml(consultation.phone)}</b>\n` +
        `Địa chỉ: ${escapeHtml(consultation.address) || 'Không có'}\n` +
        `Ghi chú: ${escapeHtml(consultation.notes) || 'Không có'}\n` +
        `──────────────────────\n` +
        `⏰ ${now}`;

      sendTelegramMessage(botToken, chatId, text).catch(err =>
        console.error('Telegram error:', err.message)
      );
    }
  } catch (err) {
    console.error('Notification error:', err.message);
  }

  res.status(201).json({ success: true, id: consultation.id });
});

module.exports = router;
