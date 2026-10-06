const mongoose = require("mongoose");

const tourSchema = new mongoose.Schema(
  {
    // ---- Переводимые поля: RU (основные) + EN (необязательные, с откатом на RU) ----
    title: { type: String, required: true, trim: true, maxlength: 120 },
    titleEn: { type: String, trim: true, maxlength: 120, default: "" },
    destination: { type: String, trim: true, maxlength: 120, default: "" },
    destinationEn: { type: String, trim: true, maxlength: 120, default: "" },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    descriptionEn: { type: String, trim: true, maxlength: 1000, default: "" },
    about: { type: String, trim: true, maxlength: 3000, default: "" },
    aboutEn: { type: String, trim: true, maxlength: 3000, default: "" },
    groupSize: { type: String, trim: true, maxlength: 60, default: "" },
    groupSizeEn: { type: String, trim: true, maxlength: 60, default: "" },
    highlights: { type: [String], default: [] },
    highlightsEn: { type: [String], default: [] },
    itinerary: { type: [String], default: [] },
    itineraryEn: { type: [String], default: [] },
    included: { type: [String], default: [] },
    includedEn: { type: [String], default: [] },

    // ---- Остальное — одно на оба языка ----
    duration: { type: String, trim: true, maxlength: 60, default: "" },
    difficultyKey: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
    iconKey: { type: String, default: "mountain" },
    price: { type: Number, required: true, min: 0, default: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    discountEndsAt: { type: Date, default: null },
    totalSeats: { type: Number, min: 0, default: 0 }, // 0 = мест не ограничено / не отслеживаем
    bookedSeats: { type: Number, min: 0, default: 0 }, // сколько уже занято одобренными бронями
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tour", tourSchema);
