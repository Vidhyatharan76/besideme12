import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Printer } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { getFontFamilyForLanguage } from '../lib/fonts';

export const InterpreterCardPage: React.FC = () => {
  const {
    homeLanguage,
    localLanguage,
    homeLanguageInfo,
    localLanguageInfo,
    t,
    tLocal,
  } = useAppState();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const showDualLanguage = homeLanguage !== localLanguage;
  const preferredLangForDesk =
    homeLanguageInfo.nativeName === homeLanguageInfo.englishName
      ? homeLanguageInfo.nativeName
      : `${homeLanguageInfo.nativeName} (${homeLanguageInfo.englishName})`;

  const localFont = getFontFamilyForLanguage(localLanguage);
  const homeFont = getFontFamilyForLanguage(homeLanguage);

  const CardBody = (
    <div className="space-y-6">
      <div
        lang={localLanguage}
        dir={localLanguageInfo.dir}
        style={{ fontFamily: localFont }}
        className="space-y-2.5"
      >
        <p className="text-xs font-semibold tracking-wide text-slate-400 print:text-black">
          {t('common.inLocalLanguage', { language: localLanguageInfo.nativeName })}
        </p>
        <p
          className={`font-display font-semibold text-white leading-tight print:text-black ${
            isFullscreen ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-4xl'
          }`}
        >
          {tLocal('interpreterCard.phraseText')}
        </p>
        <p className="text-base sm:text-lg font-medium text-slate-200 print:text-black">
          {tLocal('interpreterCard.preferredLangTemplate', {
            language: preferredLangForDesk,
          })}
        </p>
        <p className="text-sm sm:text-base text-slate-300 print:text-black">
          {tLocal('interpreterCard.helperNoteText')}
        </p>
      </div>

      {showDualLanguage && (
        <div
          lang={homeLanguage}
          dir={homeLanguageInfo.dir}
          style={{ fontFamily: homeFont }}
          className="border-t border-slate-800 pt-5 space-y-2 print:border-black"
        >
          <p className="text-xs font-semibold tracking-wide text-slate-400 print:text-black">
            {t('common.inYourLanguage', { language: homeLanguageInfo.nativeName })}
          </p>
          <p
            className={`font-display font-semibold text-slate-100 leading-snug print:text-black ${
              isFullscreen ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
            }`}
          >
            {t('interpreterCard.phraseText')}
          </p>
          <p className="text-sm sm:text-base font-medium text-slate-200 print:text-black">
            {t('interpreterCard.preferredLangTemplate', {
              language: homeLanguageInfo.nativeName,
            })}
          </p>
          <p className="text-sm sm:text-base text-slate-300 print:text-black">
            {t('interpreterCard.helperNoteText')}
          </p>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('interpreterCard.title')}
        className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-slate-100 p-6 sm:p-12 overflow-y-auto print:static print:bg-white print:text-black print:p-0"
      >
        <div className="print:hidden flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <span className="font-display text-lg font-semibold text-slate-100">
            {t('common.appName')}
          </span>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <Minimize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('interpreterCard.exitFullscreen')}</span>
          </button>
        </div>

        <div className="my-auto mx-auto w-full max-w-3xl py-8">{CardBody}</div>

        <p className="text-xs text-slate-400 border-t border-slate-800 pt-4 print:text-black">
          {t('common.footerPrivacy')}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="print:hidden space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-50">
          {t('interpreterCard.title')}
        </h1>
        <p className="text-base text-slate-300">{t('interpreterCard.subtitle')}</p>
      </div>

      <div className="print:hidden flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <Maximize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{t('interpreterCard.enterFullscreen')}</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <Printer className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
          <span>{t('interpreterCard.printCard')}</span>
        </button>
      </div>

      <section
        aria-label={t('interpreterCard.title')}
        className="print-bw rounded-2xl border-2 border-slate-700 bg-slate-900 p-6 sm:p-10 print:rounded-none print:border-2 print:border-black"
      >
        {CardBody}
      </section>

      <section
        aria-labelledby="rights-heading"
        className="print-bw rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 print:border print:border-black"
      >
        <h2 id="rights-heading" className="text-lg font-semibold text-slate-100 print:text-black">
          {t('interpreterCard.rightsHeading')}
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed print:text-black">
          {t('interpreterCard.rightsBody')}
        </p>

        <div className="rounded-xl border border-dashed border-slate-600 bg-slate-950/60 p-4 space-y-1 print:bg-white print:border-black">
          <p className="text-xs font-semibold text-slate-300 print:text-black">
            {t('interpreterCard.placeholderLabel')}
          </p>
          <p className="text-sm text-slate-200 leading-relaxed print:text-black">
            {t('interpreterCard.placeholderText')}
          </p>
        </div>
      </section>
    </div>
  );
};
