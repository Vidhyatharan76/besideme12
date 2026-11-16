import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  insertMachineTranslations,
  lookupCachedTranslations,
} from '../src/db/translationCache.ts';
import { translateBatch } from '../src/lib/translator.ts';
import { hashSourceText } from '../src/lib/hash.ts';
import { getLanguageInfo, isAllowedLanguageCode } from '../src/locales/languages.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractEnglishEntries(): Array<{ key: string; sourceText: string }> {
  const enPath = path.resolve(__dirname, '../src/locales/en.json');
  const raw = JSON.parse(fs.readFileSync(enPath, 'utf-8')) as Record<string, unknown>;
  const entries: Array<{ key: string; sourceText: string }> = [];

  function walk(node: unknown, prefix: string) {
    if (typeof node === 'string') {
      if (node.trim().length > 0) {
        entries.push({ key: prefix, sourceText: node });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, idx) => {
        if (typeof item === 'string' && item.trim().length > 0) {
          entries.push({ key: `${prefix}[${idx}]`, sourceText: item });
        }
      });
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === '_meta' || k === 'needsReview') continue;
        walk(v, prefix ? `${prefix}.${k}` : k);
      }
    }
  }

  walk(raw, '');
  return entries;
}

async function main() {
  const requestedLangs = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));

  if (requestedLangs.length === 0) {
    console.log('Usage: npm run preload -- <lang1> <lang2> ... (e.g., ar ur hi ta ja)');
    process.exit(0);
  }

  const invalid = requestedLangs.filter((code) => !isAllowedLanguageCode(code));
  if (invalid.length > 0) {
    console.error(`Unsupported language code(s): ${invalid.join(', ')}`);
    process.exit(1);
  }

  const entries = extractEnglishEntries();
  const hashed = await Promise.all(
    entries.map(async (e) => ({
      ...e,
      sourceHash: await hashSourceText(e.sourceText),
    })),
  );

  const uniqueByHash = new Map<string, string>();
  for (const item of hashed) {
    if (!uniqueByHash.has(item.sourceHash)) {
      uniqueByHash.set(item.sourceHash, item.sourceText);
    }
  }
  const allHashes = Array.from(uniqueByHash.keys());

  for (const targetLanguage of requestedLangs) {
    if (targetLanguage === 'en' || targetLanguage === 'es') {
      console.log(`[${targetLanguage}] Already human-reviewed in /src/locales/${targetLanguage}.json — skipping.`);
      continue;
    }

    const langInfo = getLanguageInfo(targetLanguage);
    const existing = await lookupCachedTranslations(targetLanguage, allHashes);
    const misses = allHashes
      .filter((h) => !existing[h])
      .map((h) => ({ id: h, text: uniqueByHash.get(h)! }));

    console.log(
      `[${targetLanguage}] ${langInfo.englishName}: ${Object.keys(existing).length} cached, ${misses.length} to translate.`,
    );

    for (let i = 0; i < misses.length; i += 40) {
      const batch = misses.slice(i, i + 40);
      const translatedMap = await translateBatch(targetLanguage, batch, 'en');

      const rows = batch
        .filter((b) => translatedMap[b.id])
        .map((b) => ({
          sourceHash: b.id,
          targetLanguage,
          translatedText: translatedMap[b.id],
        }));

      await insertMachineTranslations(rows);
      console.log(`[${targetLanguage}] Cached ${rows.length} machine translations.`);
    }
  }

  console.log('Preload complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Preload failed:', err);
  process.exit(1);
});
