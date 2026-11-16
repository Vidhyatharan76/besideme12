import {
  SUPPORTED_LANGUAGES,
  getLanguageInfo,
  type LanguageDefinition,
} from './languages';

export interface LocaleMeta {
  code: string;
  nativeName: string;
  englishName: string;
  dir?: 'ltr' | 'rtl';
  status?: 'reviewed' | 'machine';
  needsReview: boolean;
}

export type LocaleDictionary = Record<string, unknown> & {
  _meta: LocaleMeta;
  needsReview?: boolean;
};

export interface AvailableLanguageOption extends LanguageDefinition {
  isReviewed: boolean;
}

export interface TranslatableEntry {
  key: string;
  sourceText: string;
}

const localeModules = import.meta.glob<{ default: LocaleDictionary }>('./*.json', {
  eager: true,
});

export const LOCALES: Record<string, LocaleDictionary> = {};

for (const [, mod] of Object.entries(localeModules)) {
  const dict = mod.default;
  if (!dict || !dict._meta?.code) continue;
  LOCALES[dict._meta.code] = dict;
}

export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_LOCAL_LANGUAGE = 'en';

export function isReviewedLocale(code: string): boolean {
  const dict = LOCALES[code];
  if (!dict) return false;
  if (dict._meta?.status === 'reviewed') return true;
  return dict._meta?.needsReview === false && dict.needsReview !== true;
}

const seenCodes = new Set<string>();
const mergedLanguages: AvailableLanguageOption[] = [];

for (const lang of SUPPORTED_LANGUAGES) {
  seenCodes.add(lang.code);
  mergedLanguages.push({
    ...lang,
    isReviewed: isReviewedLocale(lang.code),
  });
}

for (const [code, dict] of Object.entries(LOCALES)) {
  if (seenCodes.has(code)) continue;
  const info = getLanguageInfo(code);
  mergedLanguages.push({
    code,
    nativeName: dict._meta.nativeName || info.nativeName,
    englishName: dict._meta.englishName || info.englishName,
    dir: dict._meta.dir ?? info.dir,
    script: info.script,
    isReviewed: isReviewedLocale(code),
  });
}

mergedLanguages.sort((a, b) => {
  if (a.code === 'en') return -1;
  if (b.code === 'en') return 1;
  if (a.isReviewed !== b.isReviewed) return a.isReviewed ? -1 : 1;
  return a.englishName.localeCompare(b.englishName);
});

export const AVAILABLE_LANGUAGES: AvailableLanguageOption[] = mergedLanguages;

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function interpolateVars(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`,
  );
}

export function extractTranslatableEntries(): TranslatableEntry[] {
  const sourceDict = LOCALES[DEFAULT_LANGUAGE];
  if (!sourceDict) return [];

  const entries: TranslatableEntry[] = [];

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

  walk(sourceDict, '');
  return entries;
}

export function resolveTranslation(
  lang: string,
  key: string,
  vars?: Record<string, string | number>,
  dynamicOverrides?: Record<string, string>,
): string {
  if (isReviewedLocale(lang)) {
    const raw = getNestedValue(LOCALES[lang], key);
    if (typeof raw === 'string') {
      return interpolateVars(raw, vars);
    }
  }

  if (dynamicOverrides && typeof dynamicOverrides[key] === 'string' && dynamicOverrides[key].trim()) {
    return interpolateVars(dynamicOverrides[key], vars);
  }

  const staticFallback = getNestedValue(LOCALES[lang], key);
  if (typeof staticFallback === 'string') {
    return interpolateVars(staticFallback, vars);
  }

  const englishRaw = getNestedValue(LOCALES[DEFAULT_LANGUAGE], key);
  if (typeof englishRaw === 'string') {
    return interpolateVars(englishRaw, vars);
  }

  return key;
}

export function resolveTranslationArray(
  lang: string,
  key: string,
  dynamicOverrides?: Record<string, string>,
): string[] {
  if (isReviewedLocale(lang)) {
    const raw = getNestedValue(LOCALES[lang], key);
    if (Array.isArray(raw) && raw.every((item) => typeof item === 'string')) {
      return raw;
    }
  }

  const englishArr = getNestedValue(LOCALES[DEFAULT_LANGUAGE], key);
  if (Array.isArray(englishArr) && englishArr.every((item) => typeof item === 'string')) {
    if (dynamicOverrides) {
      return englishArr.map((fallbackItem, idx) => {
        const override = dynamicOverrides[`${key}[${idx}]`];
        return typeof override === 'string' && override.trim() ? override : fallbackItem;
      });
    }
    return englishArr;
  }

  return [];
}
