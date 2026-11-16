import { supabase } from './supabase';

export interface SupabaseCustomWord {
  id: string;
  userWord: string;
  localWord: string;
  category: string;
  known: boolean;
}

export interface CustomScenarioStep {
  id: 'whatHappens' | 'whoIsThere' | 'howLong' | 'whatToBring';
  title: string;
  titleEnglish: string;
  body: string;
  bodyEnglish: string;
  tip: string;
  tipEnglish: string;
  items: Array<{ userText: string; localText: string }>;
}

export interface CustomScenario {
  id: string;
  languageCode: string;
  languageName: string;
  localLanguageCode?: string;
  title: string;
  titleEnglish: string;
  shortTitle: string;
  summary: string;
  isHealthRelated: boolean;
  steps: CustomScenarioStep[];
  questions: Array<{ id: string; userText: string; localText: string }>;
  words: Array<{ id: string; userText: string; localText: string }>;
  createdAt?: string;
}

export interface SupabasePrepPayload {
  preferredLanguage: string;
  localLanguage: string;
  profile: {
    displayName: string;
    familyRole: string;
    focusVisits: string[];
    onboardingCompleted: boolean;
  };
  knownStarterIds: string[];
  customWords: SupabaseCustomWord[];
  customScenarios: CustomScenario[];
  practicedQuestionIds: string[];
  chosenQuestionIds: string[];
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('custom_scenarios') && error.message?.includes('does not exist')) ||
    Boolean(error.message?.includes('Could not find the table'))
  );
}

export async function ensureSupabaseUserRow(
  uid: string,
  email: string,
  displayName?: string | null,
  initialHomeLang = 'en',
  initialLocalLang = 'en',
) {
  const { data: existing, error: selectErr } = await supabase
    .from('users')
    .select('*')
    .eq('uid', uid)
    .maybeSingle();

  if (selectErr) throw selectErr;

  if (existing) {
    return existing;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('users')
    .insert({
      uid,
      email,
      display_name: displayName ?? null,
      preferred_language: initialHomeLang,
      local_language: initialLocalLang,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      const { data: retry, error: retryErr } = await supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();
      if (retryErr) throw retryErr;
      if (retry) return retry;
    }
    throw insertErr;
  }
  return inserted;
}

export async function fetchUserPrepDataSupabase(uid: string): Promise<SupabasePrepPayload> {
  const [userRes, wordsRes, starterRes, questionRes, scenariosRes] = await Promise.all([
    supabase.from('users').select('*').eq('uid', uid).maybeSingle(),
    supabase
      .from('custom_words')
      .select('*')
      .eq('user_uid', uid)
      .order('created_at', { ascending: false }),
    supabase
      .from('starter_word_progress')
      .select('word_id')
      .eq('user_uid', uid)
      .eq('known', true),
    supabase.from('question_progress').select('*').eq('user_uid', uid),
    supabase
      .from('custom_scenarios')
      .select('*')
      .eq('user_uid', uid)
      .order('created_at', { ascending: false }),
  ]);

  if (userRes.error) throw userRes.error;
  if (wordsRes.error) throw wordsRes.error;
  if (starterRes.error) throw starterRes.error;
  if (questionRes.error) throw questionRes.error;
  if (scenariosRes.error && !isMissingTableError(scenariosRes.error)) {
    throw scenariosRes.error;
  }

  const userRow = userRes.data;
  let parsedFocusVisits: string[] = [];
  try {
    const raw = JSON.parse(userRow?.focus_visits ?? '[]');
    if (Array.isArray(raw)) {
      parsedFocusVisits = raw.filter((v): v is string => typeof v === 'string');
    }
  } catch {
    parsedFocusVisits = [];
  }

  const customScenarios: CustomScenario[] = (scenariosRes.data ?? []).map((r) => ({
    id: String(r.id),
    languageCode: String(r.language_code ?? 'en'),
    languageName: String(r.language_name ?? 'English'),
    localLanguageCode: String(r.local_language_code ?? 'en'),
    title: String(r.title ?? ''),
    titleEnglish: String(r.title_english ?? ''),
    shortTitle: String(r.short_title ?? ''),
    summary: String(r.summary ?? ''),
    isHealthRelated: Boolean(r.is_health_related),
    steps: Array.isArray(r.steps) ? (r.steps as CustomScenarioStep[]) : [],
    questions: Array.isArray(r.questions)
      ? (r.questions as Array<{ id: string; userText: string; localText: string }>)
      : [],
    words: Array.isArray(r.words)
      ? (r.words as Array<{ id: string; userText: string; localText: string }>)
      : [],
    createdAt: r.created_at ? String(r.created_at) : undefined,
  }));

  return {
    preferredLanguage: userRow?.preferred_language ?? 'en',
    localLanguage: userRow?.local_language ?? 'en',
    profile: {
      displayName: userRow?.display_name ?? '',
      familyRole: userRow?.family_role ?? 'parent',
      focusVisits: parsedFocusVisits,
      onboardingCompleted: Boolean(userRow?.onboarding_completed),
    },
    knownStarterIds: (starterRes.data ?? []).map((r) => String(r.word_id)),
    customWords: (wordsRes.data ?? []).map((r) => ({
      id: String(r.id),
      userWord: String(r.user_word),
      localWord: String(r.local_word),
      category: String(r.category ?? 'general'),
      known: Boolean(r.known),
    })),
    customScenarios,
    practicedQuestionIds: (questionRes.data ?? [])
      .filter((r) => Boolean(r.practiced))
      .map((r) => String(r.question_id)),
    chosenQuestionIds: (questionRes.data ?? [])
      .filter((r) => Boolean(r.chosen_for_sheet))
      .map((r) => String(r.question_id)),
  };
}

export async function syncLocalPrepToSupabase(
  uid: string,
  payload: {
    preferredLanguage: string;
    localLanguage: string;
    knownStarterIds: string[];
    customWords: SupabaseCustomWord[];
    practicedQuestionIds: string[];
    chosenQuestionIds: string[];
  },
) {
  const { error: langErr } = await supabase
    .from('users')
    .update({
      preferred_language: payload.preferredLanguage,
      local_language: payload.localLanguage,
      updated_at: new Date().toISOString(),
    })
    .eq('uid', uid);
  if (langErr) throw langErr;

  if (payload.customWords.length > 0) {
    const { error: wordsErr } = await supabase.from('custom_words').upsert(
      payload.customWords.map((w) => ({
        id: w.id,
        user_uid: uid,
        user_word: w.userWord,
        local_word: w.localWord,
        category: w.category || 'general',
        known: w.known,
      })),
      { onConflict: 'id' },
    );
    if (wordsErr) throw wordsErr;
  }

  if (payload.knownStarterIds.length > 0) {
    const now = new Date().toISOString();
    const { error: starterErr } = await supabase.from('starter_word_progress').upsert(
      payload.knownStarterIds.map((wordId) => ({
        user_uid: uid,
        word_id: wordId,
        known: true,
        updated_at: now,
      })),
      { onConflict: 'user_uid,word_id' },
    );
    if (starterErr) throw starterErr;
  }

  const questionIds = Array.from(
    new Set([...payload.practicedQuestionIds, ...payload.chosenQuestionIds]),
  );
  if (questionIds.length > 0) {
    const { data: existingRows, error: fetchErr } = await supabase
      .from('question_progress')
      .select('question_id, practiced, chosen_for_sheet')
      .eq('user_uid', uid)
      .in('question_id', questionIds);
    if (fetchErr) throw fetchErr;

    const existingMap = new Map(
      (existingRows ?? []).map((r) => [String(r.question_id), r]),
    );
    const now = new Date().toISOString();

    const { error: qErr } = await supabase.from('question_progress').upsert(
      questionIds.map((qId) => {
        const prev = existingMap.get(qId);
        return {
          user_uid: uid,
          question_id: qId,
          practiced: payload.practicedQuestionIds.includes(qId) || Boolean(prev?.practiced),
          chosen_for_sheet:
            payload.chosenQuestionIds.includes(qId) || Boolean(prev?.chosen_for_sheet),
          updated_at: now,
        };
      }),
      { onConflict: 'user_uid,question_id' },
    );
    if (qErr) throw qErr;
  }
}

export async function updateUserLanguagesSupabase(
  uid: string,
  homeLanguage?: string,
  localLanguage?: string,
) {
  const patch: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };
  if (homeLanguage) patch.preferred_language = homeLanguage;
  if (localLanguage) patch.local_language = localLanguage;

  const { error } = await supabase.from('users').update(patch).eq('uid', uid);
  if (error) throw error;
}

export async function updateUserProfileSupabase(
  uid: string,
  patch: {
    displayName?: string;
    familyRole?: string;
    focusVisits?: string[];
    homeLanguage?: string;
    localLanguage?: string;
    onboardingCompleted?: boolean;
  },
): Promise<SupabasePrepPayload> {
  const updateSet: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.displayName !== undefined) updateSet.display_name = patch.displayName;
  if (patch.familyRole) updateSet.family_role = patch.familyRole;
  if (patch.focusVisits !== undefined) {
    updateSet.focus_visits = JSON.stringify(patch.focusVisits);
  }
  if (patch.homeLanguage) updateSet.preferred_language = patch.homeLanguage;
  if (patch.localLanguage) updateSet.local_language = patch.localLanguage;
  if (typeof patch.onboardingCompleted === 'boolean') {
    updateSet.onboarding_completed = patch.onboardingCompleted;
  }

  const { error } = await supabase.from('users').update(updateSet).eq('uid', uid);
  if (error) throw error;

  return fetchUserPrepDataSupabase(uid);
}

export async function upsertCustomWordSupabase(uid: string, word: SupabaseCustomWord) {
  const rowPayload = {
    id: word.id,
    user_uid: uid,
    user_word: word.userWord,
    local_word: word.localWord,
    category: word.category || 'general',
    known: word.known,
  };

  const { error } = await supabase.from('custom_words').insert(rowPayload);
  if (!error) return;

  if (error.code === '23505') {
    const { error: updateErr } = await supabase
      .from('custom_words')
      .update({
        user_word: word.userWord,
        local_word: word.localWord,
        category: word.category || 'general',
        known: word.known,
      })
      .eq('id', word.id)
      .eq('user_uid', uid);
    if (updateErr) throw updateErr;
    return;
  }

  if (error.code === '23503') {
    const { data: userRes } = await supabase.auth.getUser();
    await ensureSupabaseUserRow(uid, userRes.user?.email ?? '');
    const { error: retryErr } = await supabase.from('custom_words').insert(rowPayload);
    if (retryErr && retryErr.code !== '23505') throw retryErr;
    return;
  }

  throw error;
}

export async function setCustomWordKnownSupabase(uid: string, wordId: string, known: boolean) {
  const { error } = await supabase
    .from('custom_words')
    .update({ known })
    .eq('id', wordId)
    .eq('user_uid', uid);
  if (error) throw error;
}

export async function deleteCustomWordSupabase(uid: string, wordId: string) {
  const { error } = await supabase
    .from('custom_words')
    .delete()
    .eq('id', wordId)
    .eq('user_uid', uid);
  if (error) throw error;
}

export async function setStarterWordKnownSupabase(uid: string, wordId: string, known: boolean) {
  const { error } = await supabase.from('starter_word_progress').upsert(
    {
      user_uid: uid,
      word_id: wordId,
      known,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_uid,word_id' },
  );
  if (error) throw error;
}

export async function setQuestionProgressSupabase(
  uid: string,
  questionId: string,
  patch: { practiced?: boolean; chosenForSheet?: boolean },
) {
  const { data: existing, error: selectErr } = await supabase
    .from('question_progress')
    .select('practiced, chosen_for_sheet')
    .eq('user_uid', uid)
    .eq('question_id', questionId)
    .maybeSingle();
  if (selectErr) throw selectErr;

  const { error } = await supabase.from('question_progress').upsert(
    {
      user_uid: uid,
      question_id: questionId,
      practiced: patch.practiced ?? existing?.practiced ?? false,
      chosen_for_sheet: patch.chosenForSheet ?? existing?.chosen_for_sheet ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_uid,question_id' },
  );
  if (error) throw error;
}

export async function upsertCustomScenarioSupabase(uid: string, scenario: CustomScenario) {
  const rowPayload = {
    id: scenario.id,
    user_uid: uid,
    language_code: scenario.languageCode || 'en',
    language_name: scenario.languageName || 'English',
    local_language_code: scenario.localLanguageCode || 'en',
    title: scenario.title,
    title_english: scenario.titleEnglish,
    short_title: scenario.shortTitle,
    summary: scenario.summary || '',
    is_health_related: Boolean(scenario.isHealthRelated),
    steps: scenario.steps,
    questions: scenario.questions,
    words: scenario.words,
  };

  const { error } = await supabase.from('custom_scenarios').insert(rowPayload);
  if (!error) return;

  if (isMissingTableError(error)) {
    throw new Error(
      'Supabase table "custom_scenarios" is missing. Please run migration 003_custom_scenarios.sql in Supabase SQL Editor.',
    );
  }

  if (error.code === '23505') {
    const { error: updateErr } = await supabase
      .from('custom_scenarios')
      .update({
        language_code: rowPayload.language_code,
        language_name: rowPayload.language_name,
        local_language_code: rowPayload.local_language_code,
        title: rowPayload.title,
        title_english: rowPayload.title_english,
        short_title: rowPayload.short_title,
        summary: rowPayload.summary,
        is_health_related: rowPayload.is_health_related,
        steps: rowPayload.steps,
        questions: rowPayload.questions,
        words: rowPayload.words,
      })
      .eq('id', scenario.id)
      .eq('user_uid', uid);
    if (updateErr) throw updateErr;
    return;
  }

  if (error.code === '23503') {
    const { data: userRes } = await supabase.auth.getUser();
    await ensureSupabaseUserRow(uid, userRes.user?.email ?? '');
    const { error: retryErr } = await supabase.from('custom_scenarios').insert(rowPayload);
    if (retryErr && retryErr.code !== '23505') throw retryErr;
    return;
  }

  throw error;
}

export async function deleteCustomScenarioSupabase(uid: string, scenarioId: string) {
  const { error } = await supabase
    .from('custom_scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('user_uid', uid);
  if (error && !isMissingTableError(error)) throw error;
}

export async function resetUserPrepDataSupabase(uid: string) {
  const [w, s, q, sc] = await Promise.all([
    supabase.from('custom_words').delete().eq('user_uid', uid),
    supabase.from('starter_word_progress').delete().eq('user_uid', uid),
    supabase.from('question_progress').delete().eq('user_uid', uid),
    supabase.from('custom_scenarios').delete().eq('user_uid', uid),
  ]);
  if (w.error) throw w.error;
  if (s.error) throw s.error;
  if (q.error) throw q.error;
  if (sc.error && !isMissingTableError(sc.error)) throw sc.error;
}

export async function lookupTranslationCacheSupabase(
  targetLanguage: string,
  sourceHashes: string[],
): Promise<Record<string, { translatedText: string; status: 'machine' | 'reviewed' }>> {
  if (sourceHashes.length === 0) return {};
  try {
    const uniqueHashes = Array.from(new Set(sourceHashes));
    const { data, error } = await supabase
      .from('translation_cache')
      .select('source_hash, translated_text, status')
      .eq('target_language', targetLanguage)
      .in('source_hash', uniqueHashes);

    if (error || !data) return {};

    const out: Record<string, { translatedText: string; status: 'machine' | 'reviewed' }> = {};
    for (const row of data) {
      out[String(row.source_hash)] = {
        translatedText: String(row.translated_text),
        status: row.status === 'reviewed' ? 'reviewed' : 'machine',
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function insertTranslationCacheSupabase(
  targetLanguage: string,
  rows: Array<{ sourceHash: string; translatedText: string }>,
): Promise<void> {
  if (rows.length === 0) return;
  try {
    await supabase.from('translation_cache').upsert(
      rows.map((r) => ({
        source_hash: r.sourceHash,
        target_language: targetLanguage,
        translated_text: r.translatedText,
        status: 'machine',
      })),
      { onConflict: 'source_hash,target_language', ignoreDuplicates: true },
    );
  } catch {
  }
}
