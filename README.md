# Beside Me — Family Visit Prep Kit

> **Walk into your next meeting ready—your child beside you as support, never the interpreter.**

**Beside Me** is a bilingual, offline-ready Progressive Web App (PWA) built to help immigrant parents prepare for appointments at schools, medical clinics, banks, and community offices.

---

## Why It Was Built

In many immigrant families, children end up acting as interpreters during high-stakes meetings about grades, healthcare, or finances—putting unfair pressure on kids and increasing the risk of miscommunication. **Beside Me** equips parents with clear expectations, practiced questions, key vocabulary, and a ready-to-show request for a professional interpreter, so children can stay supportive helpers rather than interpreters.

---

## Core Features

1. **Guided 4-Step Visit Walkthroughs**
   * Built-in guides for **School** (parent-teacher meetings), **Clinic** (preparation & rights), and **Bank / Official** appointments.
   * Broken into 4 simple steps: *What will happen*, *Who will be there*, *How long it takes*, and *What to bring* (with interactive item checkboxes).
2. **AI Custom Scenario Builder**
   * Generates tailored 4-step preparation kits, bring-along checklists, 6–8 visit-specific questions, and 8–12 vocabulary terms from a short prompt (e.g., *"Preparing for a School Counselor Meeting"*).
   * Saved directly to the user's Supabase account and accessible with the exact same workflow as built-in visits.
3. **Bilingual Question Practice & Cheat-Sheet Pinning**
   * Side-by-side question cards displayed in both the parent's home language and the local desk language.
   * Mark questions as **Practiced** and pin key questions directly to a printable cheat sheet.
4. **My Words Glossary & AI Helpers**
   * Starter vocabulary grouped by visit type plus custom user-added words.
   * Automatic translation between home and local languages.
   * Automatic topic categorization (detects existing categories or creates new ones like *Dental*, *Pharmacy*, *Housing*, or *School Counselor Meeting*).
   * On-demand **Explain simply** AI definitions with plain-language context.
5. **Interpreter Request Card**
   * High-contrast bilingual card requesting a professional interpreter in the user's preferred language.
   * Includes a **Full-Screen Mode** for front desks and clean black-and-white A4 print formatting.
6. **One-Page Printable Visit Cheat Sheet**
   * Aggregates key phrases, chosen questions, and saved vocabulary—filterable by visit—formatted cleanly on a single A4 black-and-white sheet.
7. **Progress Tracker & Account Onboarding**
   * Tracks known words, practiced questions, and saved custom visits, paired with an onboarding flow for language preferences, family role, and focus areas.

---

## How It Works

* **Dual-Language System (31 Languages, LTR & RTL):** Users choose both their home language (`My language`) and the local desk language (`Local language`). Curated UI strings load from static locale bundles (`en`, `es`), while additional languages are translated on demand and cached in Supabase and local storage for offline reuse—complete with script-appropriate typography and automatic `LTR` / `RTL` layout flipping.
* **Unified Visit Workflow:** Both built-in visits and AI-generated custom scenarios share the same 4-step preparation walkthrough, checklist, question practice list, and printable cheat-sheet integration.
* **Cloud Sync & Offline PWA:** Authenticated via **Supabase Auth**, with user profiles, progress, vocabulary, and custom scenarios persisted in **Supabase PostgreSQL**. A service worker (`vite-plugin-pwa`) caches assets and fonts so saved cards, cheat sheets, and checklists remain accessible offline in clinic waiting rooms or school hallways.
* **Server-Side AI with Automatic Fallback:** All AI endpoints run server-side using the `@google/genai` SDK (`gemini-4-hydrogen` primary, with automatic fallback to `gemini-3.1-flash-lite` and `gemini-2.5-flash` on transient or capacity errors).

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, React Router (`HashRouter`), Tailwind CSS v4, Lucide Icons, `vite-plugin-pwa` |
| **Backend / API** | Express (`server.ts`) for local Node runtime + self-contained Vercel serverless functions (`/api/ai/*`) |
| **Database & Auth** | Supabase Auth & PostgreSQL (Drizzle ORM schema + SQL migrations) |
| **AI & Translation** | Google `@google/genai` SDK (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`) + cached translation layer |

---

## Getting Started

### Prerequisites
* Node.js 20+
* A Supabase project (for Auth & PostgreSQL persistence)
* A Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/your-username/beside-me.git](https://github.com/your-username/beside-me.git)
   cd beside-me
