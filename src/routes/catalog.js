const express = require("express");
const rateLimit = require("express-rate-limit");
const { tours, guides, seed } = require("../controllers/catalogController");
const { login, requireAdmin } = require("../middleware/adminAuth");

const publicRouter = express.Router();
publicRouter.get("/tours", tours.listPublic);
publicRouter.get("/guides", guides.listPublic);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: "Слишком много попыток входа. Подождите 15 минут." },
});

const adminRouter = express.Router();
adminRouter.post("/login", loginLimiter, login);
adminRouter.use(requireAdmin);

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
