import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  FileText,
  IdCard,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthBar } from '../components/AuthBar';
import { LanguagePicker } from '../components/LanguagePicker';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { ScenarioIcon } from '../components/ScenarioIcon';
import { SCENARIOS } from '../data/scenarios.js';
import { useAppState } from '../hooks/useAppState';

export const HomePage: React.FC = () => {
  const {
    t,
    user,
    userProfile,
    customScenarios,
    resetAllData,
    hasAnySavedProgress,
  } = useAppState();
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleReset = () => {
    resetAllData();
    setStatusMessage(t('common.resetConfirm'));
  };

  return (
    <div className="space-y-10">
      <section aria-labelledby="home-promise" className="space-y-6">
        <div className="max-w-3xl space-y-3">
          {user && userProfile.displayName && (
            <p className="text-sm font-semibold text-teal-300">
              {t('profile.welcomeName', { name: userProfile.displayName })}
            </p>
          )}
          <h1
            id="home-promise"
            className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-50 leading-tight"
          >
            {t('home.promise')}
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">{t('home.helperNote')}</p>
        </div>

        <AuthBar />

        <div className="space-y-4 border-y border-slate-800 py-5">
          <LanguagePicker variant="prominent" />

          {(hasAnySavedProgress || typeof window !== 'undefined') && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <PWAInstallButton />
              {hasAnySavedProgress && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 whitespace-nowrap shrink-0 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t('common.resetData')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {statusMessage && (
          <p role="status" aria-live="polite" className="text-sm font-medium text-teal-300">
            {statusMessage}
          </p>
        )}
      </section>

      <section aria-labelledby="choose-visit-heading" className="space-y-4">
        <h2
          id="choose-visit-heading"
          className="font-display text-xl sm:text-2xl font-semibold text-slate-50"
        >
          {t('home.chooseVisit')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SCENARIOS.map((scenario) => {
            const isFocused = userProfile.focusVisits.includes(scenario.id);
            return (
              <article
                key={scenario.id}
                className={`flex flex-col justify-between rounded-2xl border bg-slate-900 p-6 ${
                  isFocused ? 'border-teal-600/80' : 'border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      {t(scenario.roleTagKey)}
                      {isFocused && (
                        <span className="text-teal-300 font-semibold">
                          {' '}
                          · {t('profile.focusTag')}
                        </span>
                      )}
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
                      <ScenarioIcon icon={scenario.icon} className="w-5 h-5" />
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-50 leading-snug">
                    {t(scenario.titleKey)}
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {t(scenario.summaryKey)}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col gap-2">
                  <Link
                    to={`/scenario/${scenario.id}`}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                  >
                    <span>{t('home.startWalkthrough')}</span>
                    <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
                  </Link>

                  <Link
                    to={`/questions/${scenario.id}`}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-teal-300 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                  >
                    {t('home.practiceQuestions')}
                  </Link>
                </div>
              </article>
            );
          })}

          {customScenarios.map((sc) => (
            <article
              key={sc.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    {sc.shortTitle} · 4 steps
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
                    <Sparkles className="w-5 h-5" aria-hidden="true" />
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-slate-50 leading-snug">
                  {sc.title}
                </h3>

                {sc.summary && (
                  <p className="text-sm text-slate-300 leading-relaxed">{sc.summary}</p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col gap-2">
                <Link
                  to={`/scenario/${encodeURIComponent(sc.id)}`}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  <span>{t('home.startWalkthrough')}</span>
                  <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
                </Link>

                <Link
                  to={`/questions/${encodeURIComponent(sc.id)}`}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-teal-300 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {t('home.practiceQuestions')}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <Link
          to="/build-scenario"
          className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-teal-500/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <div className="flex items-start sm:items-center gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <h3 className="text-base font-semibold text-slate-100 group-hover:text-teal-300">
                {t('home.buildScenarioTitle')}
              </h3>
              <p className="text-sm text-slate-400">{t('home.buildScenarioDesc')}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-300 whitespace-nowrap shrink-0">
            <span>{t('ai.generateButton')}</span>
            <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
          </span>
        </Link>
      </section>

      <section aria-labelledby="quick-tools-heading" className="space-y-4">
        <h2
          id="quick-tools-heading"
          className="font-display text-xl font-semibold text-slate-50"
        >
          {t('home.quickToolsHeading')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/words"
            className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-teal-500/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <span className="text-base font-semibold text-slate-100 group-hover:text-teal-300">
                {t('nav.words')}
              </span>
              <p className="text-sm text-slate-400">{t('home.myWordsDesc')}</p>
            </div>
          </Link>

          <Link
            to="/progress"
            className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-teal-500/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
              <TrendingUp className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <span className="text-base font-semibold text-slate-100 group-hover:text-teal-300">
                {t('nav.progress')}
              </span>
              <p className="text-sm text-slate-400">{t('home.myProgressDesc')}</p>
            </div>
          </Link>

          <Link
            to="/interpreter-card"
            className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-teal-500/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
              <IdCard className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <span className="text-base font-semibold text-slate-100 group-hover:text-teal-300">
                {t('home.interpreterCardTitle')}
              </span>
              <p className="text-sm text-slate-400">{t('home.interpreterCardDesc')}</p>
            </div>
          </Link>

          <Link
            to="/cheat-sheet"
            className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-teal-500/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <span className="text-base font-semibold text-slate-100 group-hover:text-teal-300">
                {t('home.cheatSheetTitle')}
              </span>
              <p className="text-sm text-slate-400">{t('home.cheatSheetDesc')}</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};
