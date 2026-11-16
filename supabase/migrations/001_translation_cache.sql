-- Migration: 001_translation_cache.sql
-- Shared cache for machine-translated and human-reviewed static UI content.
-- User-typed custom glossary words are NEVER written to this table.

CREATE TABLE IF NOT EXISTS public.translation_cache (
  id BIGSERIAL PRIMARY KEY,
  source_hash TEXT NOT NULL,
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'machine' CHECK (status IN ('machine', 'reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT translation_cache_hash_lang_unique UNIQUE (source_hash, target_language)
);

CREATE INDEX IF NOT EXISTS translation_cache_lookup_idx
  ON public.translation_cache (target_language, source_hash);

-- Enable Row Level Security (RLS)
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/public clients to read cached translations
DROP POLICY IF EXISTS "Anon can read translation cache" ON public.translation_cache;
CREATE POLICY "Anon can read translation cache"
  ON public.translation_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow inserting machine-translated rows only; never allow inserting 'reviewed' rows from client
DROP POLICY IF EXISTS "Anon can insert machine translations only" ON public.translation_cache;
CREATE POLICY "Anon can insert machine translations only"
  ON public.translation_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'machine');

-- Explicitly deny UPDATE and DELETE for anon/authenticated clients (no update/delete policies created).
REVOKE UPDATE, DELETE ON public.translation_cache FROM anon;

-- Also track home + local language preferences on user profiles if using user_profiles/users table
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS local_language TEXT NOT NULL DEFAULT 'en';
