import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, IdCard, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ScenarioIcon } from '../components/ScenarioIcon';
import { StepCard } from '../components/StepCard';
import { getScenarioById } from '../data/scenarios.js';
import { useAppState } from '../hooks/useAppState';
import { getLanguageInfo } from '../locales/languages';

export const ScenarioPage: React.FC = () => {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const {
    homeLanguage,
    localLanguage,
    t,
    tLocal,
    tArray,
    tLocalArray,
    customScenarios,
    removeCustomScenario,
    authLoading,
    isSyncing,
    syncError,
  } = useAppState();

  const defaultScenario = getScenarioById(scenarioId);
  const customScenario = !defaultScenario
    ? customScenarios.find((s) => s.id === scenarioId)
    : undefined;

  const [stepIndex, setStepIndex] = useState(0);
  const [showHelperEnglish, setShowHelperEnglish] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setStepIndex(0);
    setCheckedItems({});
  }, [scenarioId]);

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

  const steps = customScenario
    ? customScenario.steps.map((s) => ({
        id: s.id,
        title: s.title,
        localTitle: s.titleEnglish,
        body: s.body,
        localBody: s.bodyEnglish,
        tip: s.tip,
        localTip: s.tipEnglish,
        checklistItems: s.items ?? [],
      }))
    : defaultScenario!.steps.map((s) => {
        const userItems = s.itemsKey ? tArray(s.itemsKey) : [];
        const localItems = s.itemsKey ? tLocalArray(s.itemsKey) : [];
        return {
          id: s.id,
          title: t(s.titleKey),
          localTitle: tLocal(s.titleKey),
          body: t(s.bodyKey),
          localBody: tLocal(s.bodyKey),
          tip: s.tipKey ? t(s.tipKey) : undefined,
          localTip: s.tipKey ? tLocal(s.tipKey) : undefined,
          checklistItems: userItems.map((userText, idx) => ({
            userText,
            localText: localItems[idx],
          })),
        };
      });

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex] ?? steps[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const canShowHelperToggle = activeUserLang !== activeLocalLang;

  const title = customScenario ? customScenario.title : t(defaultScenario!.titleKey);
  const showHealthDisclaimer = Boolean(
    defaultScenario?.disclaimerKey || customScenario?.isHealthRelated,
  );
  const healthDisclaimerText = defaultScenario?.disclaimerKey
    ? t(defaultScenario.disclaimerKey)
    : t('scenarios.clinic.disclaimer');

  const toggleItem = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleDeleteCustom = async () => {
    if (!customScenario) return;
    await removeCustomScenario(customScenario.id);
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            <span>{t('nav.home')}</span>
          </Link>

          {isCustom && (
            <button
              type="button"
              onClick={() => void handleDeleteCustom()}
              aria-label={`${t('words.removeWord')}: ${title}`}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t('words.removeWord')}</span>
            </button>
          )}
        </div>

        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-teal-300">
            {isCustom ? (
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            ) : (
              <ScenarioIcon icon={defaultScenario!.icon} className="w-6 h-6" />
            )}
          </span>
          <div>
            <h1
              lang={activeUserLang}
              dir={activeUserInfo.dir}
              className="font-display text-2xl sm:text-3xl font-semibold text-slate-50"
            >
              {title}
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-400 tabular-nums">
              {t('common.stepCounter', { current: stepIndex + 1, total: totalSteps })}
            </p>
          </div>
        </div>

        {isCustom && (
          <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs sm:text-sm text-slate-300">
            {t('ai.disclaimer')}
          </p>
        )}

        {showHealthDisclaimer && (
          <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {healthDisclaimerText}
          </p>
        )}

        {isCustom && syncError && (
          <p role="status" className="text-sm text-amber-300">
            {t(syncError)}
          </p>
        )}
      </div>

      <nav aria-label="Walkthrough steps" className="grid grid-cols-4 gap-2">
        {steps.map((step, idx) => {
          const isCurrent = idx === stepIndex;
          const isCompleted = idx < stepIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setStepIndex(idx)}
              aria-current={isCurrent ? 'step' : undefined}
              className={`min-h-[44px] rounded-xl border px-2 py-2 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
                isCurrent
                  ? 'border-teal-600 bg-teal-700 text-white'
                  : isCompleted
                    ? 'border-teal-800 bg-teal-950/70 text-teal-200 hover:bg-teal-900/60'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="block text-[11px] font-semibold tabular-nums opacity-85">
                0{idx + 1}
              </span>
              <span lang={activeUserLang} className="block truncate text-xs font-medium">
                {step.title}
              </span>
            </button>
          );
        })}
      </nav>

      {currentStep && (
        <StepCard
          stepId={`${activeId}-${currentStep.id}`}
          title={currentStep.title}
          localTitle={currentStep.localTitle}
          body={currentStep.body}
          localBody={currentStep.localBody}
          tip={currentStep.tip}
          localTip={currentStep.localTip}
          checklistHeading={t('walkthrough.checklistHeading')}
          checklistItems={currentStep.checklistItems}
          checkedMap={checkedItems}
          onToggleChecklistItem={toggleItem}
          showHelperToggle={canShowHelperToggle}
          helperToggleLabel={t('walkthrough.helperViewToggle')}
          showHelperEnglish={showHelperEnglish}
          onToggleHelperEnglish={() => setShowHelperEnglish((prev) => !prev)}
          userLang={activeUserLang}
          localLang={activeLocalLang}
        />
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => (isFirstStep ? navigate('/') : setStepIndex((i) => i - 1))}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
          <span>{t('common.back')}</span>
        </button>

        {!isLastStep ? (
          <button
            type="button"
            onClick={() => setStepIndex((i) => i + 1)}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <span>{t('common.next')}</span>
            <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              to="/interpreter-card"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <IdCard className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
              <span>{t('walkthrough.openInterpreterCard')}</span>
            </Link>
            <Link
              to={`/questions/${encodeURIComponent(activeId)}`}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t('walkthrough.goToQuestions')}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
