import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
}

const SCENARIO_SYSTEM_INSTRUCTION =
  'You help immigrant parents prepare for visits to schools, clinics, and banks. Use very plain language and short sentences. The parent is the main person; a child may only help, never interpret. Do NOT give medical, legal, or immigration advice; for health topics, only help with preparation, questions to ask, and reminding the family they can request a professional interpreter. Do not ask for or repeat personal details. If the request is unclear, unsafe, or outside this purpose, return the error JSON. Output ONLY valid JSON matching the provided schema. Provide translations in the requested language, and keep wording simple.';

const LANG_NAMES: Record<string, string> = {
  en: 'English (English)',
  es: 'Spanish (Español)',
  ar: 'Arabic (العربية)',
  ur: 'Urdu (اردو)',
  hi: 'Hindi (हिन्दी)',
  ta: 'Tamil (தமிழ்)',
  'zh-Hans': 'Chinese Simplified (简体中文)',
  'zh-Hant': 'Chinese Traditional (繁體中文)',
  ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)',
  fr: 'French (Français)',
  pt: 'Portuguese (Português)',
  de: 'German (Deutsch)',
  it: 'Italian (Italiano)',
  ru: 'Russian (Русский)',
  uk: 'Ukrainian (Українська)',
  pl: 'Polish (Polski)',
  tr: 'Turkish (Türkçe)',
  vi: 'Vietnamese (Tiếng Việt)',
  tl: 'Tagalog (Tagalog)',
  bn: 'Bengali (বাংলা)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  fa: 'Persian (فارسی)',
  ne: 'Nepali (नेपाली)',
  so: 'Somali (Soomaali)',
  sw: 'Swahili (Kiswahili)',
  ht: 'Haitian Creole (Kreyòl Ayisyen)',
  ro: 'Romanian (Română)',
  th: 'Thai (ไทย)',
  id: 'Indonesian (Bahasa Indonesia)',
  ms: 'Malay (Bahasa Melayu)',
};

function parseBody(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return {};
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: 'Supabase environment variables are missing on server.' });
      return;
    }

    const rawAuth = req.headers.authorization;
    const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Please sign in first.' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !userData.user) {
      res.status(401).json({ error: 'Unauthorized: Invalid session.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const body = parseBody(req.body);
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';
    const languageCode =
      typeof body.languageCode === 'string' ? body.languageCode.trim() : 'en';
    const languageName =
      typeof body.languageName === 'string' && body.languageName.trim()
        ? body.languageName.trim()
        : LANG_NAMES[languageCode] || 'English';
    const localLanguageCode =
      typeof body.localLanguageCode === 'string' && LANG_NAMES[body.localLanguageCode.trim()]
        ? body.localLanguageCode.trim()
        : 'en';
    const localLanguageName = LANG_NAMES[localLanguageCode] || 'English';

    if (!description || description.length < 3 || description.length > 500) {
      res.status(400).json({ error: 'Please write a short description of your visit.' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

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

    const schema = {
      type: Type.OBJECT,
      properties: {
        error: { type: Type.STRING },
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
    };

    const callModel = async (modelName: string) =>
      ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: SCENARIO_SYSTEM_INSTRUCTION,
          ...(modelName === 'gemini-4-hydrogen'
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } }
            : {}),
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

    const isFallbackable = (err: unknown) => {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : NaN;
      if (status === 404 || status === 429 || status === 500 || status === 503) return true;
      const msg = (err instanceof Error ? err.message : String(err)).toUpperCase();
      return (
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('500') ||
        msg.includes('404') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('INTERNAL') ||
        msg.includes('NOT_FOUND') ||
        msg.includes('NOT FOUND') ||
        msg.includes('HIGH DEMAND') ||
        msg.includes('OVERLOADED')
      );
    };

    const models = [
      'gemini-4-hydrogen',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
    ];
    let response;
    let lastError: unknown;
    for (let i = 0; i < models.length; i++) {
      try {
        response = await callModel(models[i]);
        break;
      } catch (err: unknown) {
        lastError = err;
        if (!isFallbackable(err) || i === models.length - 1) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, i < 2 ? 250 : 750));
      }
    }
    if (!response) {
      throw lastError;
    }

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText) as {
      error?: string;
      title?: string;
      titleEnglish?: string;
      shortTitle?: string;
      summary?: string;
      isHealthRelated?: boolean;
      steps?: Array<{
        id: string;
        title: string;
        titleEnglish: string;
        body: string;
        bodyEnglish: string;
        tip: string;
        tipEnglish: string;
        items: Array<{ userText: string; localText: string }>;
      }>;
      questions?: Array<{ userText: string; localText: string }>;
      words?: Array<{ userText: string; localText: string }>;
    };

    if (parsed.error && parsed.error.trim().length > 0) {
      res.status(400).json({ error: parsed.error.trim() });
      return;
    }

    const stamp = Date.now();
    const expectedIds = ['whatHappens', 'whoIsThere', 'howLong', 'whatToBring'] as const;
    const steps = expectedIds.map((stepId, idx) => {
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

    res.status(200).json({
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
    });
  } catch (error: unknown) {
    console.error('Vercel build-scenario error:', error);
    const message =
      error instanceof Error ? error.message : 'Unable to build scenario right now.';
    res.status(500).json({ error: message });
  }
}
