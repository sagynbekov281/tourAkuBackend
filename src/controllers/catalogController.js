const Tour = require("../models/Tour");
const Guide = require("../models/Guide");
const { TOURS, GUIDES } = require("../seed/defaults");

const DIFFICULTIES = ["easy", "medium", "hard"];
const DIFFICULTY_LABELS = {
  ru: { easy: "Лёгкий", medium: "Средний", hard: "Сложный" },
  en: { easy: "Easy", medium: "Medium", hard: "Hard" },
};

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const num = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const list = (v) =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[\n,]/))
    .map((s) => String(s).trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 40);
const bool = (v) => v !== false && v !== "false";

// Возвращает EN-значение, если оно непустое, иначе откатывается на RU (fallback)
const pick = (ruVal, enVal, lang) => (lang === "en" && enVal && (Array.isArray(enVal) ? enVal.length : String(enVal).trim())) ? enVal : ruVal;
const getLang = (req) => (req.query.lang === "en" ? "en" : "ru");

function parseEndDate(v) {
  if (!v) return null;
  const d = new Date(`${String(v).slice(0, 10)}T23:59:59`);
  return isNaN(d.getTime()) ? null : d;
}

function discountInfo(t) {
  const pct = Math.min(100, Math.max(0, t.discountPercent || 0));
  const active = pct > 0 && (!t.discountEndsAt || new Date(t.discountEndsAt) > new Date());
  return { active, pct, finalPrice: active ? Math.round(t.price * (1 - pct / 100)) : t.price };
}

// ---- Туры ----
function tourFromBody(b) {
  return {
    title: str(b.title, 120),
    titleEn: str(b.titleEn, 120),
    photo: str(b.photo, 500000),
    destination: str(b.destination, 120),
    destinationEn: str(b.destinationEn, 120),
    description: str(b.description, 1000),
    descriptionEn: str(b.descriptionEn, 1000),
    about: str(b.about, 3000),
    aboutEn: str(b.aboutEn, 3000),
    groupSize: str(b.groupSize, 60),
    groupSizeEn: str(b.groupSizeEn, 60),
    highlights: list(b.highlights),
    highlightsEn: list(b.highlightsEn),
    itinerary: list(b.itinerary),
    itineraryEn: list(b.itineraryEn),
    included: list(b.included),
    includedEn: list(b.includedEn),
    duration: str(b.duration, 60),
    difficultyKey: DIFFICULTIES.includes(b.difficultyKey) ? b.difficultyKey : "easy",
    iconKey: str(b.iconKey, 30) || "mountain",
    price: Math.max(0, num(b.price)),
    discountPercent: Math.min(100, Math.max(0, num(b.discountPercent))),
    discountEndsAt: parseEndDate(b.discountEndsAt),
    totalSeats: Math.max(0, num(b.totalSeats)),
    rating: Math.min(5, Math.max(0, num(b.rating))),
    reviewsCount: Math.max(0, num(b.reviewsCount)),
    order: num(b.order),
    active: bool(b.active),
  };
}

const seatsLeft = (t) => (t.totalSeats > 0 ? Math.max(0, t.totalSeats - (t.bookedSeats || 0)) : null);

const tourAdmin = (t) => ({ ...t.toObject(), finalPrice: discountInfo(t).finalPrice, discountActive: discountInfo(t).active, seatsLeft: seatsLeft(t) });

function tourPublic(t, lang) {
  const d = discountInfo(t);
  return {
    id: String(t._id),
    title: pick(t.title, t.titleEn, lang),
    photo: t.photo || "",
    destination: pick(t.destination, t.destinationEn, lang),
    description: pick(t.description, t.descriptionEn, lang),
    about: pick(t.about, t.aboutEn, lang),
    duration: t.duration,
    difficultyKey: t.difficultyKey,
    difficulty: DIFFICULTY_LABELS[lang][t.difficultyKey] || "",
    iconKey: t.iconKey,
    highlights: pick(t.highlights, t.highlightsEn, lang),
    itinerary: pick(t.itinerary, t.itineraryEn, lang),
    included: pick(t.included, t.includedEn, lang),
    groupSize: pick(t.groupSize, t.groupSizeEn, lang),
    totalSeats: t.totalSeats,
    seatsLeft: seatsLeft(t),
    rating: t.rating,
    reviewsCount: t.reviewsCount,
    price: t.price,
    finalPrice: d.finalPrice,
    discountPercent: d.active ? d.pct : 0,
  };
}

// ---- Команда ----
const guideFromBody = (b) => ({
  name: str(b.name, 120),
  role: str(b.role, 120),
  roleEn: str(b.roleEn, 120),
  experience: str(b.experience, 120),
  experienceEn: str(b.experienceEn, 120),
  photo: str(b.photo, 500000),
  languages: list(b.languages),
  languagesEn: list(b.languagesEn),
  regions: list(b.regions),
  regionsEn: list(b.regionsEn),
  bio: str(b.bio, 2000),
  bioEn: str(b.bioEn, 2000),
  about: str(b.about, 5000),
  aboutEn: str(b.aboutEn, 5000),
  order: num(b.order),
  active: bool(b.active),
});

const initials = (name) => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const guideAdmin = (g) => g.toObject();
const guidePublic = (g, lang) => ({
  id: String(g._id),
  name: g.name,
  role: pick(g.role, g.roleEn, lang),
  experience: pick(g.experience, g.experienceEn, lang),
  languages: pick(g.languages, g.languagesEn, lang),
  regions: pick(g.regions, g.regionsEn, lang),
  bio: pick(g.bio, g.bioEn, lang),
  about: pick(g.about, g.aboutEn, lang),
  photo: g.photo || "",
  initials: initials(g.name),
});

// ---- Общий CRUD ----
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ success: false, error: "Не найдено" });
    console.error("[catalog]", err);
    res.status(500).json({ success: false, error: "Внутренняя ошибка сервера" });
  }
};

function makeCrud({ Model, plural, single, fromBody, required, missingMsg, toAdmin, toPublic }) {
  const sort = { order: 1, createdAt: 1 };
  const validate = (data, res) => {
    if (!data[required]) {
      res.status(400).json({ success: false, error: missingMsg });
      return false;
    }
    return true;
  };
  return {
    listPublic: wrap(async (req, res) => {
      const lang = getLang(req);
      const items = await Model.find({ active: true }).sort(sort);
      res.json({ success: true, [plural]: items.map((i) => toPublic(i, lang)) });
    }),
    list: wrap(async (req, res) => {
      const items = await Model.find().sort(sort);
      res.json({ success: true, [plural]: items.map(toAdmin) });
    }),
    create: wrap(async (req, res) => {
      const data = fromBody(req.body || {});
      if (!validate(data, res)) return;
      const item = await Model.create(data);
      res.status(201).json({ success: true, [single]: toAdmin(item) });
    }),
    update: wrap(async (req, res) => {
      const data = fromBody(req.body || {});
      if (!validate(data, res)) return;
      const item = await Model.findByIdAndUpdate(req.params.id, data, { new: true });
      if (!item) return res.status(404).json({ success: false, error: "Не найдено" });
      res.json({ success: true, [single]: toAdmin(item) });
    }),
    remove: wrap(async (req, res) => {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ success: false, error: "Не найдено" });
      res.json({ success: true });
    }),
  };
}

const tours = makeCrud({
  Model: Tour, plural: "tours", single: "tour", fromBody: tourFromBody,
  required: "title", missingMsg: "Укажите название тура", toAdmin: tourAdmin, toPublic: tourPublic,
});
const guides = makeCrud({
  Model: Guide, plural: "guides", single: "guide", fromBody: guideFromBody,
  required: "name", missingMsg: "Укажите имя гида", toAdmin: guideAdmin, toPublic: guidePublic,
});

const seed = wrap(async (req, res) => {
  const map = { tours: [Tour, TOURS], guides: [Guide, GUIDES] };
  const target = map[req.params.kind];
  if (!target) return res.status(400).json({ success: false, error: "Неизвестный раздел" });
  const [Model, docs] = target;
  if ((await Model.countDocuments()) > 0) {
    return res.status(400).json({ success: false, error: "Список не пустой — примеры не загружены" });
  }
  await Model.insertMany(docs.map((d, i) => ({ ...d, order: i })));
  res.json({ success: true });
});

module.exports = { tours, guides, seed };
