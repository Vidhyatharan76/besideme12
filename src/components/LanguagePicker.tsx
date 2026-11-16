import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Languages, Search, X } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { getFontFamilyForLanguage } from '../lib/fonts';
import type { AvailableLanguageOption } from '../locales';

interface SingleLanguageComboboxProps {
  label: string;
  selectedCode: string;
  onSelect: (code: string) => void;
  options: AvailableLanguageOption[];
  searchPlaceholder: string;
  reviewedLabel: string;
  noResultsLabel: string;
  closeLabel: string;
}

const SingleLanguageCombobox: React.FC<SingleLanguageComboboxProps> = ({
  label,
  selectedCode,
  onSelect,
  options,
  searchPlaceholder,
  reviewedLabel,
  noResultsLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const buttonId = useId();
  const listboxId = useId();
  const searchId = useId();

  const selected = useMemo(
    () => options.find((o) => o.code === selectedCode) ?? options[0],
    [options, selectedCode],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.nativeName.toLowerCase().includes(q) ||
        o.englishName.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 20);
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[220px]">
      <label
        htmlFor={buttonId}
        className="block text-xs font-semibold text-slate-300 mb-1.5"
      >
        {label}
      </label>

      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full min-h-[46px] flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-start text-sm text-slate-100 hover:border-slate-600 hover:bg-slate-800/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
      >
        <span className="min-w-0 truncate">
          <span
            lang={selected.code}
            dir={selected.dir}
            style={{ fontFamily: getFontFamilyForLanguage(selected.code) }}
            className="font-semibold text-slate-50"
          >
            {selected.nativeName}
          </span>
          {selected.nativeName !== selected.englishName && (
            <span className="text-slate-400 ms-1.5 text-xs">
              ({selected.englishName})
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-full min-w-[260px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
          <div className="p-2.5 border-b border-slate-800">
            <label htmlFor={searchId} className="sr-only">
              {searchPlaceholder}
            </label>
            <div className="relative flex items-center">
              <Search
                className="w-4 h-4 text-slate-400 absolute start-3 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                id={searchId}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-slate-950 ps-9 pe-8 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute end-2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto divide-y divide-slate-800/60"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400">{noResultsLabel}</li>
            ) : (
              filtered.map((lang) => {
                const active = lang.code === selectedCode;
                return (
                  <li key={lang.code} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(lang.code);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={`w-full min-h-[44px] flex items-center justify-between gap-2 px-3.5 py-2.5 text-start text-sm transition-colors hover:bg-slate-800 ${
                        active ? 'bg-teal-950/70 text-teal-200' : 'text-slate-100'
                      }`}
                    >
                      <span className="min-w-0">
                        <span
                          lang={lang.code}
                          dir={lang.dir}
                          style={{ fontFamily: getFontFamilyForLanguage(lang.code) }}
                          className="font-semibold block"
                        >
                          {lang.nativeName}
                        </span>
                        <span className="text-xs text-slate-400">
                          {lang.englishName}
                          {lang.isReviewed ? ` · ${reviewedLabel}` : ''}
                        </span>
                      </span>
                      {active && (
                        <Check className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

interface LanguagePickerProps {
  variant?: 'compact' | 'prominent';
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({ variant = 'prominent' }) => {
  const {
    homeLanguage,
    localLanguage,
    homeLanguageInfo,
    localLanguageInfo,
    availableLanguages,
    setHomeLanguage,
    setLocalLanguage,
    t,
  } = useAppState();

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={`${t('common.myLanguageLabel')} / ${t('common.localLanguageLabel')}`}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <Languages className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
          <span className="max-w-[90px] truncate">{homeLanguageInfo.nativeName}</span>
          <span className="text-slate-400">/</span>
          <span className="max-w-[70px] truncate text-slate-300">
            {localLanguageInfo.nativeName}
          </span>
        </button>

        {mobileOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('common.languageLabel')}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 pt-14 backdrop-blur-xs"
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-slate-50">
                  {t('common.languageLabel')}
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label={t('common.close')}
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <SingleLanguageCombobox
                  label={t('common.myLanguageLabel')}
                  selectedCode={homeLanguage}
                  onSelect={setHomeLanguage}
                  options={availableLanguages}
                  searchPlaceholder={t('common.searchLanguagePlaceholder')}
                  reviewedLabel={t('common.reviewedLabel')}
                  noResultsLabel={t('common.noLanguagesFound')}
                  closeLabel={t('common.close')}
                />

                <SingleLanguageCombobox
                  label={t('common.localLanguageLabel')}
                  selectedCode={localLanguage}
                  onSelect={setLocalLanguage}
                  options={availableLanguages}
                  searchPlaceholder={t('common.searchLanguagePlaceholder')}
                  reviewedLabel={t('common.reviewedLabel')}
                  noResultsLabel={t('common.noLanguagesFound')}
                  closeLabel={t('common.close')}
                />
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-full min-h-[44px] rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SingleLanguageCombobox
          label={t('common.myLanguageLabel')}
          selectedCode={homeLanguage}
          onSelect={setHomeLanguage}
          options={availableLanguages}
          searchPlaceholder={t('common.searchLanguagePlaceholder')}
          reviewedLabel={t('common.reviewedLabel')}
          noResultsLabel={t('common.noLanguagesFound')}
          closeLabel={t('common.close')}
        />

        <SingleLanguageCombobox
          label={t('common.localLanguageLabel')}
          selectedCode={localLanguage}
          onSelect={setLocalLanguage}
          options={availableLanguages}
          searchPlaceholder={t('common.searchLanguagePlaceholder')}
          reviewedLabel={t('common.reviewedLabel')}
          noResultsLabel={t('common.noLanguagesFound')}
          closeLabel={t('common.close')}
        />
      </div>
    </div>
  );
};
