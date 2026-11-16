import { and, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { translationCache } from './schema.ts';

export interface CachedTranslationEntry {
  translatedText: string;
  status: 'machine' | 'reviewed';
}

export async function lookupCachedTranslations(
  targetLanguage: string,
  sourceHashes: string[],
): Promise<Record<string, CachedTranslationEntry>> {
  if (sourceHashes.length === 0) return {};

  try {
    const uniqueHashes = Array.from(new Set(sourceHashes));
    const rows = await db
      .select({
        sourceHash: translationCache.sourceHash,
        translatedText: translationCache.translatedText,
        status: translationCache.status,
      })
      .from(translationCache)
      .where(
        and(
          eq(translationCache.targetLanguage, targetLanguage),
          inArray(translationCache.sourceHash, uniqueHashes),
        ),
      );

    const out: Record<string, CachedTranslationEntry> = {};
    for (const row of rows) {
      out[row.sourceHash] = {
        translatedText: row.translatedText,
        status: row.status === 'reviewed' ? 'reviewed' : 'machine',
      };
    }
    return out;
  } catch (error) {
    console.error('Failed to query translation_cache:', error);
    return {};
  }
}

export async function insertMachineTranslations(
  rows: Array<{
    sourceHash: string;
    targetLanguage: string;
    translatedText: string;
  }>,
): Promise<void> {
  if (rows.length === 0) return;

  try {
    await db
      .insert(translationCache)
      .values(
        rows.map((r) => ({
          sourceHash: r.sourceHash,
          targetLanguage: r.targetLanguage,
          translatedText: r.translatedText,
          status: 'machine',
        })),
      )
      .onConflictDoNothing({
        target: [translationCache.sourceHash, translationCache.targetLanguage],
      });
  } catch (error) {
    console.error('Failed to insert machine translations into translation_cache:', error);
  }
}
