const fetch = require("node-fetch");

class TranslationError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

// Only fields that the public site displays in both languages are sent to the
// translation provider. Keeping this allowlist on the server prevents clients
// from using this authenticated endpoint as a general-purpose proxy.
// Четвёртый элемент: как разбирать значение — "text" целиком, "lines" по строкам, "list" по запятым.
const TRANSLATABLE_FIELDS = {
  courses: [
    ["title", "titleEn", 120, "text"],
    ["destination", "destinationEn", 120, "text"],
    ["description", "descriptionEn", 1000, "text"],
    ["about", "aboutEn", 3000, "text"],
    ["groupSize", "groupSizeEn", 60, "text"],
    ["itinerary", "itineraryEn", 8000, "lines"],
    ["included", "includedEn", 8000, "list"],
    ["highlights", "highlightsEn", 8000, "list"],
  ],
  teachers: [
    ["role", "roleEn", 120, "text"],
    ["experience", "experienceEn", 120, "text"],
    ["languages", "languagesEn", 8000, "list"],
    ["regions", "regionsEn", 8000, "list"],
    ["bio", "bioEn", 2000, "text"],
    ["about", "aboutEn", 5000, "text"],
  ],
};

const DEEPL_CHUNK = 50; // DeepL принимает не больше 50 текстов за один запрос

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function deeplUrl(key) {
  if (process.env.DEEPL_API_URL) return process.env.DEEPL_API_URL;
  // бесплатные ключи заканчиваются на ":fx" и работают через api-free
  return key.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

async function callDeepL(texts, apiKey) {
  const out = [];
  for (let i = 0; i < texts.length; i += DEEPL_CHUNK) {
    const part = texts.slice(i, i + DEEPL_CHUNK);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let result;
    try {
      result = await fetch(deeplUrl(apiKey), {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({ text: part, source_lang: "RU", target_lang: "EN-US" }),
      });
    } catch (error) {
      if (error.name === "AbortError") throw new TranslationError("Сервис перевода не ответил вовремя. Попробуйте ещё раз.", 504);
      throw new TranslationError("Не удалось связаться с сервисом перевода", 502);
    } finally {
      clearTimeout(timeout);
    }

    if (!result.ok) {
      const details = await result.text().catch(() => "");
      console.error("[translation] DeepL error", result.status, details.slice(0, 300));
      if (result.status === 456) throw new TranslationError("Лимит бесплатного перевода DeepL на этот месяц исчерпан.", 429);
      if (result.status === 403) throw new TranslationError("Неверный ключ DeepL. Проверьте DEEPL_API_KEY.", 502);
      if (result.status === 429) throw new TranslationError("Слишком много запросов к DeepL. Подождите минуту.", 429);
      throw new TranslationError("Сервис перевода временно недоступен. Попробуйте ещё раз.", 502);
    }

    let data;
    try { data = await result.json(); } catch {
      console.error("[translation] invalid provider response");
      throw new TranslationError("Сервис перевода вернул некорректный ответ. Попробуйте ещё раз.", 502);
    }
    const translations = data.translations || [];
    if (translations.length !== part.length) {
      console.error("[translation] unexpected number of translations");
      throw new TranslationError("Сервис перевода вернул некорректный ответ. Попробуйте ещё раз.", 502);
    }
    translations.forEach((t) => out.push(t.text));
  }
  return out;
}

async function translateToEnglish(kind, submittedSource) {
  const fields = TRANSLATABLE_FIELDS[kind];
  if (!fields) throw new TranslationError("Неизвестный раздел для перевода", 400);

  const source = {};
  for (const [ruKey, , max] of fields) source[ruKey] = clean(submittedSource?.[ruKey], max);

  if (!Object.values(source).some(Boolean)) {
    throw new TranslationError("Сначала заполните хотя бы одно поле на русском", 400);
  }
  if (JSON.stringify(source).length > 18000) {
    throw new TranslationError("Текст для перевода слишком длинный", 400);
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new TranslationError("Автоперевод не настроен: добавьте DEEPL_API_KEY в настройки сервера", 503);
  }

  // Разбиваем поля на отдельные фразы, чтобы строки и списки не склеивались
  const segments = [];
  const plan = [];
  for (const [ruKey, enKey, , mode] of fields) {
    const raw = source[ruKey];
    if (!raw) continue;
    const parts = mode === "text"
      ? [raw]
      : raw.split(mode === "lines" ? /\r?\n/ : /[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) continue;
    plan.push({ enKey, mode, start: segments.length, count: parts.length });
    segments.push(...parts);
  }

  const translated = await callDeepL(segments, apiKey);

  const translations = {};
  for (const [, enKey, max] of fields) translations[enKey] = "";
  for (const { enKey, mode, start, count } of plan) {
    const slice = translated.slice(start, start + count);
    const joined = mode === "lines" ? slice.join("\n") : mode === "list" ? slice.join(", ") : slice[0];
    translations[enKey] = clean(joined, fields.find((f) => f[1] === enKey)[2]);
  }
  return translations;
}

module.exports = { TranslationError, translateToEnglish };