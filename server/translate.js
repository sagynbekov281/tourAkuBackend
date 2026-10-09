const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

export async function translateToEn(fields) {
  const keys = Object.keys(fields).filter((k) => fields[k]); // только непустые
  if (keys.length === 0) return {};

  const res = await fetch(DEEPL_URL, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: keys.map((k) => fields[k]),
      source_lang: 'RU',
      target_lang: 'EN-US',
    }),
  });

  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const out = {};
  keys.forEach((k, i) => (out[k] = data.translations[i].text));
  return out;
}