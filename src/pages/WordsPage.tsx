import React, { useId, useMemo, useState } from 'react';
import { Check, HelpCircle, Languages, Plus, Trash2 } from 'lucide-react';
import { BilingualPhrase } from '../components/BilingualPhrase';
import { SCENARIOS } from '../data/scenarios.js';
import { useAppState } from '../hooks/useAppState';
import { getFontFamilyForLanguage } from '../lib/fonts';
import { translateText } from '../lib/translator';
import { normalizeCategoryName } from '../lib/wordCategory';

interface WordEntry {
  id: string;
  isCustom: boolean;
  category: string;
  userText: string;
  localText: string;
  known: boolean;
}

interface WordExplanationState {
  loading: boolean;
  open: boolean;
  error?: string;
  meaningUser?: string;
  meaningEnglish?: string;
  exampleUser?: string;
  exampleEnglish?: string;
}

export const WordsPage: React.FC = () => {
  const {
    homeLanguage,
    localLanguage,
    homeLanguageInfo,
    localLanguageInfo,
    t,
    tLocal,
    translateCustomWord,
    wordsState,
    toggleStarterWordKnown,
    addCustomWord,
    toggleCustomWordKnown,
    removeCustomWord,
    knownWordsCount,
    totalWordsCount,
    syncError,
    getIdToken,
  } = useAppState();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [userWordInput, setUserWordInput] = useState('');
  const [localWordInput, setLocalWordInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('auto');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [formError, setFormError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [savingWord, setSavingWord] = useState(false);
  const [translatingWord, setTranslatingWord] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, WordExplanationState>>({});

  const userWordId = useId();
  const localWordId = useId();
  const categoryId = useId();
  const customCategoryId = useId();

  const allWords = useMemo<WordEntry[]>(() => {
    const customEntries: WordEntry[] = wordsState.customWords.map((w) => ({
      id: w.id,
      isCustom: true,
      category: w.category,
      userText: w.userWord,
      localText: w.localWord,
      known: w.known,
    }));

    const starterEntries: WordEntry[] = SCENARIOS.flatMap((scenario) =>
      scenario.starterWords.map((word) => ({
        id: word.id,
        isCustom: false,
        category: scenario.id,
        userText: t(word.textKey),
        localText: tLocal(word.textKey),
        known: wordsState.knownStarterIds.includes(word.id),
      })),
    );

    return [...customEntries, ...starterEntries];
  }, [wordsState, t, tLocal]);

  const dynamicCustomCategories = useMemo(() => {
    const scenarioIds = new Set(SCENARIOS.map((s) => s.id));
    const seen = new Set<string>();
    const list: string[] = [];
    for (const w of wordsState.customWords) {
      const cat = (w.category || 'general').trim();
      if (cat && !scenarioIds.has(cat) && cat !== 'general' && !seen.has(cat)) {
        seen.add(cat);
        list.push(cat);
      }
    }
    return list;
  }, [wordsState.customWords]);

  const hasGeneralCustomWords = useMemo(
    () => wordsState.customWords.some((w) => (w.category || 'general') === 'general'),
    [wordsState.customWords],
  );

  const visibleWords = useMemo(
    () =>
      filterCategory === 'all'
        ? allWords
        : allWords.filter((w) => w.category === filterCategory),
    [allWords, filterCategory],
  );

  const categoryLabel = (cat: string) => {
    const found = SCENARIOS.find((s) => s.id === cat);
    if (found) return t(found.shortTitleKey);
    if (!cat || cat === 'general') return t('words.categoryGeneral');
    return cat;
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = userWordInput.trim();
    const trimmedLocal = localWordInput.trim();

    if (!trimmedUser && !trimmedLocal) {
      setFormError(t('words.validationError'));
      return;
    }

    if (categoryInput === '__custom__' && !customCategoryInput.trim()) {
      setFormError('Please enter a category name or select Auto-detect.');
      return;
    }

    setFormError('');
    setSavedNotice('');
    setSavingWord(true);

    try {
      let finalUser = trimmedUser;
      let finalLocal = trimmedLocal;

      if (trimmedUser && !trimmedLocal) {
        if (homeLanguage === localLanguage) {
          finalLocal = trimmedUser;
        } else {
          try {
            finalLocal = await translateCustomWord(trimmedUser, homeLanguage, localLanguage);
          } catch {
            setFormError(t('words.translateError'));
            return;
          }
        }
      } else if (trimmedLocal && !trimmedUser) {
        if (homeLanguage === localLanguage) {
          finalUser = trimmedLocal;
        } else {
          try {
            finalUser = await translateCustomWord(trimmedLocal, localLanguage, homeLanguage);
          } catch {
            setFormError(t('words.translateError'));
            return;
          }
        }
      }

      const targetCategory =
        categoryInput === '__custom__'
          ? normalizeCategoryName(customCategoryInput)
          : categoryInput;

      const resolvedCategory = await addCustomWord(finalUser, finalLocal, targetCategory);

      setUserWordInput('');
      setLocalWordInput('');
      if (categoryInput === '__custom__') {
        setCustomCategoryInput('');
        setCategoryInput('auto');
      }
      setSavedNotice(`Saved "${finalUser}" under ${categoryLabel(resolvedCategory)}.`);
    } finally {
      setSavingWord(false);
    }
  };

  const handleTranslateInputWord = async () => {
    const trimmedUser = userWordInput.trim();
    const trimmedLocal = localWordInput.trim();
    if (!trimmedUser && !trimmedLocal) {
      setFormError(t('words.validationError'));
      return;
    }

    setFormError('');
    setTranslatingWord(true);
    try {
      if (trimmedUser && !trimmedLocal) {
        const translated = await translateCustomWord(trimmedUser, homeLanguage, localLanguage);
        setLocalWordInput(translated);
      } else if (trimmedLocal && !trimmedUser) {
        const translated = await translateCustomWord(trimmedLocal, localLanguage, homeLanguage);
        setUserWordInput(translated);
      } else {
        const translated = await translateCustomWord(trimmedUser, homeLanguage, localLanguage);
        setLocalWordInput(translated);
      }
    } catch {
      setFormError(t('words.translateError'));
    } finally {
      setTranslatingWord(false);
    }
  };

  const handleExplainWord = async (word: WordEntry) => {
    const existing = explanations[word.id];
    if (existing && existing.meaningUser && !existing.error) {
      setExplanations((prev) => ({
        ...prev,
        [word.id]: { ...existing, open: !existing.open },
      }));
      return;
    }

    setExplanations((prev) => ({
      ...prev,
      [word.id]: { loading: true, open: true },
    }));

    try {
      const token = await getIdToken();
      if (!token) {
        setExplanations((prev) => ({
          ...prev,
          [word.id]: {
            loading: false,
            open: true,
            error: t('ai.explainError'),
          },
        }));
        return;
      }
      const response = await fetch('/api/ai/explain-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wordUser: word.userText,
          wordEnglish: word.localText,
          languageCode: homeLanguage,
          languageName: `${homeLanguageInfo.englishName} (${homeLanguageInfo.nativeName})`,
          localLanguageCode: localLanguage,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (!data.error) {
          setExplanations((prev) => ({
            ...prev,
            [word.id]: {
              loading: false,
              open: true,
              meaningUser: data.meaningUser,
              meaningEnglish: data.meaningEnglish,
              exampleUser: data.exampleUser,
              exampleEnglish: data.exampleEnglish,
            },
          }));
          return;
        }
      }

      const baseTerm = word.localText || word.userText;
      const meaningTemplate = `You may hear or see "${baseTerm}" during your visit.`;
      const exampleTemplate = `Could you please explain "${baseTerm}" simply?`;

      const [meaningUser, meaningEnglish, exampleUser, exampleEnglish] = await Promise.all([
        homeLanguage === 'en'
          ? Promise.resolve(meaningTemplate)
          : translateText(meaningTemplate, homeLanguage, 'en'),
        localLanguage === 'en'
          ? Promise.resolve(meaningTemplate)
          : translateText(meaningTemplate, localLanguage, 'en'),
        homeLanguage === 'en'
          ? Promise.resolve(exampleTemplate)
          : translateText(exampleTemplate, homeLanguage, 'en'),
        localLanguage === 'en'
          ? Promise.resolve(exampleTemplate)
          : translateText(exampleTemplate, localLanguage, 'en'),
      ]);

      setExplanations((prev) => ({
        ...prev,
        [word.id]: {
          loading: false,
          open: true,
          meaningUser,
          meaningEnglish,
          exampleUser,
          exampleEnglish,
        },
      }));
    } catch {
      try {
        const baseTerm = word.localText || word.userText;
        const meaningTemplate = `You may hear or see "${baseTerm}" during your visit.`;
        const exampleTemplate = `Could you please explain "${baseTerm}" simply?`;

        const [meaningUser, meaningEnglish, exampleUser, exampleEnglish] = await Promise.all([
          homeLanguage === 'en'
            ? Promise.resolve(meaningTemplate)
            : translateText(meaningTemplate, homeLanguage, 'en'),
          localLanguage === 'en'
            ? Promise.resolve(meaningTemplate)
            : translateText(meaningTemplate, localLanguage, 'en'),
          homeLanguage === 'en'
            ? Promise.resolve(exampleTemplate)
            : translateText(exampleTemplate, homeLanguage, 'en'),
          localLanguage === 'en'
            ? Promise.resolve(exampleTemplate)
            : translateText(exampleTemplate, localLanguage, 'en'),
        ]);

        setExplanations((prev) => ({
          ...prev,
          [word.id]: {
            loading: false,
            open: true,
            meaningUser,
            meaningEnglish,
            exampleUser,
            exampleEnglish,
          },
        }));
      } catch {
        setExplanations((prev) => ({
          ...prev,
          [word.id]: {
            loading: false,
            open: true,
            error: t('ai.explainError'),
          },
        }));
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-50">
            {t('words.title')}
          </h1>
          <p className="text-sm font-medium text-slate-300 tabular-nums">
            {t('words.summaryCount', { known: knownWordsCount, total: totalWordsCount })}
          </p>
        </div>
        <p className="text-base text-slate-300">{t('words.subtitle')}</p>
        {syncError && (
          <p role="status" className="text-sm text-amber-300">
            {t(syncError)}
          </p>
        )}
      </div>

      <form
        onSubmit={handleAddWord}
        noValidate
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 space-y-4"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-50">{t('words.addHeading')}</h2>
          <p className="text-xs text-slate-400">{t('words.addHint')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor={userWordId} className="block text-sm font-medium text-slate-200">
              {t('words.yourWordLabel', { language: homeLanguageInfo.nativeName })}
            </label>
            <input
              id={userWordId}
              type="text"
              dir={homeLanguageInfo.dir}
              style={{ fontFamily: getFontFamilyForLanguage(homeLanguage) }}
              value={userWordInput}
              onChange={(e) => {
                setUserWordInput(e.target.value);
                if (formError) setFormError('');
              }}
              placeholder={t('words.yourWordPlaceholder')}
              className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={localWordId} className="block text-sm font-medium text-slate-200">
              {t('words.localWordLabel', { language: localLanguageInfo.nativeName })}
            </label>
            <input
              id={localWordId}
              type="text"
              dir={localLanguageInfo.dir}
              style={{ fontFamily: getFontFamilyForLanguage(localLanguage) }}
              value={localWordInput}
              onChange={(e) => {
                setLocalWordInput(e.target.value);
                if (formError) setFormError('');
              }}
              placeholder={t('words.localWordPlaceholder')}
              className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={categoryId} className="block text-sm font-medium text-slate-200">
              {t('words.categoryLabel')}
            </label>
            <select
              id={categoryId}
              value={categoryInput}
              onChange={(e) => {
                setCategoryInput(e.target.value);
                if (formError) setFormError('');
              }}
              className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <option value="auto">Auto-detect (creates new category)</option>
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.shortTitleKey)}
                </option>
              ))}
              {dynamicCustomCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="general">{t('words.categoryGeneral')}</option>
              <option value="__custom__">+ New custom category...</option>
            </select>
          </div>
        </div>

        {categoryInput === '__custom__' && (
          <div className="space-y-1.5">
            <label htmlFor={customCategoryId} className="block text-sm font-medium text-slate-200">
              New category name
            </label>
            <input
              id={customCategoryId}
              type="text"
              maxLength={32}
              value={customCategoryInput}
              onChange={(e) => {
                setCustomCategoryInput(e.target.value);
                if (formError) setFormError('');
              }}
              placeholder="e.g., Pharmacy, Housing, Dental"
              className="w-full sm:w-80 min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            />
          </div>
        )}

        {formError && (
          <p role="alert" className="text-sm font-medium text-rose-400">
            {formError}
          </p>
        )}

        {savedNotice && (
          <p role="status" className="text-sm font-medium text-teal-300">
            {savedNotice}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={savingWord}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{savingWord ? 'Saving...' : t('words.addButton')}</span>
          </button>

          {homeLanguage !== localLanguage && (
            <button
              type="button"
              disabled={translatingWord || savingWord}
              onClick={() => void handleTranslateInputWord()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <Languages className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
              <span>
                {translatingWord
                  ? t('common.translatingWord')
                  : t('common.translateWordButton')}
              </span>
            </button>
          )}
        </div>
      </form>

      <div
        role="group"
        aria-label={t('words.categoryLabel')}
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1 w-fit"
      >
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          aria-pressed={filterCategory === 'all'}
          className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
            filterCategory === 'all'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          {t('words.filterAll')}
        </button>

        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setFilterCategory(s.id)}
            aria-pressed={filterCategory === s.id}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
              filterCategory === s.id
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t(s.shortTitleKey)}
          </button>
        ))}

        {dynamicCustomCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            aria-pressed={filterCategory === cat}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
              filterCategory === cat
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}

        {hasGeneralCustomWords && (
          <button
            type="button"
            onClick={() => setFilterCategory('general')}
            aria-pressed={filterCategory === 'general'}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
              filterCategory === 'general'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t('words.categoryGeneral')}
          </button>
        )}
      </div>

      {visibleWords.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          {t('words.emptyState')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleWords.map((word) => {
            const explain = explanations[word.id];
            return (
              <li
                key={word.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400">
                    {categoryLabel(word.category)}
                  </p>

                  <BilingualPhrase
                    userText={word.userText}
                    localText={word.localText}
                    userLang={homeLanguage}
                    localLang={localLanguage}
                    homeLabel={homeLanguageInfo.nativeName}
                    localLabel={localLanguageInfo.nativeName}
                  />
                </div>

                {explain?.open && (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3.5 space-y-2.5 text-sm">
                    {explain.loading ? (
                      <p className="text-slate-300">{t('ai.explaining')}</p>
                    ) : explain.error ? (
                      <p role="alert" className="text-rose-400">
                        {explain.error}
                      </p>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-teal-300">
                            {t('ai.meaningLabel')}
                          </p>
                          <p
                            lang={homeLanguage}
                            dir={homeLanguageInfo.dir}
                            style={{ fontFamily: getFontFamilyForLanguage(homeLanguage) }}
                            className="text-slate-100 leading-snug"
                          >
                            {explain.meaningUser}
                          </p>
                          {homeLanguage !== localLanguage && explain.meaningEnglish && (
                            <p
                              lang={localLanguage}
                              dir={localLanguageInfo.dir}
                              style={{ fontFamily: getFontFamilyForLanguage(localLanguage) }}
                              className="text-xs text-slate-300 leading-snug"
                            >
                              {explain.meaningEnglish}
                            </p>
                          )}
                        </div>

                        {explain.exampleUser && (
                          <div className="space-y-1 border-t border-slate-800 pt-2">
                            <p className="text-xs font-semibold text-slate-400">
                              {t('ai.exampleLabel')}
                            </p>
                            <p
                              lang={homeLanguage}
                              dir={homeLanguageInfo.dir}
                              style={{ fontFamily: getFontFamilyForLanguage(homeLanguage) }}
                              className="text-slate-200 leading-snug"
                            >
                              {explain.exampleUser}
                            </p>
                            {homeLanguage !== localLanguage && explain.exampleEnglish && (
                              <p
                                lang={localLanguage}
                                dir={localLanguageInfo.dir}
                                style={{ fontFamily: getFontFamilyForLanguage(localLanguage) }}
                                className="text-xs text-slate-400 leading-snug"
                              >
                                {explain.exampleEnglish}
                              </p>
                            )}
                          </div>
                        )}

                        <p className="border-t border-slate-800 pt-2 text-[11px] text-slate-400 leading-snug">
                          {t('ai.disclaimer')}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        word.isCustom
                          ? toggleCustomWordKnown(word.id)
                          : toggleStarterWordKnown(word.id)
                      }
                      aria-pressed={word.known}
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
                        word.known
                          ? 'bg-teal-700 text-white hover:bg-teal-600'
                          : 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
                      }`}
                    >
                      <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{word.known ? t('words.knownState') : t('words.knowNow')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleExplainWord(word)}
                      aria-expanded={!!explain?.open}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs font-semibold text-teal-300 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                    >
                      <HelpCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>
                        {explain?.open ? t('ai.hideExplanation') : t('ai.explainSimply')}
                      </span>
                    </button>
                  </div>

                  {word.isCustom && (
                    <button
                      type="button"
                      onClick={() => {
                        const remainingInCategory = wordsState.customWords.filter(
                          (w) => w.id !== word.id && w.category === word.category,
                        ).length;
                        removeCustomWord(word.id);
                        if (
                          filterCategory === word.category &&
                          remainingInCategory === 0 &&
                          !SCENARIOS.some((s) => s.id === word.category)
                        ) {
                          setFilterCategory('all');
                        }
                      }}
                      aria-label={`${t('words.removeWord')}: ${word.userText}`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
