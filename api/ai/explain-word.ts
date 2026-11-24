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
    const wordUser = typeof body.wordUser === 'string' ? body.wordUser.trim() : '';
    const wordEnglish = typeof body.wordEnglish === 'string' ? body.wordEnglish.trim() : '';
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

    if (!wordUser && !wordEnglish) {
      res.status(400).json({ error: 'Missing word to explain.' });
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
      `Requested parent language: ${languageName} (code: ${languageCode}).`,
      `Local desk language: ${localLanguageName} (code: ${localLanguageCode}).`,
      `Word/phrase in parent's language: "${wordUser || wordEnglish}"`,
      `Word/phrase in local language: "${wordEnglish || wordUser}"`,
      '',
      'Explain this single word or short phrase simply for a visit to a school, clinic, or bank:',
      '- If the input is unclear, unsafe, or outside visit preparation, set "error" to a short polite message and leave other fields empty.',
      '- Otherwise set "error" to "".',
      `- "meaningUser": one short, plain-language sentence explaining what it means in ${languageName}.`,
      `- "meaningEnglish": one short, plain-language sentence explaining what it means in ${localLanguageName}.`,
      `- "exampleUser": one short example sentence using the word in ${languageName}.`,
      `- "exampleEnglish": the same short example sentence in ${localLanguageName}.`,
    ].join('\n');

    const schema = {
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
    };

    const callModel = async (modelName: string) =>
      ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: SCENARIO_SYSTEM_INSTRUCTION,
          ...(modelName === 'gemini-4-hydrogen'
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
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
      meaningUser?: string;
      meaningEnglish?: string;
      exampleUser?: string;
      exampleEnglish?: string;
    };

    if (parsed.error && parsed.error.trim().length > 0) {
      res.status(400).json({ error: parsed.error.trim() });
      return;
    }

    res.status(200).json({
      meaningUser: parsed.meaningUser ?? '',
      meaningEnglish: parsed.meaningEnglish ?? '',
      exampleUser: parsed.exampleUser ?? '',
      exampleEnglish: parsed.exampleEnglish ?? '',
    });
  } catch (error: unknown) {
    console.error('Vercel explain-word error:', error);
    const message =
      error instanceof Error ? error.message : 'Unable to explain this word right now.';
    res.status(500).json({ error: message });
  }
}
