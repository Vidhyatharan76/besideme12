import { getLanguageInfo, type ScriptFamily } from '../locales/languages';

const SCRIPT_FONT_CONFIG: Record<
  ScriptFamily,
  { familyParam: string; cssFamily: string }
> = {
  latin: {
    familyParam: 'Noto+Sans:wght@400;500;600;700',
    cssFamily: "'Noto Sans', 'Plus Jakarta Sans', system-ui, sans-serif",
  },
  arabic: {
    familyParam: 'Noto+Sans+Arabic:wght@400;500;600;700',
    cssFamily: "'Noto Sans Arabic', 'Noto Sans', system-ui, sans-serif",
  },
  devanagari: {
    familyParam: 'Noto+Sans+Devanagari:wght@400;500;600;700',
    cssFamily: "'Noto Sans Devanagari', 'Noto Sans', system-ui, sans-serif",
  },
  tamil: {
    familyParam: 'Noto+Sans+Tamil:wght@400;500;600;700',
    cssFamily: "'Noto Sans Tamil', 'Noto Sans', system-ui, sans-serif",
  },
  bengali: {
    familyParam: 'Noto+Sans+Bengali:wght@400;500;600;700',
    cssFamily: "'Noto Sans Bengali', 'Noto Sans', system-ui, sans-serif",
  },
  'cjk-sc': {
    familyParam: 'Noto+Sans+SC:wght@400;500;600;700',
    cssFamily: "'Noto Sans SC', 'Noto Sans', system-ui, sans-serif",
  },
  'cjk-tc': {
    familyParam: 'Noto+Sans+TC:wght@400;500;600;700',
    cssFamily: "'Noto Sans TC', 'Noto Sans', system-ui, sans-serif",
  },
  jp: {
    familyParam: 'Noto+Sans+JP:wght@400;500;600;700',
    cssFamily: "'Noto Sans JP', 'Noto Sans', system-ui, sans-serif",
  },
  kr: {
    familyParam: 'Noto+Sans+KR:wght@400;500;600;700',
    cssFamily: "'Noto Sans KR', 'Noto Sans', system-ui, sans-serif",
  },
  thai: {
    familyParam: 'Noto+Sans+Thai:wght@400;500;600;700',
    cssFamily: "'Noto Sans Thai', 'Noto Sans', system-ui, sans-serif",
  },
};

const loadedScripts = new Set<ScriptFamily>();

export function ensureScriptFontLoaded(langCode: string): string {
  const { script } = getLanguageInfo(langCode);
  const cfg = SCRIPT_FONT_CONFIG[script] ?? SCRIPT_FONT_CONFIG.latin;

  if (typeof document !== 'undefined') {
    const scriptsToLoad: ScriptFamily[] =
      script === 'latin' ? ['latin'] : ['latin', script];

    for (const s of scriptsToLoad) {
      if (loadedScripts.has(s)) continue;
      const id = `noto-font-${s}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${SCRIPT_FONT_CONFIG[s].familyParam}&display=swap`;
        document.head.appendChild(link);
      }
      loadedScripts.add(s);
    }
  }

  return cfg.cssFamily;
}

export function getFontFamilyForLanguage(langCode: string): string {
  const { script } = getLanguageInfo(langCode);
  return (SCRIPT_FONT_CONFIG[script] ?? SCRIPT_FONT_CONFIG.latin).cssFamily;
}
