require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const bookingsRouter = require("./routes/bookings");
const { publicRouter, adminRouter } = require("./routes/catalog");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

const productionClientOrigin = "https://tour-aku.vercel.app";
const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const allowedOrigins = [...new Set([productionClientOrigin, ...configuredOrigins])];
const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");
    let allowed = false;

    if (!origin) allowed = true;
    else if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) allowed = true;
    else if (localhostRegex.test(origin)) allowed = true;
    else {
      try { allowed = new URL(origin).host === req.header("Host"); } catch { allowed = false; }
    }

    callback(null, { origin: allowed });
  })
);

// Браузер всегда спрашивает сервер, не изменились ли данные (ETag вернёт 304, если нет)
app.use("/api", (req, res, next) => {
  if (req.method === "GET") res.set("Cache-Control", "no-cache");
  next();
});

app.get("/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use(express.static(path.join(__dirname, "../public")));
app.get("/admin.htm", (req, res) => res.redirect(301, "/admin.html"));

app.use("/api/bookings", bookingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api", publicRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] Запущен на порту ${PORT}`));
  })
  .catch((err) => {
    console.error("[server] Не удалось подключиться к базе данных:", err.message);
    process.exit(1);
  });