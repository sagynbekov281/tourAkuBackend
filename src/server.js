require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const bookingsRouter = require("./routes/bookings");
const { publicRouter, adminRouter } = require("./routes/catalog");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CLIENT_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
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

app.get("/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use(express.static(path.join(__dirname, "../public")));

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
