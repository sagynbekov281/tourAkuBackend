# TourCo — Backend

Backend для сайта тур-агентства. Сделан по той же схеме, что и backend IhsanAcademy: Node.js + Express + MongoDB, SMS-подтверждение номера, письмо менеджеру, админка с CRUD для туров, гидов и броней.

## Что внутри

- `POST /api/bookings` — приём брони (имя, телефон, тур, число человек, сообщение)
- OTP-подтверждение номера по SMS (выключаемое, `REQUIRE_OTP` в `.env`)
- Email-уведомление менеджеру при новой брони (Resend, бесплатно)
- `GET /api/tours`, `GET /api/guides` — публичные списки для сайта
- Админка на `/admin.html`: вход по паролю, вкладки «Брони», «Туры», «Гиды» — добавление, редактирование, удаление, скидки на туры со сроком действия
- SMS клиенту при нажатии «Одобрить» (выключаемое, `SMS_ON_APPROVE`) + кнопка открыть WhatsApp с готовым текстом

Это тот же функционал, что мы делали для IhsanAcademy — все инструкции по первому запуску (MongoDB Atlas, деплой на Render, подключение SMS-провайдера Nikita/SMSC, подключение Resend) точно такие же, просто:
- база отдельная, не путай со старой (`tour_agency`, а не `ihsan_academy`)
- сущности называются иначе: туры вместо курсов, гиды вместо учителей, брони вместо заявок

## Быстрый старт

```bash
cd tour-agency-backend
npm install
cp .env.example .env
```

Открой `.env`, впиши свой `MONGODB_URI` (отдельная база для этого проекта) и придумай `ADMIN_PASSWORD`. Остальное можно оставить как есть для начала (`SMS_PROVIDER=console`, `REQUIRE_OTP=false`).

```bash
npm run dev
```

Проверка: `http://localhost:5000/health` → `{"ok":true,...}`.

Админка: `http://localhost:5000/admin.html` → вход по `ADMIN_PASSWORD` → вкладка «Туры» → «Загрузить примеры» (появится 6 туров по Кыргызстану), то же на вкладке «Гиды». Адрес `/admin.htm` также перенаправляется на `/admin.html`.

## Подключение фронтенда

В `.env` фронтенда (`tour-agency-frontend`):
```
VITE_API_URL=http://localhost:5000
```

После деплоя backend на Render — впиши его адрес в `VITE_API_URL` в настройках проекта Vercel (**Settings → Environment Variables**), затем создай новый deployment. Завершающий `/` допустим: frontend удаляет его перед добавлением API-пути. В Render задай `CLIENT_ORIGIN=https://tour-aku.vercel.app` (можно также добавить локальный origin через запятую); backend нормализует завершающие `/`. Этот production-origin также разрешён в коде по умолчанию.

## Структура

```
tour-agency-backend/
├── src/
│   ├── server.js
│   ├── config/db.js
│   ├── models/{Tour,Guide,Booking}.js
│   ├── controllers/{catalogController,bookingController}.js
│   ├── routes/{catalog,bookings}.js
│   ├── services/{smsService,emailService}.js
│   ├── middleware/{adminAuth,validate,errorHandler}.js
│   └── seed/defaults.js
└── public/admin.html
```
