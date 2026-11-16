import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SCENARIOS } from '../data/scenarios.js';
import { useAppState } from '../hooks/useAppState';
import { getFontFamilyForLanguage } from '../lib/fonts';
import { formatIntlDate, getLanguageDir, getLanguageInfo } from '../locales/languages';

export const CheatSheetPage: React.FC = () => {
  const {
    homeLanguage,
    localLanguage,
    homeLanguageInfo,
    user,
    userProfile,
    t,
    tLocal,
    tArray,
    tLocalArray,
    wordsState,
    customScenarios,
    chosenQuestionIds,
  } = useAppState();

  const [searchParams] = useSearchParams();
  const requestedScenarioId = searchParams.get('scenarioId');

  const initialSource = (() => {
    if (requestedScenarioId && customScenarios.some((s) => s.id === requestedScenarioId)) {
      return `scenario:${requestedScenarioId}`;
    }
    if (searchParams.get('source') === 'custom' && customScenarios.length > 0) {
      return `scenario:${customScenarios[0].id}`;
    }
    return 'all';
  })();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(initialSource);
  const appliedUrlPresetRef = useRef<boolean>(initialSource !== 'all');
  const filterId = useId();

  useEffect(() => {
    if (appliedUrlPresetRef.current || customScenarios.length === 0) return;
    if (requestedScenarioId && customScenarios.some((s) => s.id === requestedScenarioId)) {
      setSelectedScenarioId(`scenario:${requestedScenarioId}`);
      appliedUrlPresetRef.current = true;
    } else if (searchParams.get('source') === 'custom') {
      setSelectedScenarioId(`scenario:${customScenarios[0].id}`);
      appliedUrlPresetRef.current = true;
    }
  }, [customScenarios, requestedScenarioId, searchParams]);

  const activeCustomId = selectedScenarioId.startsWith('scenario:')
    ? selectedScenarioId.slice('scenario:'.length)
    : selectedScenarioId === 'custom' && customScenarios.length > 0
      ? customScenarios[0].id
      : null;

  const generatedScenario = useMemo(
    () => (activeCustomId ? customScenarios.find((s) => s.id === activeCustomId) ?? null : null),
    [activeCustomId, customScenarios],
  );

  const isCustomActive = Boolean(generatedScenario);
  const activeUserLang = isCustomActive && generatedScenario ? generatedScenario.languageCode : homeLanguage;
  const activeLocalLang =
    isCustomActive && generatedScenario?.localLanguageCode
      ? generatedScenario.localLanguageCode
      : localLanguage;

  const activeUserInfo = getLanguageInfo(activeUserLang);
  const activeLocalInfo = getLanguageInfo(activeLocalLang);
  const showDualLanguage = activeUserLang !== activeLocalLang;

  const homeFont = getFontFamilyForLanguage(activeUserLang);
  const localFont = getFontFamilyForLanguage(activeLocalLang);

  const userPhrases = tArray('cheatSheet.generalPhrases');
  const localPhrases = tLocalArray('cheatSheet.generalPhrases');

  const customCategories = useMemo(() => {
    const scenarioIds = new Set(SCENARIOS.map((s) => s.id));
    const seen = new Set<string>();
    const list: string[] = [];
    for (const w of wordsState.customWords) {
      const cat = (w.category || 'general').trim();
      if (cat && !scenarioIds.has(cat) && !seen.has(cat)) {
        seen.add(cat);
        list.push(cat);
      }
    }
    return list;
  }, [wordsState.customWords]);

  const selectedWordCategory = selectedScenarioId.startsWith('wordcat:')
    ? selectedScenarioId.slice('wordcat:'.length)
    : null;

  const scenariosInScope = useMemo(
    () =>
      selectedScenarioId === 'all' || selectedWordCategory
        ? SCENARIOS
        : SCENARIOS.filter((s) => s.id === selectedScenarioId),
    [selectedScenarioId, selectedWordCategory],
  );

  const { questionsToPrint, isFallbackQuestions } = useMemo(() => {
    if (isCustomActive && generatedScenario) {
      const chosen = generatedScenario.questions.filter((q) =>
        chosenQuestionIds.includes(q.id),
      );
      const list = chosen.length > 0 ? chosen.slice(0, 6) : generatedScenario.questions.slice(0, 6);
      return {
        questionsToPrint: list.map((q) => ({
          id: q.id,
          userText: q.userText,
          localText: q.localText,
        })),
        isFallbackQuestions: chosen.length === 0,
      };
    }

    const allQuestions = scenariosInScope.flatMap((s) => s.questions);
    const chosen = allQuestions.filter((q) => chosenQuestionIds.includes(q.id));
    const list = chosen.length > 0 ? chosen.slice(0, 6) : allQuestions.slice(0, 4);
    return {
      questionsToPrint: list.map((q) => ({
        id: q.id,
        userText: t(q.textKey),
        localText: tLocal(q.textKey),
      })),
      isFallbackQuestions: chosen.length === 0,
    };
  }, [isCustomActive, generatedScenario, scenariosInScope, chosenQuestionIds, t, tLocal]);

  const wordsToPrint = useMemo(() => {
    if (isCustomActive && generatedScenario) {
      return generatedScenario.words.slice(0, 12).map((w) => ({
        id: w.id,
        userText: w.userText,
        localText: w.localText,
      }));
    }

    const custom = wordsState.customWords
      .filter((w) => {
        if (selectedScenarioId === 'all') return true;
        if (selectedWordCategory) return (w.category || 'general') === selectedWordCategory;
        return w.category === selectedScenarioId || w.category === 'general';
      })
      .map((w) => ({
        id: w.id,
        userText: w.userWord,
        localText: w.localWord,
        known: w.known,
      }));

    const starter = selectedWordCategory
      ? []
      : scenariosInScope.flatMap((s) =>
          s.starterWords.map((w) => ({
            id: w.id,
            userText: t(w.textKey),
            localText: tLocal(w.textKey),
            known: wordsState.knownStarterIds.includes(w.id),
          })),
        );

    const combined = [...custom, ...starter].sort((a, b) => Number(a.known) - Number(b.known));
    return combined.slice(0, 12);
  }, [
    isCustomActive,
    generatedScenario,
    wordsState,
    scenariosInScope,
    selectedScenarioId,
    selectedWordCategory,
    t,
    tLocal,
  ]);

  const preferredLangForDesk =
    homeLanguageInfo.nativeName === homeLanguageInfo.englishName
      ? homeLanguageInfo.nativeName
      : `${homeLanguageInfo.nativeName} (${homeLanguageInfo.englishName})`;

  const formattedDate = formatIntlDate(homeLanguage);

  return (
    <div className="space-y-6">
      <div className="print:hidden mx-auto max-w-[210mm] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-50">
            {t('cheatSheet.title')}
          </h1>
          <p className="text-sm text-slate-300">{t('cheatSheet.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor={filterId} className="block text-xs font-medium text-slate-300">
              {t('cheatSheet.filterLabel')}
            </label>
            <select
              id={filterId}
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <option value="all">{t('cheatSheet.allVisits')}</option>
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.shortTitleKey)}
                </option>
              ))}
              {customCategories.map((cat) => (
                <option key={`wordcat:${cat}`} value={`wordcat:${cat}`}>
                  {cat === 'general' ? t('words.categoryGeneral') : cat}
                </option>
              ))}
              {customScenarios.map((sc) => (
                <option key={`scenario:${sc.id}`} value={`scenario:${sc.id}`}>
                  {sc.shortTitle}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('cheatSheet.printButton')}</span>
          </button>
        </div>
      </div>

      <article
        aria-label={t('cheatSheet.title')}
        className="print-bw mx-auto max-w-[210mm] rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 text-slate-100 space-y-5 print:max-w-none print:rounded-none print:border-0 print:p-0 print:space-y-4 print:text-black"
      >
        <header className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-slate-600 pb-3 print:border-black">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-50 print:text-black">
              {t('common.appName')} · {t('cheatSheet.title')}
            </h2>
            <p className="text-xs text-slate-300 print:text-black">
              {isCustomActive && generatedScenario
                ? generatedScenario.title
                : selectedWordCategory
                  ? selectedWordCategory === 'general'
                    ? t('words.categoryGeneral')
                    : selectedWordCategory
                  : selectedScenarioId === 'all'
                    ? t('cheatSheet.allVisits')
                    : t(SCENARIOS.find((s) => s.id === selectedScenarioId)?.titleKey ?? '')}
            </p>
          </div>
          <div className="text-end text-xs text-slate-300 print:text-black">
            {user && userProfile.displayName && (
              <p className="font-semibold">
                {t('cheatSheet.preparedFor', { name: userProfile.displayName })}
              </p>
            )}
            <p>{t('cheatSheet.createdOn', { date: formattedDate })}</p>
            <p className="text-[11px]">{t('home.helperNote')}</p>
          </div>
        </header>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide border-b border-slate-700 pb-1 print:border-black">
            {t('cheatSheet.sectionPhrases')}
          </h3>
          <ul className="space-y-2 text-xs">
            {userPhrases.map((phrase, idx) => (
              <li
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 leading-snug border-b border-slate-800/70 pb-1.5 print:border-slate-300"
              >
                <p
                  lang={homeLanguage}
                  dir={homeLanguageInfo.dir}
                  style={{ fontFamily: getFontFamilyForLanguage(homeLanguage) }}
                  className="font-semibold"
                >
                  {phrase}
                </p>
                {homeLanguage !== localLanguage && localPhrases[idx] && (
                  <p
                    lang={localLanguage}
                    dir={getLanguageDir(localLanguage)}
                    style={{ fontFamily: getFontFamilyForLanguage(localLanguage) }}
                    className="text-slate-300 print:text-black sm:border-s print:border-s sm:border-slate-800 print:border-slate-300 sm:ps-3 print:ps-3"
                  >
                    {localPhrases[idx]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 border-b border-slate-700 pb-1 print:border-black">
            <h3 className="text-sm font-bold uppercase tracking-wide">
              {t('cheatSheet.sectionQuestions')}
            </h3>
            {isFallbackQuestions && (
              <span className="text-[11px] text-slate-400 print:text-black">
                {t('cheatSheet.noChosenQuestionsNote')}
              </span>
            )}
          </div>
          <ul className="space-y-2 text-xs">
            {questionsToPrint.map((q) => (
              <li key={q.id} className="flex items-start gap-2 leading-snug">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-block h-3 w-3 shrink-0 border border-slate-300 print:border-black"
                />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3">
                  <p
                    lang={activeUserLang}
                    dir={activeUserInfo.dir}
                    style={{ fontFamily: homeFont }}
                    className="font-semibold"
                  >
                    {q.userText}
                  </p>
                  {showDualLanguage && (
                    <p
                      lang={activeLocalLang}
                      dir={activeLocalInfo.dir}
                      style={{ fontFamily: localFont }}
                      className="text-slate-300 print:text-black sm:border-s print:border-s sm:border-slate-800 print:border-slate-300 sm:ps-3 print:ps-3"
                    >
                      {q.localText}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide border-b border-slate-700 pb-1 print:border-black">
            {t('cheatSheet.sectionWords')}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {wordsToPrint.map((word) => (
              <li
                key={word.id}
                className="grid grid-cols-2 gap-3 leading-snug border-b border-slate-800 pb-1 print:border-slate-400"
              >
                <span
                  lang={activeUserLang}
                  dir={activeUserInfo.dir}
                  style={{ fontFamily: homeFont }}
                  className="font-semibold block"
                >
                  {word.userText}
                </span>
                {(showDualLanguage || word.userText !== word.localText) && (
                  <span
                    lang={activeLocalLang}
                    dir={activeLocalInfo.dir}
                    style={{ fontFamily: localFont }}
                    className="text-slate-300 print:text-black block border-s border-slate-800 print:border-slate-300 ps-3"
                  >
                    {word.localText}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-2 border-slate-500 p-4 space-y-2 print:border-black">
          <p className="text-[11px] font-bold uppercase tracking-wide">
            {t('cheatSheet.sectionInterpreter')}
          </p>
          <div
            lang={localLanguage}
            dir={getLanguageDir(localLanguage)}
            style={{ fontFamily: getFontFamilyForLanguage(localLanguage) }}
            className="space-y-1"
          >
            <p className="font-display text-lg font-bold leading-tight">
              {tLocal('interpreterCard.phraseText')}
            </p>
            <p className="text-xs font-medium">
              {tLocal('interpreterCard.preferredLangTemplate', {
                language: preferredLangForDesk,
              })}{' '}
              · {tLocal('interpreterCard.helperNoteText')}
            </p>
          </div>

          {homeLanguage !== localLanguage && (
            <div
              lang={homeLanguage}
              dir={homeLanguageInfo.dir}
              style={{ fontFamily: getFontFamilyForLanguage(homeLanguage) }}
              className="text-xs text-slate-200 print:text-black border-t border-slate-700 pt-1.5 print:border-black space-y-0.5"
            >
              <p className="font-semibold">{t('interpreterCard.phraseText')}</p>
              <p>
                {t('interpreterCard.preferredLangTemplate', {
                  language: homeLanguageInfo.nativeName,
                })}{' '}
                · {t('interpreterCard.helperNoteText')}
              </p>
            </div>
          )}

          <p className="text-[10px] text-slate-300 print:text-black pt-1">
            {isCustomActive ? t('ai.disclaimer') : t('interpreterCard.placeholderText')}
          </p>
        </section>
      </article>
    </div>
  );
};
