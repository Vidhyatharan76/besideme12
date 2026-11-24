# Beside Me — Family Visit Prep Kit

A mobile-first, dark-mode, offline-ready web application helping immigrant families prepare for school, clinic, and bank or official visits—so the parent walks in confident and the child stays a helper or supporter, never the interpreter.

## Language Support

**2 languages reviewed by humans (English, Spanish); additional languages machine-translated via Gemini and cached.**

- **Dual Language Pair**: Families pick both **"My language"** (`homeLanguage`) and **"Local language"** (`localLanguage`, default English) using searchable language pickers showing native + English names across 31 BCP-47 languages.
- **3-Layer Translation Cache**:
  1. **Static human-reviewed JSON** (`/src/locales/en.json`, `/src/locales/es.json`, and any additional human-reviewed JSON files marked `"status": "reviewed"`) — used immediately with zero AI warning.
  2. **Client `localStorage` + PostgreSQL `translation_cache`** (`supabase/migrations/001_translation_cache.sql`, `src/db/translationCache.ts`) — shares cached translations of static app content across users.
  3. **On-demand Gemini Edge translation** (`POST /api/edge` with `task: "translate_content"`) — translates missing static keys into plain, respectful language, caches them as `status = 'machine'`, and shows the visible notice: *"Translated by AI. Please check important words with someone you trust."*
- **Privacy for User-Typed Words**: Custom glossary words entered by a parent can be translated on demand (`task: "translate_word"`), and are **never** written to `translation_cache`.
- **RTL & Dynamic Script Fonts**: Automatically switches `dir="rtl"` for Arabic, Urdu, and Persian, uses CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`), and loads Noto Sans + script-specific Noto fonts on demand.

## Key Principles

- **Offline ready + Account Sync**: Works offline immediately via `localStorage` and `vite-plugin-pwa` (falling back gracefully to English if a language has not yet been cached offline), and optionally syncs words, practiced questions, cheat-sheet picks, and both language preferences to Supabase PostgreSQL with Email & Password Authentication.
- **Static & full-stack friendly**: Uses `HashRouter` from `react-router-dom` and an Express backend (`server.ts`) with Drizzle ORM (`src/db/`).
- **Accessible & printable**: Dark mode UI with WCAG AA contrast, semantic HTML, visible focus states, per-element `lang`/`dir` attributes, `prefers-reduced-motion` support, and a clean black-and-white one-page A4 print layout.

## Project Structure

- `/server.ts`: Express API server (`/api/prep/*`, `/api/translation-cache`, `/api/edge`, `/api/ai/*`) + Vite middleware in dev / static `dist` in prod
- `/src/db`: Drizzle ORM schema (`schema.ts`), connection pool (`index.ts`), `drizzle.config.ts`, and query helpers (`users.ts`, `prepData.ts`, `translationCache.ts`)
- `/supabase/migrations/001_translation_cache.sql`: PostgreSQL migration + RLS policies for `translation_cache` (`anon` SELECT + INSERT `machine` rows only; no UPDATE/DELETE) and `users.local_language`
- `/scripts/preload-translations.ts`: Pre-populates `translation_cache` for chosen languages
- `/src/locales`: Reviewed locale JSON files (`en.json`, `es.json`), BCP-47 catalog (`languages.ts`), and automatic loader (`index.ts`)
- `/src/hooks`: `useLocalStorage`, `useTranslation`, `useAppState`, `usePWAInstall`, `useOnlineStatus`
- `/src/components`: `Layout`, `LanguagePicker`, `BilingualPhrase`, `StepCard`, `AuthBar`, `PWAInstallButton`, `OfflineIndicator`, `ScenarioIcon`
- `/src/pages`: `HomePage`, `ScenarioPage`, `QuestionsPage`, `WordsPage`, `InterpreterCardPage`, `CheatSheetPage`, `ProgressPage`, `BuildScenarioPage`

## Run Instructions

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the full-stack development server (Express + Vite on port 3000):
   ```bash
   npm run dev
   ```
3. (Optional) Pre-populate `translation_cache` for additional languages:
   ```bash
   npm run preload -- ar ur hi ta ja
   ```
4. Type-check and build for production:
   ```bash
   npm run lint
   npm run build
   ```
5. Start the production server:
   ```bash
   NODE_ENV=production npm start
   ```

## AI Tools & Acknowledgements

AI tools played a role in the design and development of Beside Me.

### Tools Used

- **[v0](https://v0.dev/)** — Used to generate the application's UI and interface components.
- **[Google Gemini](https://gemini.google.com/)** — Used as a coding assistant for implementation guidance, code suggestions, debugging, and development support.
- **Google Gemini API** — Powers AI-driven features within Beside Me, including custom scenario generation, vocabulary categorisation, and the "Explain Simply" functionality.

### AI Usage Disclosure

The user interface was generated using v0, while Gemini assisted with coding and also powers selected AI features in the application.

The generated code and AI-assisted implementations were integrated, reviewed, tested, and refined as part of the development process. The development team takes responsibility for understanding the final implementation and its functionality.

