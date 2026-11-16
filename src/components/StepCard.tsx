import React from 'react';
import { CheckSquare } from 'lucide-react';
import { getFontFamilyForLanguage } from '../lib/fonts';
import { getLanguageDir } from '../locales/languages';

export interface StepChecklistItem {
  userText: string;
  localText?: string;
}

interface StepCardProps {
  stepId: string;
  title: string;
  localTitle?: string;
  body: string;
  localBody?: string;
  tip?: string;
  localTip?: string;
  checklistHeading?: string;
  checklistItems?: StepChecklistItem[];
  checkedMap?: Record<number, boolean>;
  onToggleChecklistItem?: (idx: number) => void;
  showHelperToggle?: boolean;
  helperToggleLabel?: string;
  showHelperEnglish?: boolean;
  onToggleHelperEnglish?: () => void;
  userLang?: string;
  localLang: string;
}

export const StepCard: React.FC<StepCardProps> = ({
  stepId,
  title,
  localTitle,
  body,
  localBody,
  tip,
  localTip,
  checklistHeading,
  checklistItems = [],
  checkedMap = {},
  onToggleChecklistItem,
  showHelperToggle = false,
  helperToggleLabel,
  showHelperEnglish = false,
  onToggleHelperEnglish,
  userLang = 'en',
  localLang,
}) => {
  const userDir = getLanguageDir(userLang);
  const localDir = getLanguageDir(localLang);
  const userFont = getFontFamilyForLanguage(userLang);
  const localFont = getFontFamilyForLanguage(localLang);
  const showSideBySide = showHelperEnglish && Boolean(localBody || localTip);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2
            lang={userLang}
            dir={userDir}
            style={{ fontFamily: userFont }}
            className="font-display text-xl sm:text-2xl font-semibold text-slate-50"
          >
            {title}
          </h2>
          {showSideBySide && localTitle && localTitle !== title && (
            <p
              lang={localLang}
              dir={localDir}
              style={{ fontFamily: localFont }}
              className="text-sm font-medium text-slate-400"
            >
              {localTitle}
            </p>
          )}
        </div>

        {showHelperToggle && helperToggleLabel && onToggleHelperEnglish && (
          <button
            type="button"
            onClick={onToggleHelperEnglish}
            aria-pressed={showHelperEnglish}
            className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
              showHelperEnglish
                ? 'border-teal-600 bg-teal-950 text-teal-200'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {helperToggleLabel}
          </button>
        )}
      </div>

      <div className={showSideBySide && localBody ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : ''}>
        <p
          lang={userLang}
          dir={userDir}
          style={{ fontFamily: userFont }}
          className="text-base sm:text-lg text-slate-200 leading-relaxed tracking-wide"
        >
          {body}
        </p>

        {showSideBySide && localBody && (
          <p
            lang={localLang}
            dir={localDir}
            style={{ fontFamily: localFont }}
            className="text-sm sm:text-base text-slate-300 leading-relaxed border-t md:border-t-0 md:border-s border-slate-800 pt-3 md:pt-0 md:ps-5"
          >
            {localBody}
          </p>
        )}
      </div>

      {checklistItems.length > 0 && (
        <fieldset className="space-y-2 pt-2">
          {checklistHeading && (
            <legend className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-2">
              <CheckSquare className="w-4 h-4 text-teal-400" aria-hidden="true" />
              <span>{checklistHeading}</span>
            </legend>
          )}
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/60">
            {checklistItems.map((item, idx) => {
              const checked = !!checkedMap[idx];
              const checkboxId = `step-item-${stepId}-${idx}`;
              return (
                <li key={checkboxId}>
                  <label
                    htmlFor={checkboxId}
                    className="flex min-h-[48px] cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-800/60"
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleChecklistItem?.(idx)}
                      className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-900 text-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                    />
                    <span className="flex-1 text-sm sm:text-base text-slate-100">
                      <span
                        lang={userLang}
                        dir={userDir}
                        style={{ fontFamily: userFont }}
                        className={checked ? 'line-through text-slate-500' : ''}
                      >
                        {item.userText}
                      </span>
                      {showHelperEnglish && item.localText && (
                        <span
                          lang={localLang}
                          dir={localDir}
                          style={{ fontFamily: localFont }}
                          className="block text-xs text-slate-400 mt-0.5"
                        >
                          {item.localText}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {tip && (
        <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-sm text-slate-300 leading-relaxed">
          <div className={showSideBySide && localTip ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
            <p lang={userLang} dir={userDir} style={{ fontFamily: userFont }}>
              {tip}
            </p>
            {showSideBySide && localTip && (
              <p
                lang={localLang}
                dir={localDir}
                style={{ fontFamily: localFont }}
                className="text-xs sm:text-sm text-slate-400 border-t md:border-t-0 md:border-s border-slate-800 pt-2.5 md:pt-0 md:ps-4"
              >
                {localTip}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
