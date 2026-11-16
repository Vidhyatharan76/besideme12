import React, { useState } from 'react';
import { ArrowLeft, BookmarkPlus, Check, FileText, IdCard, Plus, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { BilingualPhrase } from '../components/BilingualPhrase';
import { ScenarioIcon } from '../components/ScenarioIcon';
import { getScenarioById } from '../data/scenarios.js';
import { useAppState } from '../hooks/useAppState';
import { normalizeCategoryName } from '../lib/wordCategory';
import { getLanguageInfo } from '../locales/languages';

export const QuestionsPage: React.FC = () => {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const {
    homeLanguage,
    localLanguage,
    t,
    tLocal,
    customScenarios,
    practicedQuestionIds,
    togglePracticedQuestion,
    chosenQuestionIds,
    toggleChosenQuestion,
    saveWordsBatchToLocal,
    authLoading,
    isSyncing,
  } = useAppState();

  const [wordsSaved, setWordsSaved] = useState(false);

  const defaultScenario = getScenarioById(scenarioId);
  const customScenario = !defaultScenario
    ? customScenarios.find((s) => s.id === scenarioId)
    : undefined;

  if (!defaultScenario && !customScenario) {
    if (authLoading || isSyncing) {
      return (
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          {t('auth.loadingAccount')}
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h1 className="font-display text-2xl font-semibold text-slate-50">
          {t('home.chooseVisit')}
        </h1>
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          <span>{t('nav.home')}</span>
        </Link>
      </div>
    );
  }

  const isCustom = Boolean(customScenario);
  const activeId = customScenario ? customScenario.id : defaultScenario!.id;
  const activeUserLang = customScenario ? customScenario.languageCode : homeLanguage;
  const activeLocalLang = customScenario?.localLanguageCode ?? localLanguage;
  const activeUserInfo = getLanguageInfo(activeUserLang);
  const activeLocalInfo = getLanguageInfo(activeLocalLang);

  const shortTitle = customScenario
    ? customScenario.shortTitle
    : t(defaultScenario!.shortTitleKey);
  const title = customScenario ? customScenario.title : t(defaultScenario!.titleKey);

  const questions = customScenario
    ? customScenario.questions
    : defaultScenario!.questions.map((q) => ({
        id: q.id,
        userText: t(q.textKey),
        localText: tLocal(q.textKey),
      }));

  const practicedHereCount = questions.filter((q) =>
    practicedQuestionIds.includes(q.id),
  ).length;

  const cheatSheetHref = customScenario
    ? `/cheat-sheet?source=custom&scenarioId=${encodeURIComponent(customScenario.id)}`
    : '/cheat-sheet';

  const handleSaveCustomWords = async () => {
    if (!customScenario) return;
    const category = normalizeCategoryName(customScenario.shortTitle || 'Custom visit');
    await saveWordsBatchToLocal(
      customScenario.words.map((w) => ({
        userWord: w.userText,
        localWord: w.localText,
        category,
      })),
    );
    setWordsSaved(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <Link
          to={`/scenario/${encodeURIComponent(activeId)}`}
          className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          <span>{shortTitle}</span>
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
              {isCustom ? (
                <Sparkles className="w-6 h-6" aria-hidden="true" />
              ) : (
                <ScenarioIcon icon={defaultScenario!.icon} className="w-6 h-6" />
              )}
            </span>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-50">
                {t('questions.title')}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {title} ·{' '}
                <span className="tabular-nums font-medium text-slate-200">
                  {t('questions.practicedCount', {
                    count: practicedHereCount,
                    total: questions.length,
                  })}
                </span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-base text-slate-300">{t('questions.subtitle')}</p>
      </div>

      <ul className="space-y-4">
        {questions.map((question) => {
          const isPracticed = practicedQuestionIds.includes(question.id);
          const isChosen = chosenQuestionIds.includes(question.id);

          return (
            <li
              key={question.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 space-y-4"
            >
              <BilingualPhrase
                userText={question.userText}
                localText={question.localText}
                userLang={activeUserLang}
                localLang={activeLocalLang}
                homeLabel={t('common.inYourLanguage', { language: activeUserInfo.nativeName })}
                localLabel={t('common.inLocalLanguage', { language: activeLocalInfo.nativeName })}
              />

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => togglePracticedQuestion(question.id)}
                  aria-pressed={isPracticed}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
                    isPracticed
                      ? 'bg-teal-700 text-white hover:bg-teal-600'
                      : 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
                  }`}
                >
                  <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{isPracticed ? t('questions.gotItDone') : t('questions.gotIt')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleChosenQuestion(question.id)}
                  aria-pressed={isChosen}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
                    isChosen
                      ? 'border border-teal-600 bg-teal-950 text-teal-200'
                      : 'border border-slate-700 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {isChosen ? (
                    <Check className="w-4 h-4 text-teal-300 shrink-0" aria-hidden="true" />
                  ) : (
                    <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {isChosen ? t('questions.includedOnSheet') : t('questions.includeOnSheet')}
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {customScenario && customScenario.words.length > 0 && (
        <section aria-labelledby="custom-visit-words-heading" className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="custom-visit-words-heading"
              className="font-display text-xl font-semibold text-slate-50"
            >
              {t('ai.wordsHeading')}
            </h2>

            <button
              type="button"
              onClick={() => void handleSaveCustomWords()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              {wordsSaved ? (
                <Check className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
              ) : (
                <BookmarkPlus className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
              )}
              <span>{wordsSaved ? t('ai.wordsSavedConfirm') : t('ai.saveWordsButton')}</span>
            </button>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customScenario.words.map((w) => (
              <li
                key={w.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <BilingualPhrase
                  userText={w.userText}
                  localText={w.localText}
                  userLang={activeUserLang}
                  localLang={activeLocalLang}
                  primaryClassName="text-base font-semibold text-slate-100"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link
          to="/interpreter-card"
          className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <IdCard className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
          <span>{t('questions.nextInterpreter')}</span>
        </Link>

        <Link
          to={cheatSheetHref}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{t('questions.nextCheatSheet')}</span>
        </Link>
      </div>
    </div>
  );
};
