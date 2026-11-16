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
      res.status(500).json({ error: 'Supabase environment variables are missing.' });
      return;
    }

    const rawAuth = req.headers.authorization;
    const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized.' });
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
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      return;
    }

    const body = parseBody(req.body);
    const userWord = typeof body.userWord === 'string' ? body.userWord.trim() : '';
    const localWord = typeof body.localWord === 'string' ? body.localWord.trim() : '';
    const existingCategories = Array.isArray(body.existingCategories)
      ? body.existingCategories.filter((c): c is string => typeof c === 'string').slice(0, 30)
      : [];

    if (!userWord && !localWord) {
      res.status(400).json({ error: 'Word is required.' });
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

    const schema = {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING },
      },
      required: ['category'],
    };

    const callModel = async (modelName: string) =>
      ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          ...(modelName === 'gemini-4-hydrogen'
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

    let response;
    try {
      response = await callModel('gemini-4-hydrogen');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('not found')) {
        response = await callModel('gemini-2.5-flash');
      } else {
        throw err;
      }
    }

    const parsed = JSON.parse((response.text ?? '{}').trim()) as { category?: string };
    const category = (parsed.category ?? 'general').trim().slice(0, 32) || 'general';
    res.status(200).json({ category });
  } catch (error: unknown) {
    console.error('categorize-word error:', error);
    const message = error instanceof Error ? error.message : 'Unable to categorize word.';
    res.status(500).json({ error: message });
  }
}
