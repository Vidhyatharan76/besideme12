import React from 'react';
import { getFontFamilyForLanguage } from '../lib/fonts';
import { getLanguageDir } from '../locales/languages';

interface BilingualPhraseProps {
  userText: string;
  localText: string;
  userLang: string;
  localLang: string;
  homeLabel?: string;
  localLabel?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}

export const BilingualPhrase: React.FC<BilingualPhraseProps> = ({
  userText,
  localText,
  userLang,
  localLang,
  homeLabel,
  localLabel,
  primaryClassName = 'text-base sm:text-lg font-semibold text-slate-50 leading-snug',
  secondaryClassName = 'text-base sm:text-lg font-medium text-slate-200 leading-snug',
}) => {
  const showDual = userLang !== localLang || userText.trim() !== localText.trim();
  const userDir = getLanguageDir(userLang);
  const localDir = getLanguageDir(localLang);

  if (!showDual) {
    return (
      <div lang={userLang} dir={userDir} style={{ fontFamily: getFontFamilyForLanguage(userLang) }}>
        {homeLabel && (
          <p className="text-[11px] font-medium text-slate-400 mb-1">{homeLabel}</p>
        )}
        <p className={primaryClassName}>{userText}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
      <div
        lang={userLang}
        dir={userDir}
        style={{ fontFamily: getFontFamilyForLanguage(userLang) }}
        className="space-y-1 min-w-0"
      >
        {homeLabel && (
          <p className="text-[11px] font-medium text-slate-400">{homeLabel}</p>
        )}
        <p className={primaryClassName}>{userText}</p>
      </div>

      <div
        lang={localLang}
        dir={localDir}
        style={{ fontFamily: getFontFamilyForLanguage(localLang) }}
        className="space-y-1 min-w-0 border-t sm:border-t-0 sm:border-s border-slate-800 pt-2.5 sm:pt-0 sm:ps-5"
      >
        {localLabel && (
          <p className="text-[11px] font-medium text-slate-400">{localLabel}</p>
        )}
        <p className={secondaryClassName}>{localText}</p>
      </div>
    </div>
  );
};
