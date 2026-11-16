import React, { useId, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Trash2 } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppState, type CustomScenario } from '../hooks/useAppState';

export const BuildScenarioPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    homeLanguage,
    localLanguage,
    availableLanguages,
    t,
    customScenarios,
    saveCustomScenario,
    removeCustomScenario,
    syncError,
    getIdToken,
  } = useAppState();

  const [selectedLangCode, setSelectedLangCode] = useState<string>(homeLanguage);
  const [description, setDescription] = useState('');
  const [extraFocus, setExtraFocus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const langFieldId = useId();
  const descFieldId = useId();
  const focusFieldId = useId();

  const requestedId = searchParams.get('id');
  if (requestedId) {
    return <Navigate to={`/scenario/${encodeURIComponent(requestedId)}`} replace />;
  }

  const starterExamples = [
    'Parent-teacher meeting about reading support and homework',
    'Pediatrician clinic checkup for allergies or asthma plan',
    'Opening a bank savings account and setting up direct deposit',
    'School counselor meeting about high school classes or IEP',
  ];

  const selectedLangMeta =
    availableLanguages.find((l) => l.code === selectedLangCode) ?? availableLanguages[0];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) {
      setErrorMsg(t('ai.descriptionRequired'));
      return;
    }

    const combinedDescription = extraFocus.trim()
      ? `${trimmed}. Specific focus or concern: ${extraFocus.trim()}`.slice(0, 490)
      : trimmed;

    setErrorMsg('');
    setIsGenerating(true);

    try {
      const token = await getIdToken();
      if (!token) {
        setErrorMsg(t('ai.errorGeneric'));
        return;
      }
      const response = await fetch('/api/ai/build-scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: combinedDescription,
          languageCode: selectedLangMeta.code,
          languageName: `${selectedLangMeta.englishName} (${selectedLangMeta.nativeName})`,
          localLanguageCode: localLanguage,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setErrorMsg(t('ai.errorGeneric'));
        return;
      }

      const data = await response.json();
      if (!response.ok || data.error) {
        setErrorMsg(
          typeof data.error === 'string' && data.error.trim()
            ? data.error
            : t('ai.errorGeneric'),
        );
        return;
      }

      const newScenario: CustomScenario = {
        ...data,
        languageCode: selectedLangMeta.code,
        languageName: selectedLangMeta.nativeName,
        localLanguageCode: localLanguage,
        createdAt: new Date().toISOString(),
      };

      try {
        await saveCustomScenario(newScenario);
      } catch {
      }

      navigate(`/scenario/${encodeURIComponent(newScenario.id)}`);
    } catch {
      setErrorMsg(t('ai.errorGeneric'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <Link
          to="/"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          <span>{t('nav.home')}</span>
        </Link>

        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
            <Sparkles className="w-6 h-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-50">
              {t('ai.buildTitle')}
            </h1>
            <p className="mt-1 text-base text-slate-300">{t('ai.buildSubtitle')}</p>
          </div>
        </div>

        {syncError && (
          <p role="status" className="text-sm text-amber-300">
            {t(syncError)}
          </p>
        )}
      </div>

      <form
        onSubmit={handleGenerate}
        noValidate
        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label htmlFor={langFieldId} className="block text-sm font-medium text-slate-200">
            {t('ai.languageSelectLabel')}
          </label>
          <select
            id={langFieldId}
            value={selectedLangCode}
            onChange={(e) => setSelectedLangCode(e.target.value)}
            className="w-full sm:w-80 min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            {availableLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.englishName})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={descFieldId} className="block text-sm font-medium text-slate-200">
            {t('ai.descriptionLabel')}
          </label>
          <textarea
            id={descFieldId}
            rows={3}
            maxLength={320}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder={t('ai.descriptionPlaceholder')}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400">
            Quick examples (tap to fill):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {starterExamples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setDescription(example);
                  if (errorMsg) setErrorMsg('');
                }}
                className="min-h-[40px] rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-start text-xs text-slate-300 hover:border-teal-700 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={focusFieldId} className="block text-sm font-medium text-slate-300">
            Anything specific you want to ask about? (optional)
          </label>
          <input
            id={focusFieldId}
            type="text"
            maxLength={140}
            value={extraFocus}
            onChange={(e) => setExtraFocus(e.target.value)}
            placeholder="e.g., after-school tutoring, cost, or written translation"
            className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          />
        </div>

        {errorMsg && (
          <p role="alert" className="text-sm font-medium text-rose-400">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={isGenerating}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{isGenerating ? t('ai.generating') : t('ai.generateButton')}</span>
        </button>
      </form>

      {customScenarios.length > 0 && (
        <section aria-labelledby="saved-scenarios-heading" className="space-y-4">
          <h2
            id="saved-scenarios-heading"
            className="font-display text-xl font-semibold text-slate-50"
          >
            Your saved visits
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                    <button
                      type="button"
                      onClick={() => void removeCustomScenario(sc.id)}
                      aria-label={`${t('words.removeWord')}: ${sc.title}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
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
        </section>
      )}
    </div>
  );
};
