const { normalizeKgPhone } = require("../services/smsService");
const { requireAdmin } = require("./adminAuth");

function isValidKgMobile(rawPhone) {
  const normalized = normalizeKgPhone(rawPhone);
  return !!normalized && /^996[2579]\d{8}$/.test(normalized);
}

function validateBooking(req, res, next) {
  const { name, phone, tour } = req.body || {};
  const errors = [];

  if (!name || String(name).trim().length < 2) errors.push("Укажите имя");
  if (!tour || !String(tour).trim()) errors.push("Укажите выбранный тур");
  if (!phone || !isValidKgMobile(phone)) errors.push("Укажите корректный мобильный номер Кыргызстана (например +996 700 123 456)");

  if (errors.length > 0) return res.status(400).json({ success: false, errors });
  next();
}

module.exports = { validateBooking, requireAdminKey: requireAdmin };
