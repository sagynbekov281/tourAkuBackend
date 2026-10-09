const mongoose = require("mongoose");

const guideSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 }, // имя — одно на оба языка
    role: { type: String, trim: true, maxlength: 120, default: "" },
    roleEn: { type: String, trim: true, maxlength: 120, default: "" },
    experience: { type: String, trim: true, maxlength: 120, default: "" },
    experienceEn: { type: String, trim: true, maxlength: 120, default: "" },
    photo: { type: String, trim: true, maxlength: 500000, default: "" },
    languages: { type: [String], default: [] },
    languagesEn: { type: [String], default: [] },
    regions: { type: [String], default: [] },
    regionsEn: { type: [String], default: [] },
    bio: { type: String, trim: true, maxlength: 2000, default: "" },
    bioEn: { type: String, trim: true, maxlength: 2000, default: "" },
    about: { type: String, trim: true, maxlength: 5000, default: "" },
    aboutEn: { type: String, trim: true, maxlength: 5000, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Guide", guideSchema);
