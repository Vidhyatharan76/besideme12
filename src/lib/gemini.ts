import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const SCENARIO_SYSTEM_INSTRUCTION =
  'You help immigrant parents prepare for visits to schools, clinics, and banks. Use very plain language and short sentences. The parent is the main person; a child may only help, never interpret. Do NOT give medical, legal, or immigration advice; for health topics, only help with preparation, questions to ask, and reminding the family they can request a professional interpreter. Do not ask for or repeat personal details. If the request is unclear, unsafe, or outside this purpose, return the error JSON. Output ONLY valid JSON matching the provided schema. Provide translations in the requested language, and keep wording simple.';

const TRANSLATION_SYSTEM_INSTRUCTION =
  'Translate faithfully into simple, plain, respectful language that a parent without specialist vocabulary would understand. Keep names, numbers, and placeholders unchanged. Do not add or remove information. Return only valid JSON.';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface GeneratedScenarioItem {
  userText: string;
  localText: string;
}

export interface GeneratedScenarioStep {
  id: 'whatHappens' | 'whoIsThere' | 'howLong' | 'whatToBring';
  title: string;
  titleEnglish: string;
  body: string;
  bodyEnglish: string;
  tip: string;
  tipEnglish: string;
  items: GeneratedScenarioItem[];
}

export interface GeneratedScenario {
  id: string;
  title: string;
  titleEnglish: string;
  shortTitle: string;
  summary: string;
  isHealthRelated: boolean;
  steps: GeneratedScenarioStep[];
  questions: Array<{
    id: string;
    userText: string;
    localText: string;
  }>;
  words: Array<{
    id: string;
    userText: string;
    localText: string;
  }>;
}

export interface WordExplanation {
  meaningUser: string;
  meaningEnglish: string;
  exampleUser: string;
  exampleEnglish: string;
}

async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('UNAVAILABLE');
      if (!isTransient || attempt === maxRetries) {
        break;
      }
      const delayMs = 600 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export async function generateCustomScenario(
  description: string,
  languageCode: string,
  languageName: string,
  localLanguageCode = 'en',
  localLanguageName = 'English',
): Promise<GeneratedScenario> {
  const ai = getGeminiClient();

  const prompt = [
    `Requested parent language (userText / title / body / tip): ${languageName} (code: ${languageCode}).`,
    `Local desk language (localText / titleEnglish / bodyEnglish / tipEnglish): ${localLanguageName} (code: ${localLanguageCode}).`,
    `Parent's visit description: "${description}"`,
    '',
    'Generate a thoughtful, practical visit preparation kit matching the schema:',
    '- If the description is unclear, unsafe, asks for medical/legal/immigration advice, or is outside visit preparation, set "error" to a short polite explanation and leave other fields empty.',
    '- Otherwise, set "error" to "" (empty string).',
    '- "steps" must have exactly 4 steps in order with ids: "whatHappens", "whoIsThere", "howLong", "whatToBring".',
    '- Make every step concrete and tailored to the exact appointment type (never generic filler). Remind the parent gently that a teen helper can support with notes/papers while a professional interpreter handles official translation.',
    `- In step "whatToBring", provide 4 to 5 specific documents or items in "items" (both userText in ${languageName} and localText in ${localLanguageName}). For steps 1-3, "items" must be [].`,
    `- "questions" must have 6 to 8 smart, specific, practical questions the parent can ask or show at the desk for THIS exact visit—covering key decisions, deadlines, written summaries, follow-up steps, and any concern mentioned (both userText in ${languageName} and localText in ${localLanguageName}).`,
    `- "words" must have 8 to 12 essential visit-specific vocabulary words/short phrases the parent is likely to hear or read on forms (both userText in ${languageName} and localText in ${localLanguageName}).`,
  ].join('\n');

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: SCENARIO_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            error: {
              type: Type.STRING,
              description: 'Non-empty only if request is unclear, unsafe, or out of scope.',
            },
            title: { type: Type.STRING },
            titleEnglish: { type: Type.STRING },
            shortTitle: { type: Type.STRING },
            summary: { type: Type.STRING },
            isHealthRelated: { type: Type.BOOLEAN },
            steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                titleEnglish: { type: Type.STRING },
                body: { type: Type.STRING },
                bodyEnglish: { type: Type.STRING },
                tip: { type: Type.STRING },
                tipEnglish: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      userText: { type: Type.STRING },
                      localText: { type: Type.STRING },
                    },
                    required: ['userText', 'localText'],
                  },
                },
              },
              required: [
                'id',
                'title',
                'titleEnglish',
                'body',
                'bodyEnglish',
                'tip',
                'tipEnglish',
                'items',
              ],
            },
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                userText: { type: Type.STRING },
                localText: { type: Type.STRING },
              },
              required: ['userText', 'localText'],
            },
          },
          words: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                userText: { type: Type.STRING },
                localText: { type: Type.STRING },
              },
              required: ['userText', 'localText'],
            },
          },
        },
        required: [
          'error',
          'title',
          'titleEnglish',
          'shortTitle',
          'summary',
          'isHealthRelated',
          'steps',
          'questions',
          'words',
        ],
      },
    },
    }),
  );

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as {
    error?: string;
    title?: string;
    titleEnglish?: string;
    shortTitle?: string;
    summary?: string;
    isHealthRelated?: boolean;
    steps?: Array<Omit<GeneratedScenarioStep, 'id'> & { id: string }>;
    questions?: Array<{ userText: string; localText: string }>;
    words?: Array<{ userText: string; localText: string }>;
  };

  if (parsed.error && parsed.error.trim().length > 0) {
    throw new Error(parsed.error.trim());
  }

  const stamp = Date.now();
  const expectedIds: GeneratedScenarioStep['id'][] = [
    'whatHappens',
    'whoIsThere',
    'howLong',
    'whatToBring',
  ];

  const steps: GeneratedScenarioStep[] = expectedIds.map((stepId, idx) => {
    const rawStep = parsed.steps?.[idx];
    return {
      id: stepId,
      title: rawStep?.title ?? '',
      titleEnglish: rawStep?.titleEnglish ?? '',
      body: rawStep?.body ?? '',
      bodyEnglish: rawStep?.bodyEnglish ?? '',
      tip: rawStep?.tip ?? '',
      tipEnglish: rawStep?.tipEnglish ?? '',
      items: Array.isArray(rawStep?.items) ? rawStep.items : [],
    };
  });

  return {
    id: `custom-ai-${stamp}`,
    title: parsed.title ?? description,
    titleEnglish: parsed.titleEnglish ?? description,
    shortTitle: parsed.shortTitle ?? parsed.title ?? description,
    summary: parsed.summary ?? '',
    isHealthRelated: Boolean(parsed.isHealthRelated),
    steps,
    questions: (parsed.questions ?? []).slice(0, 8).map((q, idx) => ({
      id: `ai-q-${stamp}-${idx}`,
      userText: q.userText,
      localText: q.localText,
    })),
    words: (parsed.words ?? []).slice(0, 12).map((w, idx) => ({
      id: `ai-w-${stamp}-${idx}`,
      userText: w.userText,
      localText: w.localText,
    })),
  };
}

export async function explainGlossaryWord(
  wordUser: string,
  wordLocal: string,
  languageCode: string,
  languageName: string,
  localLanguageCode = 'en',
  localLanguageName = 'English',
): Promise<WordExplanation> {
  const ai = getGeminiClient();

  const prompt = [
    `Requested parent language: ${languageName} (code: ${languageCode}).`,
    `Local desk language: ${localLanguageName} (code: ${localLanguageCode}).`,
    `Word/phrase in parent's language: "${wordUser}"`,
    `Word/phrase in local language: "${wordLocal}"`,
    '',
    'Explain this single word or short phrase simply for a visit to a school, clinic, or bank:',
    '- If the input is unclear, unsafe, or outside visit preparation, set "error" to a short polite message and leave other fields empty.',
    '- Otherwise set "error" to "".',
    `- "meaningUser": one short, plain-language sentence explaining what it means in ${languageName}.`,
    `- "meaningEnglish": one short, plain-language sentence explaining what it means in ${localLanguageName}.`,
    `- "exampleUser": one short example sentence using the word in ${languageName}.`,
    `- "exampleEnglish": the same short example sentence in ${localLanguageName}.`,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction: SCENARIO_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          error: { type: Type.STRING },
          meaningUser: { type: Type.STRING },
          meaningEnglish: { type: Type.STRING },
          exampleUser: { type: Type.STRING },
          exampleEnglish: { type: Type.STRING },
        },
        required: [
          'error',
          'meaningUser',
          'meaningEnglish',
          'exampleUser',
          'exampleEnglish',
        ],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as {
    error?: string;
    meaningUser?: string;
    meaningEnglish?: string;
    exampleUser?: string;
    exampleEnglish?: string;
  };

  if (parsed.error && parsed.error.trim().length > 0) {
    throw new Error(parsed.error.trim());
  }

  return {
    meaningUser: parsed.meaningUser ?? '',
    meaningEnglish: parsed.meaningEnglish ?? '',
    exampleUser: parsed.exampleUser ?? '',
    exampleEnglish: parsed.exampleEnglish ?? '',
  };
}

export async function translateContentBatch(
  targetLanguageCode: string,
  targetLanguageName: string,
  items: Array<{ id: string; text: string }>,
): Promise<Record<string, string>> {
  if (items.length === 0) return {};
  const ai = getGeminiClient();

  const prompt = [
    `Translate each item from English into ${targetLanguageName} (BCP-47: ${targetLanguageCode}).`,
    'Rules:',
    '- Return every item with its exact "id" unchanged.',
    '- Keep all template placeholders like {{count}}, {{total}}, {{language}}, {{email}}, {{date}}, {{current}} completely unchanged.',
    '- Keep brand name "Beside Me" unchanged.',
    '- Use plain, warm, adult, everyday wording suitable for a parent.',
    '',
    'Items JSON:',
    JSON.stringify(items),
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction: TRANSLATION_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                translatedText: { type: Type.STRING },
              },
              required: ['id', 'translatedText'],
            },
          },
        },
        required: ['translations'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as {
    translations?: Array<{ id?: string; translatedText?: string }>;
  };

  const result: Record<string, string> = {};
  for (const row of parsed.translations ?? []) {
    if (typeof row.id === 'string' && typeof row.translatedText === 'string' && row.translatedText.trim()) {
      result[row.id] = row.translatedText.trim();
    }
  }
  return result;
}

export async function translateSingleWord(
  targetLanguageCode: string,
  targetLanguageName: string,
  text: string,
  sourceLanguageName?: string,
): Promise<string> {
  const ai = getGeminiClient();

  const prompt = [
    `Translate this single word or short phrase${sourceLanguageName ? ` from ${sourceLanguageName}` : ''} into ${targetLanguageName} (BCP-47: ${targetLanguageCode}).`,
    'Keep it plain, accurate, and short.',
    `Text: "${text}"`,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction: TRANSLATION_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          error: { type: Type.STRING },
          translatedText: { type: Type.STRING },
        },
        required: ['error', 'translatedText'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as { error?: string; translatedText?: string };
  if (parsed.error && parsed.error.trim().length > 0) {
    throw new Error(parsed.error.trim());
  }
  return (parsed.translatedText ?? '').trim();
}

export async function categorizeGlossaryWord(
  userWord: string,
  localWord: string,
  existingCategories: string[] = [],
): Promise<string> {
  const ai = getGeminiClient();

  const prompt = [
    'Classify the following vocabulary word/phrase into the best category for a family visit & daily life prep kit.',
    `Word in parent language: "${userWord}"`,
    `Word in local language: "${localWord}"`,
    `Existing categories: ${JSON.stringify(['school', 'clinic', 'bank', ...existingCategories])}`,
    '',
    'Rules:',
    '- Use "school", "clinic", or "bank" ONLY if the word clearly belongs to a school meeting, doctor/clinic visit, or bank visit.',
    '- If it closely matches one of the existing custom categories, reuse that exact category name.',
    '- Otherwise, create a NEW short, clear 1-2 word English Title-Case category name for whatever topic the word is related to (examples: "Dental", "Pharmacy", "Housing", "Transportation", "Groceries", "Work & Jobs", "Utilities", "Childcare", "Legal", "Travel", "Food", "Weather", "Tech", "Sports").',
    '- Avoid returning "general" unless the word is completely generic like "hello" or "thank you".',
  ].join('\n');

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
          },
          required: ['category'],
        },
      },
    }),
  );

  const parsed = JSON.parse((response.text ?? '{}').trim()) as { category?: string };
  return (parsed.category ?? 'general').trim().slice(0, 32) || 'general';
}

