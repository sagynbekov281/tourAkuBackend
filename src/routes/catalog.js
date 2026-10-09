const express = require("express");
const rateLimit = require("express-rate-limit");
const { tours, guides, seed } = require("../controllers/catalogController");
const { uploadGuidePhoto, uploadTourPhoto } = require("../controllers/uploadController");
const { login, requireAdmin } = require("../middleware/adminAuth");
const { TranslationError, translateToEnglish } = require("../services/translationService");

const publicRouter = express.Router();
publicRouter.get("/tours", tours.listPublic);
publicRouter.get("/guides", guides.listPublic);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: "Слишком много попыток входа. Подождите 15 минут." },
});

const translationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: "Слишком много запросов на перевод. Попробуйте через несколько минут." },
});

const adminRouter = express.Router();
adminRouter.post("/login", loginLimiter, login);
adminRouter.use(requireAdmin);

adminRouter.post("/uploads/guide-photo", uploadGuidePhoto);
adminRouter.post("/uploads/tour-photo", uploadTourPhoto);
adminRouter.post("/translate/english", translationLimiter, async (req, res) => {
  try {
    const translations = await translateToEnglish(req.body?.kind, req.body?.source);
    res.json({ success: true, translations });
  } catch (err) {
    if (!(err instanceof TranslationError)) console.error("[translation]", err);
    res.status(err.status || 500).json({ success: false, error: err.message || "Не удалось выполнить перевод" });
  }
});
adminRouter.get("/tours", tours.list);
adminRouter.post("/tours", tours.create);
adminRouter.put("/tours/:id", tours.update);
adminRouter.delete("/tours/:id", tours.remove);

adminRouter.get("/guides", guides.list);
adminRouter.post("/guides", guides.create);
adminRouter.put("/guides/:id", guides.update);
adminRouter.delete("/guides/:id", guides.remove);

adminRouter.post("/seed/:kind", seed);

module.exports = { publicRouter, adminRouter };
