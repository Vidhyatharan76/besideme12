import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { SCENARIOS } from '../data/scenarios.js';
import { ensureScriptFontLoaded } from '../lib/fonts';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  deleteCustomScenarioSupabase,
  deleteCustomWordSupabase,
  ensureSupabaseUserRow,
  fetchUserPrepDataSupabase,
  resetUserPrepDataSupabase,
  setCustomWordKnownSupabase,
  setQuestionProgressSupabase,
  setStarterWordKnownSupabase,
  syncLocalPrepToSupabase,
  updateUserLanguagesSupabase,
  updateUserProfileSupabase,
  upsertCustomScenarioSupabase,
  upsertCustomWordSupabase,
  type CustomScenario,
} from '../lib/supabasePrep';
import { translateText } from '../lib/translator';
import { inferWordCategoryFallback, normalizeCategoryName } from '../lib/wordCategory';
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  DEFAULT_LOCAL_LANGUAGE,
  LOCALES,
  resolveTranslation,
  resolveTranslationArray,
  type AvailableLanguageOption,
} from '../locales';
import { getLanguageDir, isAllowedLanguageCode } from '../locales/languages';
import { useLocalStorage } from './useLocalStorage';
import { useLanguageTranslations } from './useTranslation';

export interface CustomWord {
  id: string;
  userWord: string;
  localWord: string;
  category: string;
  known: boolean;
}

export interface StoredWordsState {
  knownStarterIds: string[];
  customWords: CustomWord[];
}

export interface UserProfile {
  displayName: string;
  familyRole: 'parent' | 'teen_helper' | 'together';
  focusVisits: string[];
  onboardingCompleted: boolean;
}

export type { CustomScenario };

interface RemotePrepPayload {
  preferredLanguage: string;
  localLanguage?: string;
  profile?: UserProfile;
  knownStarterIds: string[];
  customWords: CustomWord[];
  customScenarios?: CustomScenario[];
  practicedQuestionIds: string[];
  chosenQuestionIds: string[];
}

interface AppStateContextValue {
  homeLanguage: string;
  localLanguage: string;
  language: string;
  homeLanguageInfo: AvailableLanguageOption;
  localLanguageInfo: AvailableLanguageOption;
  availableLanguages: AvailableLanguageOption[];
  setHomeLanguage: (code: string) => void;
  setLocalLanguage: (code: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tHome: (key: string, vars?: Record<string, string | number>) => string;
  tLocal: (key: string, vars?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
  tHomeArray: (key: string) => string[];
  tLocalArray: (key: string) => string[];
  isHomeMachineTranslated: boolean;
  isLocalMachineTranslated: boolean;
  isAnyMachineTranslated: boolean;
  isTranslating: boolean;
  translationOfflineFallback: boolean;
  translateCustomWord: (
    text: string,
    sourceLang: string,
    targetLang: string,
  ) => Promise<string>;
  wordsState: StoredWordsState;
  toggleStarterWordKnown: (id: string) => void;
  addCustomWord: (userWord: string, localWord: string, category?: string) => Promise<string>;
  toggleCustomWordKnown: (id: string) => void;
  removeCustomWord: (id: string) => void;
  saveWordsBatchToLocal: (
    items: Array<{ userWord: string; localWord: string; category?: string }>,
  ) => Promise<void>;
  customScenarios: CustomScenario[];
  saveCustomScenario: (scenario: CustomScenario) => Promise<void>;
  removeCustomScenario: (id: string) => Promise<void>;
  practicedQuestionIds: string[];
  togglePracticedQuestion: (id: string) => void;
  chosenQuestionIds: string[];
  toggleChosenQuestion: (id: string) => void;
  totalStarterWordsCount: number;
  totalQuestionsCount: number;
  knownWordsCount: number;
  totalWordsCount: number;
  hasAnySavedProgress: boolean;
  resetAllData: () => void;
  user: User | null;
  authLoading: boolean;
  isSigningIn: boolean;
  authError: string | null;
  authErrorVars?: Record<string, string | number>;
  isSyncing: boolean;
  syncError: string | null;
  userProfile: UserProfile;
  isAccountModalOpen: boolean;
  isFirstTimeOnboarding: boolean;
  openAccountSetup: () => void;
  closeAccountSetup: () => void;
  saveAccountProfile: (patch: {
    displayName: string;
    familyRole: 'parent' | 'teen_helper' | 'together';
    focusVisits: string[];
    homeLanguage: string;
    localLanguage: string;
    onboardingCompleted?: boolean;
  }) => Promise<void>;
  getIdToken: () => Promise<string | null>;
  signInWithEmail: (email: string, pass: string) => Promise<boolean>;
  signUpWithEmail: (email: string, pass: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const INITIAL_WORDS_STATE: StoredWordsState = {
  knownStarterIds: [],
  customWords: [],
};

const INITIAL_PROFILE: UserProfile = {
  displayName: '',
  familyRole: 'parent',
  focusVisits: [],
  onboardingCompleted: false,
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function isValidAppLang(code: string): boolean {
  return isAllowedLanguageCode(code) || Boolean(LOCALES[code]);
}

function getInitialLegacyHomeLang(): string {
  try {
    if (typeof window !== 'undefined') {
      const legacy = window.localStorage.getItem('besideMe_lang');
      if (legacy) {
        const parsed = JSON.parse(legacy) as string;
        if (typeof parsed === 'string' && isValidAppLang(parsed)) {
          return parsed;
        }
      }
    }
  } catch {
  }
  return DEFAULT_LANGUAGE;
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawHomeLang, setRawHomeLang] = useLocalStorage<string>(
    'besideMe_homeLang',
    getInitialLegacyHomeLang(),
  );
  const [rawLocalLang, setRawLocalLang] = useLocalStorage<string>(
    'besideMe_localLang',
    DEFAULT_LOCAL_LANGUAGE,
  );

  const homeLanguage = isValidAppLang(rawHomeLang) ? rawHomeLang : DEFAULT_LANGUAGE;
  const localLanguage = isValidAppLang(rawLocalLang) ? rawLocalLang : DEFAULT_LOCAL_LANGUAGE;

  const [wordsState, setWordsState] = useLocalStorage<StoredWordsState>(
    'besideMe_words',
    INITIAL_WORDS_STATE,
  );
  const [practicedQuestionIds, setPracticedQuestionIds] = useLocalStorage<string[]>(
    'besideMe_practicedQuestions',
    [],
  );
  const [chosenQuestionIds, setChosenQuestionIds] = useLocalStorage<string[]>(
    'besideMe_chosenQuestions',
    [],
  );

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorVars, setAuthErrorVars] = useState<Record<string, string | number> | undefined>(
    undefined,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [customScenarios, setCustomScenarios] = useState<CustomScenario[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isFirstTimeOnboarding, setIsFirstTimeOnboarding] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.removeItem('besideMe_generatedScenario');
    } catch {
    }
  }, []);

  const homeTranslation = useLanguageTranslations(homeLanguage);
  const localTranslation = useLanguageTranslations(localLanguage);

  const idTokenRef = useRef<string | null>(null);
  const syncedUidRef = useRef<string | null>(null);

  const latestLocalRef = useRef<RemotePrepPayload>({
    preferredLanguage: homeLanguage,
    localLanguage,
    knownStarterIds: wordsState.knownStarterIds,
    customWords: wordsState.customWords,
    practicedQuestionIds,
    chosenQuestionIds,
  });

  useEffect(() => {
    latestLocalRef.current = {
      preferredLanguage: homeLanguage,
      localLanguage,
      knownStarterIds: wordsState.knownStarterIds,
      customWords: wordsState.customWords,
      practicedQuestionIds,
      chosenQuestionIds,
    };
  }, [homeLanguage, localLanguage, wordsState, practicedQuestionIds, chosenQuestionIds]);

  const homeLanguageInfo: AvailableLanguageOption = useMemo(
    () =>
      AVAILABLE_LANGUAGES.find((item) => item.code === homeLanguage) ??
      AVAILABLE_LANGUAGES[0],
    [homeLanguage],
  );

  const localLanguageInfo: AvailableLanguageOption = useMemo(
    () =>
      AVAILABLE_LANGUAGES.find((item) => item.code === localLanguage) ??
      AVAILABLE_LANGUAGES[0],
    [localLanguage],
  );

  useEffect(() => {
    document.documentElement.lang = homeLanguage;
    document.documentElement.dir = getLanguageDir(homeLanguage);

    const homeFont = ensureScriptFontLoaded(homeLanguage);
    const localFont = ensureScriptFontLoaded(localLanguage);
    document.documentElement.style.setProperty('--font-home-script', homeFont);
    document.documentElement.style.setProperty('--font-local-script', localFont);
  }, [homeLanguage, localLanguage]);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    idTokenRef.current = token;
    return token;
  }, []);

  const authedFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const freshToken = await getIdToken();
    if (!freshToken) return null;

    const response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
        Authorization: `Bearer ${freshToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    return response.json();
  }, [getIdToken]);

  const applyRemotePayload = useCallback(
    (remote: RemotePrepPayload, fallbackDisplayName?: string | null) => {
      if (remote.preferredLanguage && isValidAppLang(remote.preferredLanguage)) {
        setRawHomeLang(remote.preferredLanguage);
      }
      if (remote.localLanguage && isValidAppLang(remote.localLanguage)) {
        setRawLocalLang(remote.localLanguage);
      }
      setWordsState({
        knownStarterIds: Array.isArray(remote.knownStarterIds) ? remote.knownStarterIds : [],
        customWords: Array.isArray(remote.customWords) ? remote.customWords : [],
      });
      setCustomScenarios(
        Array.isArray(remote.customScenarios) ? remote.customScenarios : [],
      );
      setPracticedQuestionIds(
        Array.isArray(remote.practicedQuestionIds) ? remote.practicedQuestionIds : [],
      );
      setChosenQuestionIds(
        Array.isArray(remote.chosenQuestionIds) ? remote.chosenQuestionIds : [],
      );

      const remoteProfile = remote.profile;
      const role =
        remoteProfile?.familyRole === 'teen_helper' || remoteProfile?.familyRole === 'together'
          ? remoteProfile.familyRole
          : 'parent';
      const normalizedProfile: UserProfile = {
        displayName: remoteProfile?.displayName || fallbackDisplayName || '',
        familyRole: role,
        focusVisits: Array.isArray(remoteProfile?.focusVisits) ? remoteProfile.focusVisits : [],
        onboardingCompleted: Boolean(remoteProfile?.onboardingCompleted),
      };
      setUserProfile(normalizedProfile);

      if (!normalizedProfile.onboardingCompleted) {
        setIsFirstTimeOnboarding(true);
        setIsAccountModalOpen(true);
      }
    },
    [
      setRawHomeLang,
      setRawLocalLang,
      setWordsState,
      setPracticedQuestionIds,
      setChosenQuestionIds,
    ],
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      idTokenRef.current = session?.access_token ?? null;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        idTokenRef.current = session?.access_token ?? null;
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setSyncError(null);

        if (!nextUser) {
          syncedUidRef.current = null;
          setUserProfile(INITIAL_PROFILE);
          setCustomScenarios([]);
          setIsAccountModalOpen(false);
          setIsFirstTimeOnboarding(false);
          setAuthLoading(false);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      syncedUidRef.current = null;
      return;
    }
    if (syncedUidRef.current === user.id) {
      return;
    }
    let cancelled = false;

    async function syncAfterAuth(activeUser: User) {
      try {
        setIsSyncing(true);
        setSyncError(null);

        const local = latestLocalRef.current;
        const hasLocal =
          local.knownStarterIds.length > 0 ||
          local.customWords.length > 0 ||
          local.practicedQuestionIds.length > 0 ||
          local.chosenQuestionIds.length > 0;

        const fallbackName =
          activeUser.user_metadata?.full_name ||
          activeUser.user_metadata?.name ||
          activeUser.email ||
          '';

        let remote: RemotePrepPayload | null = null;

        if (isSupabaseConfigured) {
          await supabase.auth.getSession();
          const safeLocalLang = local.localLanguage ?? 'en';
          await ensureSupabaseUserRow(
            activeUser.id,
            activeUser.email ?? '',
            fallbackName || null,
            local.preferredLanguage,
            safeLocalLang,
          );
          if (hasLocal) {
            await syncLocalPrepToSupabase(activeUser.id, {
              ...local,
              localLanguage: safeLocalLang,
            });
          }
          const sbRemote = await fetchUserPrepDataSupabase(activeUser.id);
          const role =
            sbRemote.profile.familyRole === 'teen_helper' ||
            sbRemote.profile.familyRole === 'together'
              ? sbRemote.profile.familyRole
              : 'parent';
          remote = {
            ...sbRemote,
            profile: {
              ...sbRemote.profile,
              familyRole: role,
            },
          };
        } else {
          remote = (await (hasLocal
            ? authedFetch('/api/prep/sync', {
                method: 'PUT',
                body: JSON.stringify(local),
              })
            : authedFetch('/api/prep'))) as RemotePrepPayload | null;
        }

        if (cancelled) return;

        if (remote) {
          if (
            !remote.profile?.onboardingCompleted &&
            remote.preferredLanguage === 'en' &&
            local.preferredLanguage !== 'en'
          ) {
            remote.preferredLanguage = local.preferredLanguage;
          }
          if (
            !remote.profile?.onboardingCompleted &&
            (!remote.localLanguage || remote.localLanguage === 'en') &&
            local.localLanguage !== 'en'
          ) {
            remote.localLanguage = local.localLanguage;
          }
          syncedUidRef.current = activeUser.id;
          applyRemotePayload(remote, fallbackName);
        } else {
          syncedUidRef.current = activeUser.id;
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Sync failed after sign-in:', JSON.stringify(err, null, 2), err);
        setSyncError('auth.syncError');
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
          setAuthLoading(false);
        }
      }
    }

    void syncAfterAuth(user);

    return () => {
      cancelled = true;
    };
  }, [user, authedFetch, applyRemotePayload]);

  const signInWithEmail = useCallback(async (email: string, pass: string): Promise<boolean> => {
    setSyncError(null);
    setAuthError(null);
    setAuthErrorVars(undefined);
    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      console.error('Email sign-in failed:', err);
      const rawMessage = err instanceof Error ? err.message : 'Sign-in failed';
      let message = rawMessage;
      if (rawMessage.toLowerCase().includes('seconds') || rawMessage.toLowerCase().includes('security purposes')) {
        message = 'Too many attempts. Please wait a moment before trying again.';
      }
      setAuthError('auth.signInFailedError');
      setAuthErrorVars({ code: message });
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string): Promise<boolean> => {
    setSyncError(null);
    setAuthError(null);
    setAuthErrorVars(undefined);
    setIsSigningIn(true);
    try {
      const trimmedEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: pass,
      });
      if (error) throw error;

      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: pass,
        });
        if (signInError) throw signInError;
      }
      return true;
    } catch (err: unknown) {
      console.error('Email sign-up failed:', err);
      const rawMessage = err instanceof Error ? err.message : 'Sign-up failed';
      let message = rawMessage;
      if (rawMessage.toLowerCase().includes('seconds') || rawMessage.toLowerCase().includes('security purposes')) {
        message = 'Too many attempts. Please wait a moment before trying again.';
      }
      setAuthError('auth.signInFailedError');
      setAuthErrorVars({ code: message });
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setSyncError(null);
    setAuthError(null);
    setAuthErrorVars(undefined);
    try {
      await supabase.auth.signOut();
      idTokenRef.current = null;
      syncedUidRef.current = null;
      setUserProfile(INITIAL_PROFILE);
      setCustomScenarios([]);
      setIsAccountModalOpen(false);
      setIsFirstTimeOnboarding(false);
      setWordsState(INITIAL_WORDS_STATE);
      setPracticedQuestionIds([]);
      setChosenQuestionIds([]);
      try {
        window.localStorage.removeItem('besideMe_generatedScenario');
      } catch {
      }
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  }, [setWordsState, setPracticedQuestionIds, setChosenQuestionIds]);

  const openAccountSetup = useCallback(() => {
    setIsFirstTimeOnboarding(false);
    setIsAccountModalOpen(true);
  }, []);

  const closeAccountSetup = useCallback(() => {
    setIsAccountModalOpen(false);
  }, []);

  const saveAccountProfile = useCallback(
    async (patch: {
      displayName: string;
      familyRole: 'parent' | 'teen_helper' | 'together';
      focusVisits: string[];
      homeLanguage: string;
      localLanguage: string;
      onboardingCompleted?: boolean;
    }) => {
      if (isValidAppLang(patch.homeLanguage)) {
        setRawHomeLang(patch.homeLanguage);
      }
      if (isValidAppLang(patch.localLanguage)) {
        setRawLocalLang(patch.localLanguage);
      }

      const nextProfile: UserProfile = {
        displayName: patch.displayName.trim(),
        familyRole: patch.familyRole,
        focusVisits: patch.focusVisits,
        onboardingCompleted: patch.onboardingCompleted ?? true,
      };
      setUserProfile(nextProfile);

      if (user) {
        let updated: RemotePrepPayload | null = null;
        if (isSupabaseConfigured) {
          const sbUpdated = await updateUserProfileSupabase(user.id, {
            displayName: nextProfile.displayName,
            familyRole: nextProfile.familyRole,
            focusVisits: nextProfile.focusVisits,
            homeLanguage: patch.homeLanguage,
            localLanguage: patch.localLanguage,
            onboardingCompleted: nextProfile.onboardingCompleted,
          });
          const role =
            sbUpdated.profile.familyRole === 'teen_helper' ||
            sbUpdated.profile.familyRole === 'together'
              ? sbUpdated.profile.familyRole
              : 'parent';
          updated = {
            ...sbUpdated,
            profile: { ...sbUpdated.profile, familyRole: role },
          };
        } else {
          updated = (await authedFetch('/api/prep/profile', {
            method: 'PATCH',
            body: JSON.stringify({
              displayName: nextProfile.displayName,
              familyRole: nextProfile.familyRole,
              focusVisits: nextProfile.focusVisits,
              homeLanguage: patch.homeLanguage,
              localLanguage: patch.localLanguage,
              onboardingCompleted: nextProfile.onboardingCompleted,
            }),
          })) as RemotePrepPayload | null;
        }

        if (updated?.profile) {
          applyRemotePayload(updated);
        }
      }

      setIsFirstTimeOnboarding(false);
      setIsAccountModalOpen(false);
    },
    [user, setRawHomeLang, setRawLocalLang, authedFetch, applyRemotePayload],
  );

  const persistRemote = useCallback(
    async (task: () => Promise<unknown>) => {
      if (!user) return;
      try {
        setSyncError(null);
        await task();
      } catch (err) {
        console.error('Background sync error:', err);
        setSyncError('auth.syncError');
      }
    },
    [user],
  );

  const setHomeLanguage = useCallback(
    (code: string) => {
      if (!isValidAppLang(code)) return;
      setRawHomeLang(code);
      void persistRemote(() =>
        isSupabaseConfigured && user
          ? updateUserLanguagesSupabase(user.id, code, localLanguage)
          : authedFetch('/api/prep/language', {
              method: 'PATCH',
              body: JSON.stringify({ homeLanguage: code, localLanguage }),
            }),
      );
    },
    [user, setRawHomeLang, localLanguage, persistRemote, authedFetch],
  );

  const setLocalLanguage = useCallback(
    (code: string) => {
      if (!isValidAppLang(code)) return;
      setRawLocalLang(code);
      void persistRemote(() =>
        isSupabaseConfigured && user
          ? updateUserLanguagesSupabase(user.id, homeLanguage, code)
          : authedFetch('/api/prep/language', {
              method: 'PATCH',
              body: JSON.stringify({ homeLanguage, localLanguage: code }),
            }),
      );
    },
    [user, setRawLocalLang, homeLanguage, persistRemote, authedFetch],
  );

  const tHome = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      resolveTranslation(homeLanguage, key, vars, homeTranslation.overrides),
    [homeLanguage, homeTranslation.overrides],
  );

  const tLocal = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      resolveTranslation(localLanguage, key, vars, localTranslation.overrides),
    [localLanguage, localTranslation.overrides],
  );

  const tHomeArray = useCallback(
    (key: string) => resolveTranslationArray(homeLanguage, key, homeTranslation.overrides),
    [homeLanguage, homeTranslation.overrides],
  );

  const tLocalArray = useCallback(
    (key: string) => resolveTranslationArray(localLanguage, key, localTranslation.overrides),
    [localLanguage, localTranslation.overrides],
  );

  const translateCustomWord = useCallback(
    async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
      const trimmed = text.trim();
      if (!trimmed) {
        throw new Error('Please enter a word or phrase.');
      }
      const translated = await translateText(trimmed, targetLang, sourceLang);
      if (!translated) {
        throw new Error('Could not translate word.');
      }
      return translated;
    },
    [],
  );

  const toggleStarterWordKnown = useCallback(
    (id: string) => {
      const nextKnown = !wordsState.knownStarterIds.includes(id);
      setWordsState((prev) => {
        const exists = prev.knownStarterIds.includes(id);
        return {
          ...prev,
          knownStarterIds: exists
            ? prev.knownStarterIds.filter((item) => item !== id)
            : [...prev.knownStarterIds, id],
        };
      });

      void persistRemote(() =>
        isSupabaseConfigured && user
          ? setStarterWordKnownSupabase(user.id, id, nextKnown)
          : authedFetch(`/api/prep/starter-words/${encodeURIComponent(id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ known: nextKnown }),
            }),
      );
    },
    [user, wordsState.knownStarterIds, setWordsState, persistRemote, authedFetch],
  );

  const addCustomWord = useCallback(
    async (userWord: string, localWord: string, category = 'auto'): Promise<string> => {
      const trimmedUser = userWord.trim();
      const trimmedLocal = localWord.trim();
      if (!trimmedUser || !trimmedLocal) return 'general';

      const existingCustomCategories = Array.from(
        new Set(wordsState.customWords.map((w) => w.category).filter(Boolean)),
      );

      let resolvedCategory = 'general';
      if (!category || category === 'auto') {
        let aiCategory: string | null = null;
        try {
          const token = await getIdToken();
          if (token) {
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 5000);
            try {
              const resp = await fetch('/api/ai/categorize-word', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  userWord: trimmedUser,
                  localWord: trimmedLocal,
                  existingCategories: existingCustomCategories,
                }),
                signal: controller.signal,
              });
              const contentType = resp.headers.get('content-type') || '';
              if (resp.ok && contentType.includes('application/json')) {
                const data = (await resp.json()) as { category?: string };
                if (typeof data.category === 'string' && data.category.trim()) {
                  aiCategory = normalizeCategoryName(data.category);
                }
              }
            } finally {
              window.clearTimeout(timeoutId);
            }
          }
        } catch {
        }

        resolvedCategory =
          aiCategory ??
          normalizeCategoryName(
            inferWordCategoryFallback(trimmedUser, trimmedLocal, existingCustomCategories),
          );
      } else {
        resolvedCategory = normalizeCategoryName(category);
      }

      const newWord: CustomWord = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userWord: trimmedUser,
        localWord: trimmedLocal,
        category: resolvedCategory,
        known: false,
      };

      setWordsState((prev) => ({
        ...prev,
        customWords: [newWord, ...prev.customWords],
      }));

      await persistRemote(() =>
        isSupabaseConfigured && user
          ? upsertCustomWordSupabase(user.id, newWord)
          : authedFetch('/api/prep/words', {
              method: 'POST',
              body: JSON.stringify(newWord),
            }),
      );

      return resolvedCategory;
    },
    [user, wordsState.customWords, setWordsState, getIdToken, persistRemote, authedFetch],
  );

  const toggleCustomWordKnown = useCallback(
    (id: string) => {
      const existingWord = wordsState.customWords.find((w) => w.id === id);
      const nextKnown = existingWord ? !existingWord.known : true;
      setWordsState((prev) => ({
        ...prev,
        customWords: prev.customWords.map((word) =>
          word.id === id ? { ...word, known: nextKnown } : word,
        ),
      }));

      void persistRemote(() =>
        isSupabaseConfigured && user
          ? setCustomWordKnownSupabase(user.id, id, nextKnown)
          : authedFetch(`/api/prep/words/${encodeURIComponent(id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ known: nextKnown }),
            }),
      );
    },
    [user, wordsState.customWords, setWordsState, persistRemote, authedFetch],
  );

  const removeCustomWord = useCallback(
    (id: string) => {
      setWordsState((prev) => ({
        ...prev,
        customWords: prev.customWords.filter((word) => word.id !== id),
      }));

      void persistRemote(() =>
        isSupabaseConfigured && user
          ? deleteCustomWordSupabase(user.id, id)
          : authedFetch(`/api/prep/words/${encodeURIComponent(id)}`, {
              method: 'DELETE',
            }),
      );
    },
    [user, setWordsState, persistRemote, authedFetch],
  );

  const saveWordsBatchToLocal = useCallback(
    async (items: Array<{ userWord: string; localWord: string; category?: string }>) => {
      const existingPairs = new Set(
        wordsState.customWords.map(
          (w) => `${w.userWord.toLowerCase()}::${w.localWord.toLowerCase()}`,
        ),
      );
      const additions: CustomWord[] = [];
      items.forEach((item, idx) => {
        const u = item.userWord.trim();
        const l = item.localWord.trim();
        const key = `${u.toLowerCase()}::${l.toLowerCase()}`;
        if (u && l && !existingPairs.has(key)) {
          existingPairs.add(key);
          additions.push({
            id: `local-ai-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
            userWord: u,
            localWord: l,
            category: normalizeCategoryName(item.category ?? 'general'),
            known: false,
          });
        }
      });

      if (additions.length === 0) return;

      setWordsState((prev) => ({
        ...prev,
        customWords: [...additions, ...prev.customWords],
      }));

      if (user) {
        await persistRemote(async () => {
          for (const word of additions) {
            if (isSupabaseConfigured) {
              await upsertCustomWordSupabase(user.id, word);
            } else {
              await authedFetch('/api/prep/words', {
                method: 'POST',
                body: JSON.stringify(word),
              });
            }
          }
        });
      }
    },
    [user, wordsState.customWords, setWordsState, persistRemote, authedFetch],
  );

  const togglePracticedQuestion = useCallback(
    (id: string) => {
      const nextPracticed = !practicedQuestionIds.includes(id);
      setPracticedQuestionIds((prev) => {
        const exists = prev.includes(id);
        return exists ? prev.filter((q) => q !== id) : [...prev, id];
      });

      void persistRemote(() =>
        isSupabaseConfigured && user
          ? setQuestionProgressSupabase(user.id, id, { practiced: nextPracticed })
          : authedFetch(`/api/prep/questions/${encodeURIComponent(id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ practiced: nextPracticed }),
            }),
      );
    },
    [user, practicedQuestionIds, setPracticedQuestionIds, persistRemote, authedFetch],
  );

  const toggleChosenQuestion = useCallback(
    (id: string) => {
      const nextChosen = !chosenQuestionIds.includes(id);
      setChosenQuestionIds((prev) => {
        const exists = prev.includes(id);
        return exists ? prev.filter((q) => q !== id) : [...prev, id];
      });

      void persistRemote(() =>
        isSupabaseConfigured && user
          ? setQuestionProgressSupabase(user.id, id, { chosenForSheet: nextChosen })
          : authedFetch(`/api/prep/questions/${encodeURIComponent(id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ chosenForSheet: nextChosen }),
            }),
      );
    },
    [user, chosenQuestionIds, setChosenQuestionIds, persistRemote, authedFetch],
  );

  const saveCustomScenario = useCallback(
    async (scenario: CustomScenario) => {
      setCustomScenarios((prev) => [
        scenario,
        ...prev.filter((item) => item.id !== scenario.id),
      ]);

      if (!user) return;

      setSyncError(null);
      try {
        if (isSupabaseConfigured) {
          await upsertCustomScenarioSupabase(user.id, scenario);
        } else {
          await authedFetch('/api/prep/scenarios', {
            method: 'POST',
            body: JSON.stringify(scenario),
          });
        }
      } catch (err) {
        console.error('Failed to save custom scenario to Supabase:', err);
        setSyncError('auth.syncError');
        throw err;
      }
    },
    [user, authedFetch],
  );

  const removeCustomScenario = useCallback(
    async (id: string) => {
      setCustomScenarios((prev) => prev.filter((item) => item.id !== id));

      await persistRemote(() =>
        isSupabaseConfigured && user
          ? deleteCustomScenarioSupabase(user.id, id)
          : authedFetch(`/api/prep/scenarios/${encodeURIComponent(id)}`, {
              method: 'DELETE',
            }),
      );
    },
    [user, persistRemote, authedFetch],
  );

  const resetAllData = useCallback(() => {
    setWordsState(INITIAL_WORDS_STATE);
    setCustomScenarios([]);
    setPracticedQuestionIds([]);
    setChosenQuestionIds([]);

    void persistRemote(() =>
      isSupabaseConfigured && user
        ? resetUserPrepDataSupabase(user.id)
        : authedFetch('/api/prep/reset', {
            method: 'DELETE',
          }),
    );
  }, [
    user,
    setWordsState,
    setPracticedQuestionIds,
    setChosenQuestionIds,
    persistRemote,
    authedFetch,
  ]);

  const totalStarterWordsCount = useMemo(
    () => SCENARIOS.reduce((sum, s) => sum + s.starterWords.length, 0),
    [],
  );

  const totalQuestionsCount = useMemo(
    () =>
      SCENARIOS.reduce((sum, s) => sum + s.questions.length, 0) +
      customScenarios.reduce((sum, s) => sum + s.questions.length, 0),
    [customScenarios],
  );

  const knownWordsCount = useMemo(() => {
    const knownCustom = wordsState.customWords.filter((w) => w.known).length;
    return wordsState.knownStarterIds.length + knownCustom;
  }, [wordsState]);

  const totalWordsCount = totalStarterWordsCount + wordsState.customWords.length;

  const hasAnySavedProgress =
    knownWordsCount > 0 ||
    wordsState.customWords.length > 0 ||
    customScenarios.length > 0 ||
    practicedQuestionIds.length > 0 ||
    chosenQuestionIds.length > 0;

  const value: AppStateContextValue = {
    homeLanguage,
    localLanguage,
    language: homeLanguage,
    homeLanguageInfo,
    localLanguageInfo,
    availableLanguages: AVAILABLE_LANGUAGES,
    setHomeLanguage,
    setLocalLanguage,
    t: tHome,
    tHome,
    tLocal,
    tArray: tHomeArray,
    tHomeArray,
    tLocalArray,
    isHomeMachineTranslated: homeTranslation.isMachineTranslated,
    isLocalMachineTranslated: localTranslation.isMachineTranslated,
    isAnyMachineTranslated:
      homeTranslation.isMachineTranslated || localTranslation.isMachineTranslated,
    isTranslating: homeTranslation.isTranslating || localTranslation.isTranslating,
    translationOfflineFallback:
      homeTranslation.hasFallbackError || localTranslation.hasFallbackError,
    translateCustomWord,
    wordsState,
    toggleStarterWordKnown,
    addCustomWord,
    toggleCustomWordKnown,
    removeCustomWord,
    saveWordsBatchToLocal,
    customScenarios,
    saveCustomScenario,
    removeCustomScenario,
    practicedQuestionIds,
    togglePracticedQuestion,
    chosenQuestionIds,
    toggleChosenQuestion,
    totalStarterWordsCount,
    totalQuestionsCount,
    knownWordsCount,
    totalWordsCount,
    hasAnySavedProgress,
    resetAllData,
    user,
    authLoading,
    isSigningIn,
    authError,
    authErrorVars,
    isSyncing,
    syncError,
    userProfile,
    isAccountModalOpen,
    isFirstTimeOnboarding,
    openAccountSetup,
    closeAccountSetup,
    saveAccountProfile,
    getIdToken,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
}
