import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  deleteCustomScenarioDb,
  deleteCustomWordDb,
  getUserPrepData,
  resetUserPrepDataDb,
  setCustomWordKnownDb,
  setQuestionProgressDb,
  setStarterWordKnownDb,
  syncPrepDataDb,
  upsertCustomScenarioDb,
  upsertCustomWordDb,
  type CustomScenarioRecord,
  type UserPrepPayload,
} from './src/db/prepData.ts';
import {
  insertMachineTranslations,
  lookupCachedTranslations,
} from './src/db/translationCache.ts';
import {
  getOrCreateUser,
  updateUserLanguages,
  updateUserProfile,
} from './src/db/users.ts';
import {
  categorizeGlossaryWord,
  explainGlossaryWord,
  generateCustomScenario,
} from './src/lib/gemini.ts';
import { translateBatch, translateText } from './src/lib/translator.ts';
import { getLanguageInfo, isAllowedLanguageCode } from './src/locales/languages.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '256kb' }));

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 40;
const ipRequestTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequestTimestamps.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (timestamps.length >= RATE_MAX_REQUESTS) {
    ipRequestTimestamps.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  ipRequestTimestamps.set(ip, timestamps);
  return false;
}

async function ensureDbUser(req: AuthRequest) {
  const uid = req.user?.uid;
  const email = req.user?.email ?? '';
  const name = typeof req.user?.name === 'string' ? req.user.name : null;
  if (!uid) {
    throw new Error('Missing authenticated user ID');
  }
  await getOrCreateUser(uid, email, name);
  return uid;
}

app.get('/api/prep', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const data = await getUserPrepData(uid);
    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load data';
    res.status(500).json({ error: message });
  }
});

app.put('/api/prep/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const body = (req.body ?? {}) as Partial<UserPrepPayload>;
    const rawHome =
      typeof body.preferredLanguage === 'string' && isAllowedLanguageCode(body.preferredLanguage)
        ? body.preferredLanguage
        : 'en';
    const rawLocal =
      typeof body.localLanguage === 'string' && isAllowedLanguageCode(body.localLanguage)
        ? body.localLanguage
        : 'en';

    const payload: UserPrepPayload = {
      preferredLanguage: rawHome,
      localLanguage: rawLocal,
      knownStarterIds: Array.isArray(body.knownStarterIds) ? body.knownStarterIds : [],
      customWords: Array.isArray(body.customWords) ? body.customWords : [],
      practicedQuestionIds: Array.isArray(body.practicedQuestionIds)
        ? body.practicedQuestionIds
        : [],
      chosenQuestionIds: Array.isArray(body.chosenQuestionIds) ? body.chosenQuestionIds : [],
    };
    await syncPrepDataDb(uid, payload);
    const merged = await getUserPrepData(uid);
    res.json(merged);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sync data';
    res.status(500).json({ error: message });
  }
});

app.patch('/api/prep/language', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const candidateHome =
      typeof req.body?.homeLanguage === 'string'
        ? req.body.homeLanguage
        : typeof req.body?.language === 'string'
          ? req.body.language
          : undefined;
    const candidateLocal =
      typeof req.body?.localLanguage === 'string' ? req.body.localLanguage : undefined;

    const homeLanguage =
      candidateHome && isAllowedLanguageCode(candidateHome) ? candidateHome : undefined;
    const localLanguage =
      candidateLocal && isAllowedLanguageCode(candidateLocal) ? candidateLocal : undefined;

    await updateUserLanguages(uid, homeLanguage, localLanguage);
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save language';
    res.status(500).json({ error: message });
  }
});

app.patch('/api/prep/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const body = (req.body ?? {}) as {
      displayName?: unknown;
      homeLanguage?: unknown;
      localLanguage?: unknown;
      familyRole?: unknown;
      focusVisits?: unknown;
      onboardingCompleted?: unknown;
    };

    const ALLOWED_ROLES = new Set(['parent', 'teen_helper', 'together']);
    const ALLOWED_VISITS = new Set(['school', 'clinic', 'bank']);

    const displayName =
      typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) : undefined;
    const homeLanguage =
      typeof body.homeLanguage === 'string' && isAllowedLanguageCode(body.homeLanguage)
        ? body.homeLanguage
        : undefined;
    const localLanguage =
      typeof body.localLanguage === 'string' && isAllowedLanguageCode(body.localLanguage)
        ? body.localLanguage
        : undefined;
    const familyRole =
      typeof body.familyRole === 'string' && ALLOWED_ROLES.has(body.familyRole)
        ? body.familyRole
        : undefined;
    const focusVisits = Array.isArray(body.focusVisits)
      ? body.focusVisits.filter(
          (v): v is string => typeof v === 'string' && ALLOWED_VISITS.has(v),
        )
      : undefined;
    const onboardingCompleted =
      typeof body.onboardingCompleted === 'boolean' ? body.onboardingCompleted : undefined;

    await updateUserProfile(uid, {
      displayName,
      preferredLanguage: homeLanguage,
      localLanguage,
      familyRole,
      focusVisits,
      onboardingCompleted,
    });

    const updated = await getUserPrepData(uid);
    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save profile';
    res.status(500).json({ error: message });
  }
});

app.post('/api/prep/words', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const { id, userWord, localWord, category, known } = req.body ?? {};
    if (
      typeof id !== 'string' ||
      typeof userWord !== 'string' ||
      typeof localWord !== 'string'
    ) {
      res.status(400).json({ error: 'Invalid word payload' });
      return;
    }
    await upsertCustomWordDb(uid, {
      id,
      userWord: userWord.trim(),
      localWord: localWord.trim(),
      category: typeof category === 'string' ? category : 'general',
      known: Boolean(known),
    });
    res.status(201).json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save word';
    res.status(500).json({ error: message });
  }
});

app.patch('/api/prep/words/:wordId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const wordId = String(req.params.wordId);
    const known = Boolean(req.body?.known);
    await setCustomWordKnownDb(uid, wordId, known);
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update word';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/prep/words/:wordId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const wordId = String(req.params.wordId);
    await deleteCustomWordDb(uid, wordId);
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete word';
    res.status(500).json({ error: message });
  }
});

app.patch('/api/prep/starter-words/:wordId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const wordId = String(req.params.wordId);
    const known = Boolean(req.body?.known);
    await setStarterWordKnownDb(uid, wordId, known);
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update starter word';
    res.status(500).json({ error: message });
  }
});

app.patch('/api/prep/questions/:questionId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const questionId = String(req.params.questionId);
    const patch: { practiced?: boolean; chosenForSheet?: boolean } = {};
    if (typeof req.body?.practiced === 'boolean') {
      patch.practiced = req.body.practiced;
    }
    if (typeof req.body?.chosenForSheet === 'boolean') {
      patch.chosenForSheet = req.body.chosenForSheet;
    }
    await setQuestionProgressDb(uid, questionId, patch);
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update question';
    res.status(500).json({ error: message });
  }
});

app.post('/api/prep/scenarios', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const body = (req.body ?? {}) as Partial<CustomScenarioRecord>;
    if (typeof body.id !== 'string' || typeof body.title !== 'string') {
      res.status(400).json({ error: 'Invalid scenario payload' });
      return;
    }
    await upsertCustomScenarioDb(uid, {
      id: body.id,
      languageCode: typeof body.languageCode === 'string' ? body.languageCode : 'en',
      languageName: typeof body.languageName === 'string' ? body.languageName : 'English',
      localLanguageCode:
        typeof body.localLanguageCode === 'string' ? body.localLanguageCode : 'en',
      title: body.title,
      titleEnglish: typeof body.titleEnglish === 'string' ? body.titleEnglish : body.title,
      shortTitle: typeof body.shortTitle === 'string' ? body.shortTitle : body.title,
      summary: typeof body.summary === 'string' ? body.summary : '',
      isHealthRelated: Boolean(body.isHealthRelated),
      steps: Array.isArray(body.steps) ? body.steps : [],
      questions: Array.isArray(body.questions) ? body.questions : [],
      words: Array.isArray(body.words) ? body.words : [],
    });
    res.status(201).json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save scenario';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/prep/scenarios/:scenarioId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    const scenarioId = String(req.params.scenarioId);
    await deleteCustomScenarioDb(uid, scenarioId);
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete scenario';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/prep/reset', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = await ensureDbUser(req);
    await resetUserPrepDataDb(uid);
    res.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clear data';
    res.status(500).json({ error: message });
  }
});

app.get('/api/translation-cache', async (req, res) => {
  try {
    const targetLanguage =
      typeof req.query.targetLanguage === 'string' ? req.query.targetLanguage.trim() : '';
    const hashesParam = typeof req.query.hashes === 'string' ? req.query.hashes : '';
    if (!targetLanguage || !isAllowedLanguageCode(targetLanguage)) {
      res.status(400).json({ error: 'Invalid targetLanguage' });
      return;
    }
    const hashes = hashesParam
      .split(',')
      .map((h) => h.trim())
      .filter((h) => h.length > 0)
      .slice(0, 200);

    const translations = await lookupCachedTranslations(targetLanguage, hashes);
    res.json({ targetLanguage, translations });
  } catch {
    res.status(500).json({ error: 'Unable to read translation cache' });
  }
});

app.post('/api/edge', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    return;
  }

  const task = typeof req.body?.task === 'string' ? req.body.task : '';

  if (task === 'translate_content') {
    try {
      const targetLanguage =
        typeof req.body?.targetLanguage === 'string' ? req.body.targetLanguage.trim() : '';
      if (!targetLanguage || !isAllowedLanguageCode(targetLanguage)) {
        res.status(400).json({ error: 'Unsupported target language.' });
        return;
      }
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
      if (rawItems.length === 0 || rawItems.length > 80) {
        res.status(400).json({ error: 'Invalid translation batch size.' });
        return;
      }

      const items: Array<{ sourceHash: string; text: string }> = [];
      for (const item of rawItems) {
        if (
          !item ||
          typeof item.sourceHash !== 'string' ||
          typeof item.text !== 'string' ||
          !item.sourceHash.trim() ||
          !item.text.trim() ||
          item.text.length > 1000
        ) {
          res.status(400).json({ error: 'Invalid translation item.' });
          return;
        }
        items.push({
          sourceHash: item.sourceHash.trim(),
          text: item.text,
        });
      }

      const existing = await lookupCachedTranslations(
        targetLanguage,
        items.map((i) => i.sourceHash),
      );
      const misses = items.filter((i) => !existing[i.sourceHash]);

      const combined: Record<string, { translatedText: string; status: 'machine' | 'reviewed' }> = {
        ...existing,
      };

      if (misses.length > 0) {
        const translatedMap = await translateBatch(
          targetLanguage,
          misses.map((m) => ({ id: m.sourceHash, text: m.text })),
          'en',
        );

        const rowsToInsert: Array<{
          sourceHash: string;
          targetLanguage: string;
          translatedText: string;
        }> = [];

        for (const miss of misses) {
          const translatedText = translatedMap[miss.sourceHash];
          if (translatedText) {
            combined[miss.sourceHash] = {
              translatedText,
              status: 'machine',
            };
            rowsToInsert.push({
              sourceHash: miss.sourceHash,
              targetLanguage,
              translatedText,
            });
          }
        }

        await insertMachineTranslations(rowsToInsert);
      }

      res.json({
        targetLanguage,
        translations: combined,
      });
    } catch {
      res.status(502).json({ error: 'Translation service unavailable right now.' });
    }
    return;
  }

  if (task === 'translate_word') {
    await requireAuth(req as AuthRequest, res, async () => {
      try {
        const targetLanguage =
          typeof req.body?.targetLanguage === 'string' ? req.body.targetLanguage.trim() : '';
        const sourceLanguage =
          typeof req.body?.sourceLanguage === 'string' ? req.body.sourceLanguage.trim() : '';
        const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';

        if (!targetLanguage || !isAllowedLanguageCode(targetLanguage)) {
          res.status(400).json({ error: 'Unsupported target language.' });
          return;
        }
        if (!text || text.length > 200) {
          res.status(400).json({ error: 'Please enter a short word or phrase (up to 200 characters).' });
          return;
        }

        const translatedText = await translateText(
          text,
          targetLanguage,
          sourceLanguage && isAllowedLanguageCode(sourceLanguage) ? sourceLanguage : 'en',
        );

        res.json({
          targetLanguage,
          translatedText,
          status: 'machine',
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Could not translate word right now.';
        res.status(400).json({ error: message });
      }
    });
    return;
  }

  res.status(400).json({ error: 'Unsupported task.' });
});

app.post('/api/ai/build-scenario', requireAuth, async (req: AuthRequest, res) => {
  try {
    const description =
      typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const languageCode =
      typeof req.body?.languageCode === 'string' ? req.body.languageCode.trim() : 'en';
    const languageName =
      typeof req.body?.languageName === 'string' ? req.body.languageName.trim() : 'English';
    const localLanguageCode =
      typeof req.body?.localLanguageCode === 'string' &&
      isAllowedLanguageCode(req.body.localLanguageCode.trim())
        ? req.body.localLanguageCode.trim()
        : 'en';
    const localInfo = getLanguageInfo(localLanguageCode);

    if (!description || description.length < 3 || description.length > 500) {
      res.status(400).json({ error: 'Please write a short description of your visit.' });
      return;
    }

    const scenario = await generateCustomScenario(
      description,
      languageCode,
      languageName,
      localLanguageCode,
      `${localInfo.englishName} (${localInfo.nativeName})`,
    );
    res.json(scenario);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unable to build scenario right now.';
    res.status(400).json({ error: message });
  }
});

app.post('/api/ai/explain-word', requireAuth, async (req: AuthRequest, res) => {
  try {
    const wordUser = typeof req.body?.wordUser === 'string' ? req.body.wordUser.trim() : '';
    const wordEnglish =
      typeof req.body?.wordEnglish === 'string' ? req.body.wordEnglish.trim() : '';
    const languageCode =
      typeof req.body?.languageCode === 'string' ? req.body.languageCode.trim() : 'en';
    const languageName =
      typeof req.body?.languageName === 'string' ? req.body.languageName.trim() : 'English';
    const localLanguageCode =
      typeof req.body?.localLanguageCode === 'string' &&
      isAllowedLanguageCode(req.body.localLanguageCode.trim())
        ? req.body.localLanguageCode.trim()
        : 'en';
    const localInfo = getLanguageInfo(localLanguageCode);

    if (!wordUser && !wordEnglish) {
      res.status(400).json({ error: 'Missing word to explain.' });
      return;
    }

    const explanation = await explainGlossaryWord(
      wordUser || wordEnglish,
      wordEnglish || wordUser,
      languageCode,
      languageName,
      localLanguageCode,
      `${localInfo.englishName} (${localInfo.nativeName})`,
    );
    res.json(explanation);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unable to explain this word right now.';
    res.status(400).json({ error: message });
  }
});

app.post('/api/ai/categorize-word', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userWord = typeof req.body?.userWord === 'string' ? req.body.userWord.trim() : '';
    const localWord = typeof req.body?.localWord === 'string' ? req.body.localWord.trim() : '';
    const existingCategories = Array.isArray(req.body?.existingCategories)
      ? req.body.existingCategories
          .filter((c: unknown): c is string => typeof c === 'string')
          .slice(0, 30)
      : [];

    if (!userWord && !localWord) {
      res.status(400).json({ error: 'Missing word to categorize.' });
      return;
    }

    const category = await categorizeGlossaryWord(userWord, localWord, existingCategories);
    res.json({ category });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unable to categorize word right now.';
    res.status(400).json({ error: message });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Beside Me server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
