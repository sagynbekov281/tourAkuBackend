const Booking = require("../models/Booking");
const Tour = require("../models/Tour");
const { sendSms, normalizeKgPhone } = require("../services/smsService");
const { notifyManager } = require("../services/emailService");

const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const REQUIRE_OTP = process.env.REQUIRE_OTP === "true";
const SMS_ON_APPROVE = process.env.SMS_ON_APPROVE === "true";

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function publicView(b) {
  return {
    id: b._id,
    name: b.name,
    tour: b.tour,
    phone: b.phone,
    peopleCount: b.peopleCount,
    status: b.status,
    smsStatus: b.smsStatus,
    phoneVerified: b.phoneVerified,
    createdAt: b.createdAt,
  };
}

async function tryNotifyManager(booking) {
  try {
    const result = await notifyManager(booking);
    if (result && result.ok) {
      booking.managerNotified = true;
      await booking.save();
    }
  } catch (err) {
    console.error("[email] Не удалось уведомить менеджера:", err.message);
  }
}

async function createBooking(req, res) {
  try {
    const name = String(req.body.name).trim();
    const tour = String(req.body.tour).trim();
    const message = req.body.message ? String(req.body.message).trim() : "";
    const peopleCount = Math.max(1, Number(req.body.peopleCount) || 1);
    const phone = normalizeKgPhone(req.body.phone);

    if (!REQUIRE_OTP) {
      const booking = await Booking.create({ name, tour, message, peopleCount, phone });
      console.info("[bookings] Новая бронь сохранена");
      await tryNotifyManager(booking);
      return res.status(201).json({ success: true, needsVerification: false, booking: publicView(booking) });
    }

    const otpCode = generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const booking = await Booking.create({
      name, tour, message, peopleCount, phone,
      otpCode, otpExpiresAt, otpAttempts: 0, phoneVerified: false,
    });
    console.info("[bookings] Новая бронь сохранена; ожидает SMS-подтверждения");

    const smsText = `TourCo: vash kod podtverzhdeniya - ${otpCode}. Kod deystvitelen ${OTP_TTL_MINUTES} minut.`;

    try {
      const smsResult = await sendSms(phone, smsText);
      console.log("[sms] Ответ от провайдера:", JSON.stringify(smsResult));
      booking.smsStatus = "sent";
    } catch (smsErr) {
      console.error("[sms] Не удалось отправить SMS:", smsErr.message);
      booking.smsStatus = "failed";
      booking.smsError = smsErr.message;
    }

    await booking.save();
    return res.status(201).json({ success: true, needsVerification: true, booking: publicView(booking) });
  } catch (err) {
    console.error("[bookings] Ошибка создания брони:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

async function verifyOtp(req, res) {
  try {
    const { id } = req.params;
    const code = String(req.body.code || "").trim();

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, error: "Бронь не найдена" });

    if (booking.phoneVerified) {
      return res.json({ success: true, alreadyVerified: true, booking: publicView(booking) });
    }

    if (!booking.otpCode || !booking.otpExpiresAt || booking.otpExpiresAt < new Date()) {
      return res.status(400).json({ success: false, error: "Код истёк. Нажмите «Отправить код ещё раз».", expired: true });
    }

    if (booking.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ success: false, error: "Слишком много неверных попыток. Запросите новый код." });
    }

    if (code !== booking.otpCode) {
      booking.otpAttempts += 1;
      await booking.save();
      return res.status(400).json({ success: false, error: "Неверный код", attemptsLeft: MAX_OTP_ATTEMPTS - booking.otpAttempts });
    }

    booking.phoneVerified = true;
    booking.otpCode = null;
    booking.otpExpiresAt = null;
    await booking.save();

    await tryNotifyManager(booking);

    return res.json({ success: true, booking: publicView(booking) });
  } catch (err) {
    console.error("[bookings] Ошибка проверки кода:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

async function resendOtp(req, res) {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, error: "Бронь не найдена" });
    if (booking.phoneVerified) return res.status(400).json({ success: false, error: "Номер уже подтверждён" });

    const otpCode = generateOtpCode();
    booking.otpCode = otpCode;
    booking.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    booking.otpAttempts = 0;

    const smsText = `TourCo: vash kod podtverzhdeniya - ${otpCode}. Kod deystvitelen ${OTP_TTL_MINUTES} minut.`;

    try {
      const smsResult = await sendSms(booking.phone, smsText);
      console.log("[sms] Ответ от провайдера (resend):", JSON.stringify(smsResult));
      booking.smsStatus = "sent";
    } catch (smsErr) {
      console.error("[sms] Не удалось отправить SMS:", smsErr.message);
      booking.smsStatus = "failed";
      booking.smsError = smsErr.message;
    }

    await booking.save();
    return res.json({ success: true, booking: publicView(booking) });
  } catch (err) {
    console.error("[bookings] Ошибка повторной отправки кода:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

async function listBookings(req, res) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(500);
    return res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error("[bookings] Ошибка получения списка:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

async function adjustSeats(tourTitle, delta) {
  if (!delta) return { tracked: false, available: true };

  const filter = { $or: [{ title: tourTitle }, { titleEn: tourTitle }] };
  if (delta > 0) {
    const result = await Tour.updateOne(
      {
        ...filter,
        totalSeats: { $gt: 0 },
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ["$bookedSeats", 0] }, delta] },
            "$totalSeats",
          ],
        },
      },
      { $inc: { bookedSeats: delta } }
    );

    if (result.modifiedCount > 0) return { tracked: true, available: true };

    const tour = await Tour.findOne(filter);
    if (!tour || !tour.totalSeats) return { tracked: false, available: true };
    return { tracked: true, available: false };
  }

  const tour = await Tour.findOne(filter);
  if (!tour || !tour.totalSeats) return { tracked: false, available: true };
  tour.bookedSeats = Math.min(tour.totalSeats, Math.max(0, (tour.bookedSeats || 0) + delta));
  await tour.save();
  return { tracked: true, available: true };
}

async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "Некорректный статус" });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, error: "Бронь не найдена" });

    const wasApproved = booking.status === "approved";

    // Считаем места занятыми только пока бронь в статусе "одобрена"
    if (!wasApproved && status === "approved") {
      const seats = await adjustSeats(booking.tour, booking.peopleCount);
      if (!seats.available) {
        return res.status(409).json({ success: false, error: "Недостаточно свободных мест для одобрения брони" });
      }
    }
    if (wasApproved && status !== "approved") await adjustSeats(booking.tour, -booking.peopleCount);
    booking.status = status;

    let sms = { attempted: false };
    if (status === "approved" && !wasApproved && SMS_ON_APPROVE) {
      const firstWord = booking.name.split(" ")[0] || booking.name;
      const text = `TourCo: ${firstWord}, ваша бронь на тур "${booking.tour}" одобрена! Менеджер свяжется с вами.`;
      try {
        const result = await sendSms(booking.phone, text);
        console.log("[sms] Ответ провайдера (одобрение):", JSON.stringify(result));
        sms = { attempted: true, ok: true, raw: result.raw || null };
      } catch (smsErr) {
        console.error("[sms] Не удалось отправить SMS при одобрении:", smsErr.message);
        sms = { attempted: true, ok: false, error: smsErr.message };
      }
    }

    await booking.save();
    return res.json({ success: true, booking, sms });
  } catch (err) {
    console.error("[bookings] Ошибка обновления статуса:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

async function deleteBooking(req, res) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Бронь не найдена" });

    if (booking.status === "approved") {
      await adjustSeats(booking.tour, -booking.peopleCount); // освобождаем места назад
    }
    await booking.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ success: false, error: "Бронь не найдена" });
    console.error("[bookings] Ошибка удаления:", err);
    return res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
}

module.exports = { createBooking, verifyOtp, resendOtp, listBookings, updateBookingStatus, deleteBooking };
