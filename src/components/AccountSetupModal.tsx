import React, { useEffect, useId, useState } from 'react';
import { Check, UserCheck, X } from 'lucide-react';
import { SCENARIOS } from '../data/scenarios.js';
import { useAppState } from '../hooks/useAppState';
import { getFontFamilyForLanguage } from '../lib/fonts';

export const AccountSetupModal: React.FC = () => {
  const {
    user,
    userProfile,
    homeLanguage,
    localLanguage,
    availableLanguages,
    isAccountModalOpen,
    isFirstTimeOnboarding,
    closeAccountSetup,
    saveAccountProfile,
    t,
  } = useAppState();

  const [displayName, setDisplayName] = useState('');
  const [familyRole, setFamilyRole] = useState<'parent' | 'teen_helper' | 'together'>('parent');
  const [selectedHomeLang, setSelectedHomeLang] = useState(homeLanguage);
  const [selectedLocalLang, setSelectedLocalLang] = useState(localLanguage);
  const [focusVisits, setFocusVisits] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const nameId = useId();
  const homeLangId = useId();
  const localLangId = useId();

  useEffect(() => {
    if (!isAccountModalOpen) return;
    setDisplayName(
      userProfile.displayName ||
        (user?.user_metadata?.full_name as string) ||
        (user?.user_metadata?.name as string) ||
        '',
    );
    setFamilyRole(userProfile.familyRole || 'parent');
    setSelectedHomeLang(homeLanguage);
    setSelectedLocalLang(localLanguage);
    setFocusVisits(userProfile.focusVisits || []);
    setErrorMsg('');
  }, [isAccountModalOpen, userProfile, user, homeLanguage, localLanguage]);

  useEffect(() => {
    if (!isAccountModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isFirstTimeOnboarding) {
        closeAccountSetup();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAccountModalOpen, isFirstTimeOnboarding, closeAccountSetup]);

  if (!isAccountModalOpen || !user) return null;

  const toggleVisit = (id: string) => {
    setFocusVisits((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await saveAccountProfile({
        displayName,
        familyRole,
        focusVisits,
        homeLanguage: selectedHomeLang,
        localLanguage: selectedLocalLang,
        onboardingCompleted: true,
      });
    } catch {
      setErrorMsg(t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      await saveAccountProfile({
        displayName:
          userProfile.displayName ||
          (user?.user_metadata?.full_name as string) ||
          (user?.user_metadata?.name as string) ||
          '',
        familyRole: userProfile.familyRole || 'parent',
        focusVisits: userProfile.focusVisits || [],
        homeLanguage,
        localLanguage,
        onboardingCompleted: true,
      });
    } catch {
      closeAccountSetup();
    } finally {
      setSaving(false);
    }
  };

  const roles: Array<{ id: 'parent' | 'teen_helper' | 'together'; labelKey: string }> = [
    { id: 'parent', labelKey: 'profile.roleParent' },
    { id: 'teen_helper', labelKey: 'profile.roleHelper' },
    { id: 'together', labelKey: 'profile.roleTogether' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-setup-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto backdrop-blur-xs"
    >
      <div className="my-auto w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
              <UserCheck className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h2
                id="account-setup-title"
                className="font-display text-xl font-semibold text-slate-50"
              >
                {isFirstTimeOnboarding ? t('profile.setupTitle') : t('profile.editTitle')}
              </h2>
              <p className="text-sm text-slate-300 leading-snug">
                {t('profile.setupSubtitle')}
              </p>
            </div>
          </div>

          {!isFirstTimeOnboarding && (
            <button
              type="button"
              onClick={closeAccountSetup}
              aria-label={t('common.close')}
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor={nameId} className="block text-sm font-medium text-slate-200">
              {t('profile.displayNameLabel')}
            </label>
            <input
              id={nameId}
              type="text"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('profile.displayNamePlaceholder')}
              className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-200">
              {t('profile.roleLabel')}
            </legend>
            <div className="space-y-2">
              {roles.map((r) => {
                const selected = familyRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFamilyRole(r.id)}
                    aria-pressed={selected}
                    className={`w-full min-h-[44px] flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-start text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
                      selected
                        ? 'border-teal-600 bg-teal-950/70 text-teal-100'
                        : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span>{t(r.labelKey)}</span>
                    {selected && (
                      <Check className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-200">
              {t('profile.languagesHeading')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor={homeLangId} className="block text-xs font-medium text-slate-400">
                  {t('common.myLanguageLabel')}
                </label>
                <select
                  id={homeLangId}
                  value={selectedHomeLang}
                  onChange={(e) => setSelectedHomeLang(e.target.value)}
                  style={{ fontFamily: getFontFamilyForLanguage(selectedHomeLang) }}
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {availableLanguages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} ({l.englishName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor={localLangId} className="block text-xs font-medium text-slate-400">
                  {t('common.localLanguageLabel')}
                </label>
                <select
                  id={localLangId}
                  value={selectedLocalLang}
                  onChange={(e) => setSelectedLocalLang(e.target.value)}
                  style={{ fontFamily: getFontFamilyForLanguage(selectedLocalLang) }}
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {availableLanguages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} ({l.englishName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-200">
              {t('profile.focusVisitsLabel')}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SCENARIOS.map((s) => {
                const checked = focusVisits.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleVisit(s.id)}
                    aria-pressed={checked}
                    className={`min-h-[44px] flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-start text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
                      checked
                        ? 'border-teal-600 bg-teal-950/70 text-teal-100'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{t(s.shortTitleKey)}</span>
                    {checked && (
                      <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {errorMsg && (
            <p role="alert" className="text-sm font-medium text-rose-400">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            {isFirstTimeOnboarding ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSkip()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              >
                {t('profile.skipButton')}
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={closeAccountSetup}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              >
                {t('common.close')}
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              {saving ? t('profile.savingButton') : t('profile.saveButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
