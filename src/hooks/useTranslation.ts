import { useEffect, useMemo, useState } from 'react';
import { hashSourceText } from '../lib/hash';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  insertTranslationCacheSupabase,
  lookupTranslationCacheSupabase,
} from '../lib/supabasePrep';
import { translateBatch } from '../lib/translator';
import {
  extractTranslatableEntries,
  isReviewedLocale,
  type TranslatableEntry,
} from '../locales';
import { isAllowedLanguageCode } from '../locales/languages';

const CACHE_STORAGE_KEY = 'besideMe_translationCache_v1';

interface CachedEntry {
  translatedText: string;
  status: 'machine' | 'reviewed';
}

type CacheStore = Record<string, Record<string, CachedEntry>>;

let memoryFallbackCache: CacheStore = {};

function readLocalTranslationCache(): CacheStore {
  try {
    if (typeof window === 'undefined') return memoryFallbackCache;
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return memoryFallbackCache;
    const parsed = JSON.parse(raw) as CacheStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return memoryFallbackCache;
  }
}

function writeLocalTranslationCache(next: CacheStore): void {
  memoryFallbackCache = next;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
  }
}

export interface LanguageTranslationState {
  overrides: Record<string, string>;
  isMachineTranslated: boolean;
  isTranslating: boolean;
  hasFallbackError: boolean;
}

const SOURCE_ENTRIES: TranslatableEntry[] = extractTranslatableEntries();
let cachedHashesPromise: Promise<Array<{ key: string; sourceText: string; sourceHash: string }>> | null =
  null;

function getHashedSourceEntries() {
  if (!cachedHashesPromise) {
    cachedHashesPromise = Promise.all(
      SOURCE_ENTRIES.map(async (entry) => ({
        ...entry,
        sourceHash: await hashSourceText(entry.sourceText),
      })),
    );
  }
  return cachedHashesPromise;
}

export function useLanguageTranslations(targetLanguage: string): LanguageTranslationState {
  const isReviewed = isReviewedLocale(targetLanguage);
  const isSupported = isAllowedLanguageCode(targetLanguage);

  const [state, setState] = useState<LanguageTranslationState>({
    overrides: {},
    isMachineTranslated: !isReviewed,
    isTranslating: false,
    hasFallbackError: false,
  });

  useEffect(() => {
    let cancelled = false;

    if (isReviewed || !isSupported) {
      setState({
        overrides: {},
        isMachineTranslated: false,
        isTranslating: false,
        hasFallbackError: false,
      });
      return;
    }

    async function resolveAll() {
      const hashedEntries = await getHashedSourceEntries();
      if (cancelled) return;

      const store = readLocalTranslationCache();
      const langCache: Record<string, CachedEntry> = { ...(store[targetLanguage] ?? {}) };

      const buildResult = (
        entriesMap: Record<string, CachedEntry>,
        translating: boolean,
        fallbackErr: boolean,
      ): LanguageTranslationState => {
        const overrides: Record<string, string> = {};
        let allReviewed = hashedEntries.length > 0;
        let hitCount = 0;

        for (const item of hashedEntries) {
          const cached = entriesMap[item.sourceHash];
          if (cached?.translatedText) {
            overrides[item.key] = cached.translatedText;
            hitCount++;
            if (cached.status !== 'reviewed') {
              allReviewed = false;
            }
          } else {
            allReviewed = false;
          }
        }

        return {
          overrides,
          isMachineTranslated: hitCount > 0 ? !allReviewed : true,
          isTranslating: translating,
          hasFallbackError: fallbackErr,
        };
      };

      const missesAfterLocal = hashedEntries.filter((e) => !langCache[e.sourceHash]);
      if (missesAfterLocal.length === 0) {
        setState(buildResult(langCache, false, false));
        return;
      }

      setState(buildResult(langCache, true, false));

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setState(buildResult(langCache, false, true));
        return;
      }

      try {
        const missingHashes = Array.from(new Set(missesAfterLocal.map((m) => m.sourceHash)));
        for (let i = 0; i < missingHashes.length; i += 150) {
          const chunk = missingHashes.slice(i, i + 150);
          if (isSupabaseConfigured) {
            const dbHits = await lookupTranslationCacheSupabase(targetLanguage, chunk);
            Object.assign(langCache, dbHits);
          } else {
            const url = `/api/translation-cache?targetLanguage=${encodeURIComponent(
              targetLanguage,
            )}&hashes=${encodeURIComponent(chunk.join(','))}`;
            const res = await fetch(url);
            if (res.ok) {
              const data = (await res.json()) as {
                translations?: Record<string, CachedEntry>;
              };
              if (data.translations) {
                Object.assign(langCache, data.translations);
              }
            }
          }
        }
      } catch {
      }

      if (cancelled) return;

      writeLocalTranslationCache({ ...readLocalTranslationCache(), [targetLanguage]: langCache });

      const uniqueMissMap = new Map<string, { sourceHash: string; text: string }>();
      for (const entry of hashedEntries) {
        if (!langCache[entry.sourceHash] && !uniqueMissMap.has(entry.sourceHash)) {
          uniqueMissMap.set(entry.sourceHash, {
            sourceHash: entry.sourceHash,
            text: entry.sourceText,
          });
        }
      }

      const missesAfterDb = Array.from(uniqueMissMap.values());
      if (missesAfterDb.length === 0) {
        setState(buildResult(langCache, false, false));
        return;
      }

      setState(buildResult(langCache, true, false));

      const batches: Array<Array<{ sourceHash: string; text: string }>> = [];
      for (let i = 0; i < missesAfterDb.length; i += 24) {
        batches.push(missesAfterDb.slice(i, i + 24));
      }

      let cursor = 0;
      let hadFailure = false;
      const toCacheInDb: Array<{ sourceHash: string; translatedText: string }> = [];

      const runWorker = async () => {
        while (cursor < batches.length) {
          if (cancelled) return;
          const idx = cursor++;
          const batch = batches[idx];
          try {
            const translatedMap = await translateBatch(
              targetLanguage,
              batch.map((b) => ({ id: b.sourceHash, text: b.text })),
              'en',
            );

            let addedAny = false;
            for (const item of batch) {
              const translatedText = translatedMap[item.sourceHash];
              if (translatedText) {
                langCache[item.sourceHash] = {
                  translatedText,
                  status: 'machine',
                };
                toCacheInDb.push({
                  sourceHash: item.sourceHash,
                  translatedText,
                });
                addedAny = true;
              }
            }

            if (!addedAny) {
              hadFailure = true;
            } else {
              writeLocalTranslationCache({
                ...readLocalTranslationCache(),
                [targetLanguage]: langCache,
              });
              if (!cancelled) {
                setState(buildResult(langCache, true, false));
              }
            }
          } catch {
            hadFailure = true;
          }
        }
      };

      const workerCount = Math.min(3, batches.length);
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

      if (toCacheInDb.length > 0 && isSupabaseConfigured) {
        void insertTranslationCacheSupabase(targetLanguage, toCacheInDb);
      }

      if (!cancelled) {
        const stillMissing = hashedEntries.some((e) => !langCache[e.sourceHash]);
        setState(buildResult(langCache, false, hadFailure && stillMissing));
      }
    }

    void resolveAll();

    return () => {
      cancelled = true;
    };
  }, [targetLanguage, isReviewed, isSupported]);

  return useMemo(() => state, [state]);
}
