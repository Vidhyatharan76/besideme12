# Beside Me — Multilingual QA & Acceptance Checklist

## 1. Script, Direction, and Layout Verification Matrix

| Language | Code | Script / Direction | Font Loaded (`src/lib/fonts.ts`) | Reviewed vs AI Notice | Key Checks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Spanish** | `es` | Latin / LTR | `Noto Sans` | **Reviewed** (`status: "reviewed"`, zero AI banner) | Native `"Español (Spanish)"`, side-by-side `es` + `en` phrases, clean A4 print |
| **Arabic** | `ar` | Arabic / **RTL** (`dir="rtl"`) | `Noto Sans Arabic` + `Noto Sans` | **Machine** (AI banner displayed) | `document.documentElement.dir === "rtl"`, directional arrows mirrored (`rtl:rotate-180`), logical margins (`ms-`, `me-`, `ps-`, `pe-`), clean RTL/LTR mixed bilingual columns |
| **Hindi** | `hi` | Devanagari / LTR | `Noto Sans Devanagari` + `Noto Sans` | **Machine** (AI banner displayed) | Devanagari conjuncts/matras render cleanly on screen & A4 print |
| **Tamil** | `ta` | Tamil / LTR | `Noto Sans Tamil` + `Noto Sans` | **Machine** (AI banner displayed) | Tamil script glyph shaping verified in `BilingualPhrase`, `StepCard`, and print sheet |
| **Japanese** | `ja` | CJK (Kanji/Kana) / LTR | `Noto Sans JP` + `Noto Sans` | **Machine** (AI banner displayed) | Works both as `homeLanguage` and non-English `localLanguage`, CJK wrapping in A4 print |

---

## 2. Print Preview Verification (`@media print` & `.print-bw`)

- **Interpreter Card (`/interpreter-card`)**:
  - Top large block renders in `localLanguage` with `"My preferred language is: <homeLanguage>"` and `"My child is here to support me, not to act as an interpreter."`
  - Home language block renders directly below with matching content.
  - Pure black-on-white contrast (`#000000` on `#ffffff`) with dynamic Noto script font preserved.
- **One-Page A4 Cheat Sheet (`/cheat-sheet`)**:
  - Fits cleanly on A4 (`@page { size: A4; margin: 12mm; }`) with localized date (`Intl.DateTimeFormat`).
  - Side-by-side `[homeLanguage]` and `[localLanguage]` columns for key phrases, chosen questions, and saved words, plus cut-out interpreter card.

---

## 3. Acceptance Tests Verification

1. **Test 1 — Reviewed static pair (`homeLanguage = es`, `localLanguage = en`)**:
   - Uses static `es.json` + `en.json` immediately (`status: "reviewed"`).
   - Zero `POST /api/edge` translation calls needed.
   - Zero machine-translation warning banner displayed.
2. **Test 2 — RTL & Non-reviewed language (`homeLanguage = ar`, `localLanguage = en`)**:
   - `document.documentElement.dir` updates to `"rtl"` and `lang="ar"`.
   - Visible AI banner shown: *"Translated by AI. Please check important words with someone you trust."*
   - `InterpreterCardPage` displays large English text at top (`"I would like a professional interpreter, please."`, `"My preferred language is: العربية (Arabic)"`, `"My child is here to support me, not to act as an interpreter."`) and Arabic text below.
   - Layout mirrors cleanly using CSS logical utilities without clipped text or overflowing cards.
3. **Test 3 — Non-English local desk language (`homeLanguage = es`, `localLanguage = ja`)**:
   - All bilingual components render Spanish (`es`) and Japanese (`ja`) side by side.
   - Interpreter card displays large Japanese desk request at top (for staff) and Spanish below (for parent).
   - Machine-translation notice is visible because `ja` is machine-translated.
4. **Test 4 — 3-Layer Cache Persistence**:
   - Repeating the same language loads instantaneously from `localStorage` (`besideMe_translationCache_v1`) or PostgreSQL `translation_cache` (`GET /api/translation-cache`) without invoking Gemini again.
5. **Test 5 — User-Typed Word Privacy (`WordsPage`)**:
   - Typing a custom word and tapping **Translate** invokes `POST /api/edge` (`task: "translate_word"`), which **never** reads from or writes to `translation_cache`.
   - Saved custom words reside only in `localStorage` (and the user's private `custom_words` table when signed in).
6. **Test 6 — Offline / Edge Failure Resilience**:
   - Disconnecting network or failing `/api/edge` falls back cleanly to English source copy with a calm warning banner (`common.translationOfflineFallback`)—never a blank screen or uncaught crash.
