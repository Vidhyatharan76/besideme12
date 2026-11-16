import React from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthBar } from '../components/AuthBar';
import { useAppState } from '../hooks/useAppState';

export const ProgressPage: React.FC = () => {
  const {
    homeLanguage,
    t,
    knownWordsCount,
    totalWordsCount,
    practicedQuestionIds,
    totalQuestionsCount,
  } = useAppState();

  const formatNum = (n: number) => {
    try {
      return new Intl.NumberFormat(homeLanguage).format(n);
    } catch {
      return String(n);
    }
  };

  const practicedCount = practicedQuestionIds.length;
  const wordsRatio = totalWordsCount > 0 ? Math.min(1, knownWordsCount / totalWordsCount) : 0;
  const questionsRatio =
    totalQuestionsCount > 0 ? Math.min(1, practicedCount / totalQuestionsCount) : 0;
  const combinedRatio = (wordsRatio + questionsRatio) / 2;

  let headlineKey = 'progress.headlineStarting';
  let gentleMessageKey = 'progress.gentleMessageStart';

  if (combinedRatio >= 0.45) {
    headlineKey = 'progress.headlineSteady';
    gentleMessageKey = 'progress.gentleMessageStrong';
  } else if (knownWordsCount > 0 || practicedCount > 0) {
    headlineKey = 'progress.headlineGrowing';
    gentleMessageKey = 'progress.gentleMessageGrowing';
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-50">
          {t('progress.title')}
        </h1>
        <p className="text-base text-slate-300">{t('progress.subtitle')}</p>
      </div>

      <AuthBar />

      <section
        aria-labelledby="independence-headline"
        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-2">
          <h2
            id="independence-headline"
            className="font-display text-xl sm:text-2xl font-semibold text-teal-300"
          >
            {t(headlineKey)}
          </h2>
          <p className="text-base text-slate-200 leading-relaxed">{t(gentleMessageKey)}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-slate-100">
                {t('progress.wordsKnownLabel')}
              </span>
              <span className="text-sm text-slate-300 tabular-nums">
                {t('progress.wordsSummary', {
                  known: formatNum(knownWordsCount),
                  total: formatNum(totalWordsCount),
                })}
              </span>
            </div>

            <div
              role="progressbar"
              aria-label={t('progress.wordsKnownLabel')}
              aria-valuenow={knownWordsCount}
              aria-valuemin={0}
              aria-valuemax={totalWordsCount}
              className="h-3 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800"
            >
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300 motion-reduce:transition-none"
                style={{ width: `${Math.round(wordsRatio * 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-slate-100">
                {t('progress.questionsAskedLabel')}
              </span>
              <span className="text-sm text-slate-300 tabular-nums">
                {t('progress.questionsSummary', {
                  practiced: formatNum(practicedCount),
                  total: formatNum(totalQuestionsCount),
                })}
              </span>
            </div>

            <div
              role="progressbar"
              aria-label={t('progress.questionsAskedLabel')}
              aria-valuenow={practicedCount}
              aria-valuemin={0}
              aria-valuemax={totalQuestionsCount}
              className="h-3 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800"
            >
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300 motion-reduce:transition-none"
                style={{ width: `${Math.round(questionsRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="next-step-title" className="space-y-3">
        <h2 id="next-step-title" className="text-base font-semibold text-slate-100">
          {t('progress.nextStepTitle')}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/words"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('progress.practiceMoreWords')}</span>
          </Link>

          <Link
            to="/cheat-sheet"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <FileText className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
            <span>{t('progress.printYourSheet')}</span>
          </Link>
        </div>
      </section>
    </div>
  );
};
