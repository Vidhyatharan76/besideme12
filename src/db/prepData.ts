import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  customScenarios,
  customWords,
  questionProgress,
  starterWordProgress,
  users,
} from './schema.ts';

export interface CustomWordRecord {
  id: string;
  userWord: string;
  localWord: string;
  category: string;
  known: boolean;
}

export interface UserProfileData {
  displayName: string;
  familyRole: string;
  focusVisits: string[];
  onboardingCompleted: boolean;
}

export interface CustomScenarioRecord {
  id: string;
  languageCode: string;
  languageName: string;
  localLanguageCode?: string;
  title: string;
  titleEnglish: string;
  shortTitle: string;
  summary: string;
  isHealthRelated: boolean;
  steps: unknown[];
  questions: unknown[];
  words: unknown[];
  createdAt?: string;
}

export interface UserPrepPayload {
  preferredLanguage: string;
  localLanguage: string;
  profile?: UserProfileData;
  knownStarterIds: string[];
  customWords: CustomWordRecord[];
  customScenarios?: CustomScenarioRecord[];
  practicedQuestionIds: string[];
  chosenQuestionIds: string[];
}

export async function getUserPrepData(uid: string): Promise<UserPrepPayload> {
  try {
    const [userRow, customWordRows, starterRows, questionRows, customScenarioRows] =
      await Promise.all([
        db.select().from(users).where(eq(users.uid, uid)).limit(1),
        db
          .select()
          .from(customWords)
          .where(eq(customWords.userUid, uid))
          .orderBy(desc(customWords.createdAt)),
        db
          .select()
          .from(starterWordProgress)
          .where(
            and(
              eq(starterWordProgress.userUid, uid),
              eq(starterWordProgress.known, true),
            ),
          ),
        db
          .select()
          .from(questionProgress)
          .where(eq(questionProgress.userUid, uid)),
        db
          .select()
          .from(customScenarios)
          .where(eq(customScenarios.userUid, uid))
          .orderBy(desc(customScenarios.createdAt)),
      ]);

    let parsedFocusVisits: string[] = [];
    try {
      const rawVisits = JSON.parse(userRow[0]?.focusVisits ?? '[]');
      if (Array.isArray(rawVisits)) {
        parsedFocusVisits = rawVisits.filter((v): v is string => typeof v === 'string');
      }
    } catch {
      parsedFocusVisits = [];
    }

    return {
      preferredLanguage: userRow[0]?.preferredLanguage ?? 'en',
      localLanguage: userRow[0]?.localLanguage ?? 'en',
      profile: {
        displayName: userRow[0]?.displayName ?? '',
        familyRole: userRow[0]?.familyRole ?? 'parent',
        focusVisits: parsedFocusVisits,
        onboardingCompleted: Boolean(userRow[0]?.onboardingCompleted),
      },
      knownStarterIds: starterRows.map((row) => row.wordId),
      customWords: customWordRows.map((row) => ({
        id: row.id,
        userWord: row.userWord,
        localWord: row.localWord,
        category: row.category,
        known: row.known,
      })),
      customScenarios: customScenarioRows.map((row) => ({
        id: row.id,
        languageCode: row.languageCode,
        languageName: row.languageName,
        localLanguageCode: row.localLanguageCode,
        title: row.title,
        titleEnglish: row.titleEnglish,
        shortTitle: row.shortTitle,
        summary: row.summary,
        isHealthRelated: row.isHealthRelated,
        steps: Array.isArray(row.steps) ? row.steps : [],
        questions: Array.isArray(row.questions) ? row.questions : [],
        words: Array.isArray(row.words) ? row.words : [],
        createdAt: row.createdAt ? row.createdAt.toISOString() : undefined,
      })),
      practicedQuestionIds: questionRows
        .filter((row) => row.practiced)
        .map((row) => row.questionId),
      chosenQuestionIds: questionRows
        .filter((row) => row.chosenForSheet)
        .map((row) => row.questionId),
    };
  } catch (error) {
    console.error('Failed to load user prep data:', error);
    throw new Error('Unable to load saved preparation data.', { cause: error });
  }
}

export async function upsertCustomWordDb(uid: string, word: CustomWordRecord) {
  try {
    await db
      .insert(customWords)
      .values({
        id: word.id,
        userUid: uid,
        userWord: word.userWord,
        localWord: word.localWord,
        category: word.category,
        known: word.known,
      })
      .onConflictDoUpdate({
        target: customWords.id,
        set: {
          userWord: word.userWord,
          localWord: word.localWord,
          category: word.category,
          known: word.known,
        },
      });
  } catch (error) {
    console.error('Failed to save custom word:', error);
    throw new Error('Unable to save custom word.', { cause: error });
  }
}

export async function setCustomWordKnownDb(uid: string, wordId: string, known: boolean) {
  try {
    await db
      .update(customWords)
      .set({ known })
      .where(and(eq(customWords.id, wordId), eq(customWords.userUid, uid)));
  } catch (error) {
    console.error('Failed to update custom word state:', error);
    throw new Error('Unable to update word status.', { cause: error });
  }
}

export async function deleteCustomWordDb(uid: string, wordId: string) {
  try {
    await db
      .delete(customWords)
      .where(and(eq(customWords.id, wordId), eq(customWords.userUid, uid)));
  } catch (error) {
    console.error('Failed to delete custom word:', error);
    throw new Error('Unable to remove word.', { cause: error });
  }
}

export async function setStarterWordKnownDb(uid: string, wordId: string, known: boolean) {
  try {
    await db
      .insert(starterWordProgress)
      .values({
        userUid: uid,
        wordId,
        known,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [starterWordProgress.userUid, starterWordProgress.wordId],
        set: {
          known,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error('Failed to update starter word progress:', error);
    throw new Error('Unable to update word progress.', { cause: error });
  }
}

export async function setQuestionProgressDb(
  uid: string,
  questionId: string,
  patch: { practiced?: boolean; chosenForSheet?: boolean },
) {
  try {
    const existing = await db
      .select()
      .from(questionProgress)
      .where(
        and(
          eq(questionProgress.userUid, uid),
          eq(questionProgress.questionId, questionId),
        ),
      )
      .limit(1);

    const nextPracticed = patch.practiced ?? existing[0]?.practiced ?? false;
    const nextChosen = patch.chosenForSheet ?? existing[0]?.chosenForSheet ?? false;

    await db
      .insert(questionProgress)
      .values({
        userUid: uid,
        questionId,
        practiced: nextPracticed,
        chosenForSheet: nextChosen,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [questionProgress.userUid, questionProgress.questionId],
        set: {
          practiced: nextPracticed,
          chosenForSheet: nextChosen,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error('Failed to update question progress:', error);
    throw new Error('Unable to update question progress.', { cause: error });
  }
}

export async function syncPrepDataDb(uid: string, payload: UserPrepPayload) {
  try {
    if (payload.preferredLanguage || payload.localLanguage) {
      await db
        .update(users)
        .set({
          ...(payload.preferredLanguage ? { preferredLanguage: payload.preferredLanguage } : {}),
          ...(payload.localLanguage ? { localLanguage: payload.localLanguage } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid));
    }

    for (const word of payload.customWords) {
      await upsertCustomWordDb(uid, word);
    }

    for (const wordId of payload.knownStarterIds) {
      await setStarterWordKnownDb(uid, wordId, true);
    }

    const questionIds = new Set([
      ...payload.practicedQuestionIds,
      ...payload.chosenQuestionIds,
    ]);
    for (const qId of questionIds) {
      const practiced = payload.practicedQuestionIds.includes(qId);
      const chosenForSheet = payload.chosenQuestionIds.includes(qId);
      const existing = await db
        .select()
        .from(questionProgress)
        .where(
          and(
            eq(questionProgress.userUid, uid),
            eq(questionProgress.questionId, qId),
          ),
        )
        .limit(1);

      await setQuestionProgressDb(uid, qId, {
        practiced: practiced || (existing[0]?.practiced ?? false),
        chosenForSheet: chosenForSheet || (existing[0]?.chosenForSheet ?? false),
      });
    }
  } catch (error) {
    console.error('Failed to sync prep data:', error);
    throw new Error('Unable to sync preparation data.', { cause: error });
  }
}

export async function upsertCustomScenarioDb(uid: string, scenario: CustomScenarioRecord) {
  try {
    await db
      .insert(customScenarios)
      .values({
        id: scenario.id,
        userUid: uid,
        languageCode: scenario.languageCode || 'en',
        languageName: scenario.languageName || 'English',
        localLanguageCode: scenario.localLanguageCode || 'en',
        title: scenario.title,
        titleEnglish: scenario.titleEnglish,
        shortTitle: scenario.shortTitle,
        summary: scenario.summary || '',
        isHealthRelated: Boolean(scenario.isHealthRelated),
        steps: scenario.steps,
        questions: scenario.questions,
        words: scenario.words,
      })
      .onConflictDoUpdate({
        target: customScenarios.id,
        set: {
          languageCode: scenario.languageCode || 'en',
          languageName: scenario.languageName || 'English',
          localLanguageCode: scenario.localLanguageCode || 'en',
          title: scenario.title,
          titleEnglish: scenario.titleEnglish,
          shortTitle: scenario.shortTitle,
          summary: scenario.summary || '',
          isHealthRelated: Boolean(scenario.isHealthRelated),
          steps: scenario.steps,
          questions: scenario.questions,
          words: scenario.words,
        },
      });
  } catch (error) {
    console.error('Failed to save custom scenario:', error);
    throw new Error('Unable to save custom scenario.', { cause: error });
  }
}

export async function deleteCustomScenarioDb(uid: string, scenarioId: string) {
  try {
    await db
      .delete(customScenarios)
      .where(and(eq(customScenarios.id, scenarioId), eq(customScenarios.userUid, uid)));
  } catch (error) {
    console.error('Failed to delete custom scenario:', error);
    throw new Error('Unable to remove custom scenario.', { cause: error });
  }
}

export async function resetUserPrepDataDb(uid: string) {
  try {
    await Promise.all([
      db.delete(customWords).where(eq(customWords.userUid, uid)),
      db.delete(starterWordProgress).where(eq(starterWordProgress.userUid, uid)),
      db.delete(questionProgress).where(eq(questionProgress.userUid, uid)),
      db.delete(customScenarios).where(eq(customScenarios.userUid, uid)),
    ]);
  } catch (error) {
    console.error('Failed to reset prep data:', error);
    throw new Error('Unable to clear saved data.', { cause: error });
  }
}
