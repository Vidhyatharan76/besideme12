export type ScriptFamily =
  | 'latin'
  | 'arabic'
  | 'devanagari'
  | 'tamil'
  | 'bengali'
  | 'cjk-sc'
  | 'cjk-tc'
  | 'jp'
  | 'kr'
  | 'thai';

export interface LanguageDefinition {
  code: string;
  nativeName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
  script: ScriptFamily;
}

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr', script: 'latin' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', script: 'latin' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', script: 'arabic' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', dir: 'rtl', script: 'arabic' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', script: 'devanagari' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', dir: 'ltr', script: 'tamil' },
  { code: 'zh-Hans', nativeName: '简体中文', englishName: 'Chinese (Simplified)', dir: 'ltr', script: 'cjk-sc' },
  { code: 'zh-Hant', nativeName: '繁體中文', englishName: 'Chinese (Traditional)', dir: 'ltr', script: 'cjk-tc' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', dir: 'ltr', script: 'jp' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', dir: 'ltr', script: 'kr' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr', script: 'latin' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', dir: 'ltr', script: 'latin' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr', script: 'latin' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', dir: 'ltr', script: 'latin' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', dir: 'ltr', script: 'latin' },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian', dir: 'ltr', script: 'latin' },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish', dir: 'ltr', script: 'latin' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', dir: 'ltr', script: 'latin' },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', dir: 'ltr', script: 'latin' },
  { code: 'tl', nativeName: 'Tagalog', englishName: 'Tagalog', dir: 'ltr', script: 'latin' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', dir: 'ltr', script: 'bengali' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', dir: 'ltr', script: 'latin' },
  { code: 'fa', nativeName: 'فارسی', englishName: 'Persian (Farsi)', dir: 'rtl', script: 'arabic' },
  { code: 'ne', nativeName: 'नेपाली', englishName: 'Nepali', dir: 'ltr', script: 'devanagari' },
  { code: 'so', nativeName: 'Soomaali', englishName: 'Somali', dir: 'ltr', script: 'latin' },
  { code: 'sw', nativeName: 'Kiswahili', englishName: 'Swahili', dir: 'ltr', script: 'latin' },
  { code: 'ht', nativeName: 'Kreyòl Ayisyen', englishName: 'Haitian Creole', dir: 'ltr', script: 'latin' },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian', dir: 'ltr', script: 'latin' },
  { code: 'th', nativeName: 'ไทย', englishName: 'Thai', dir: 'ltr', script: 'thai' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', dir: 'ltr', script: 'latin' },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay', dir: 'ltr', script: 'latin' },
];

export const LANGUAGE_BY_CODE: Record<string, LanguageDefinition> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((lang) => [lang.code, lang]),
);

export function isAllowedLanguageCode(code: string): boolean {
  return Boolean(LANGUAGE_BY_CODE[code]);
}

export function getLanguageInfo(code: string): LanguageDefinition {
  return LANGUAGE_BY_CODE[code] ?? LANGUAGE_BY_CODE.en;
}

export function getLanguageDir(code: string): 'ltr' | 'rtl' {
  return getLanguageInfo(code).dir;
}

export function formatIntlDate(locale: string, date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
  }
}

export function selectIntlPlural(
  locale: string,
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
): string {
  try {
    const rule = new Intl.PluralRules(locale).select(count);
    return forms[rule] ?? forms.other;
  } catch {
    return count === 1 && forms.one ? forms.one : forms.other;
  }
}
