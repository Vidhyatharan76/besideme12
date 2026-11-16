const GOOGLE_GTX_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';

const BATCH_DELIMITER = '\n\n[998877]\n\n';
const DELIMITER_REGEX = /\s*\[998877\]\s*/;

function toGoogleLangCode(code: string): string {
  switch (code) {
    case 'zh-Hans':
      return 'zh-CN';
    case 'zh-Hant':
      return 'zh-TW';
    case 'tl':
      return 'fil';
    default:
      return code;
  }
}

function toMyMemoryLangCode(code: string): string {
  switch (code) {
    case 'zh-Hans':
      return 'zh-CN';
    case 'zh-Hant':
      return 'zh-TW';
    default:
      return code;
  }
}

function protectTokens(text: string): {
  masked: string;
  restore: (translated: string) => string;
} {
  const tokens: string[] = [];
  let masked = text.replace(/\{\{\w+\}\}/g, (match) => {
    const idx = tokens.length;
    tokens.push(match);
    return `[910${idx}]`;
  });

  masked = masked.replace(/\bBeside Me\b/g, () => {
    const idx = tokens.length;
    tokens.push('Beside Me');
    return `[910${idx}]`;
  });

  return {
    masked,
    restore: (translated: string) => {
      let out = translated;
      tokens.forEach((original, idx) => {
        const pattern = new RegExp(`\\[\\s*910${idx}\\s*\\]`, 'g');
        out = out.replace(pattern, original);
      });
      return out.trim();
    },
  };
}

async function callGoogleGtx(
  text: string,
  targetLang: string,
  sourceLang = 'en',
): Promise<string | null> {
  const sl = toGoogleLangCode(sourceLang);
  const tl = toGoogleLangCode(targetLang);
  if (sl === tl) return text;

  const params = new URLSearchParams({
    client: 'gtx',
    sl,
    tl,
    dt: 't',
    q: text,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${GOOGLE_GTX_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;

    const translated = (data[0] as unknown[])
      .map((segment) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
      .join('');

    return translated.trim() ? translated : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callMyMemory(
  text: string,
  targetLang: string,
  sourceLang = 'en',
): Promise<string | null> {
  const sl = toMyMemoryLangCode(sourceLang);
  const tl = toMyMemoryLangCode(targetLang);
  if (sl === tl) return text;

  const params = new URLSearchParams({
    q: text.slice(0, 480),
    langpair: `${sl}|${tl}`,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${MYMEMORY_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };
    const txt = data?.responseData?.translatedText?.trim();
    if (!txt || data?.responseStatus === 429) return null;
    return txt;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function translateText(
  text: string,
  targetLanguageCode: string,
  sourceLanguageCode = 'en',
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (targetLanguageCode === sourceLanguageCode) return trimmed;

  const { masked, restore } = protectTokens(trimmed);

  const primary = await callGoogleGtx(masked, targetLanguageCode, sourceLanguageCode);
  if (primary) {
    return restore(primary);
  }

  const fallback = await callMyMemory(masked, targetLanguageCode, sourceLanguageCode);
  if (fallback) {
    return restore(fallback);
  }

  throw new Error('Translation service unavailable right now.');
}

export async function translateBatch(
  targetLanguageCode: string,
  items: Array<{ id: string; text: string }>,
  sourceLanguageCode = 'en',
): Promise<Record<string, string>> {
  if (items.length === 0) return {};

  const out: Record<string, string> = {};
  if (targetLanguageCode === sourceLanguageCode) {
    for (const item of items) {
      out[item.id] = item.text;
    }
    return out;
  }

  const subBatches: Array<Array<{ id: string; text: string }>> = [];
  let current: Array<{ id: string; text: string }> = [];
  let currentLen = 0;

  for (const item of items) {
    if (current.length >= 12 || (current.length > 0 && currentLen + item.text.length > 1000)) {
      subBatches.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(item);
    currentLen += item.text.length + 15;
  }
  if (current.length > 0) {
    subBatches.push(current);
  }

  for (const group of subBatches) {
    const protectedItems = group.map((item) => ({
      id: item.id,
      raw: item.text,
      ...protectTokens(item.text),
    }));

    const joined = protectedItems.map((p) => p.masked).join(BATCH_DELIMITER);
    const batchRaw = await callGoogleGtx(joined, targetLanguageCode, sourceLanguageCode);

    if (batchRaw) {
      const parts = batchRaw.split(DELIMITER_REGEX);
      if (parts.length === protectedItems.length) {
        let allValid = true;
        for (let i = 0; i < protectedItems.length; i++) {
          const restored = protectedItems[i].restore(parts[i] ?? '');
          if (!restored) {
            allValid = false;
            break;
          }
          out[protectedItems[i].id] = restored;
        }
        if (allValid) continue;
      }
    }

    await Promise.all(
      group.map(async (item) => {
        try {
          const translated = await translateText(
            item.text,
            targetLanguageCode,
            sourceLanguageCode,
          );
          if (translated) {
            out[item.id] = translated;
          }
        } catch {
        }
      }),
    );
  }

  return out;
}
