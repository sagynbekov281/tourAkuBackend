const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

// Принимает массив русских строк, возвращает массив английских в том же порядке.
async function translateRuToEn(texts) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) {
    const err = new Error('DEEPL_API_KEY не задан');
    err.status = 503;
    throw err;
  }

  // пустые строки не отправляем (не тратим лимит), возвращаем их как есть
  const idx = [];
  const toSend = [];
  texts.forEach((t, i) => {
    if (typeof t === 'string' && t.trim()) { idx.push(i); toSend.push(t); }
  });
  const result = [...texts];
  if (toSend.length === 0) return result;

  const res = await fetch(DEEPL_URL, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: toSend, source_lang: 'RU', target_lang: 'EN-US' }),
  });

  if (!res.ok) {
    const err = new Error(`DeepL ${res.status}: ${await res.text()}`);
    err.status = res.status === 456 ? 429 : 502;
    throw err;
  }

  const data = await res.json();
  data.translations.forEach((t, k) => { result[idx[k]] = t.text; });
  return result;
}

module.exports = { translateRuToEn };