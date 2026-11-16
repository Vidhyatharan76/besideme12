-- Migration: 002_complete_supabase_schema.sql
-- Complete PostgreSQL schema + Row Level Security (RLS) for Beside Me on Supabase.
-- Run this once in your Supabase Project -> SQL Editor.

CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  local_language TEXT NOT NULL DEFAULT 'en',
  family_role TEXT NOT NULL DEFAULT 'parent',
  focus_visits TEXT NOT NULL DEFAULT '[]',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS local_language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS family_role TEXT NOT NULL DEFAULT 'parent';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS focus_visits TEXT NOT NULL DEFAULT '[]';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.custom_words (
  id TEXT PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  user_word TEXT NOT NULL,
  local_word TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  known BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.starter_word_progress (
  id SERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  word_id TEXT NOT NULL,
  known BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT starter_word_progress_uid_word_unique UNIQUE (user_uid, word_id)
);

CREATE TABLE IF NOT EXISTS public.question_progress (
  id SERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  practiced BOOLEAN NOT NULL DEFAULT FALSE,
  chosen_for_sheet BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT question_progress_uid_question_unique UNIQUE (user_uid, question_id)
);

CREATE TABLE IF NOT EXISTS public.custom_scenarios (
  id TEXT PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  language_code TEXT NOT NULL DEFAULT 'en',
  language_name TEXT NOT NULL DEFAULT 'English',
  local_language_code TEXT NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  title_english TEXT NOT NULL,
  short_title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  is_health_related BOOLEAN NOT NULL DEFAULT FALSE,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS custom_scenarios_user_created_idx
  ON public.custom_scenarios (user_uid, created_at DESC);

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

-- Enable RLS on all user & translation tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starter_word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

-- Grants for Supabase authenticated & anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.custom_words TO authenticated;
GRANT ALL ON TABLE public.starter_word_progress TO authenticated;
GRANT ALL ON TABLE public.question_progress TO authenticated;
GRANT ALL ON TABLE public.custom_scenarios TO authenticated;
GRANT SELECT, INSERT ON TABLE public.translation_cache TO anon, authenticated;

-- Remove any stale or conflicting policies on user tables before recreating clean ones
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'custom_words', 'starter_word_progress', 'question_progress', 'custom_scenarios')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Clean RLS policies: authenticated users can read/write only their own rows
CREATE POLICY "Users manage own profile"
  ON public.users FOR ALL TO authenticated
  USING (auth.uid()::text = uid)
  WITH CHECK (auth.uid()::text = uid);

CREATE POLICY "Users manage own custom_words"
  ON public.custom_words FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid)
  WITH CHECK (auth.uid()::text = user_uid);

CREATE POLICY "Users manage own starter_word_progress"
  ON public.starter_word_progress FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid)
  WITH CHECK (auth.uid()::text = user_uid);

CREATE POLICY "Users manage own question_progress"
  ON public.question_progress FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid)
  WITH CHECK (auth.uid()::text = user_uid);

CREATE POLICY "Users manage own custom_scenarios"
  ON public.custom_scenarios FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid)
  WITH CHECK (auth.uid()::text = user_uid);

-- Translation cache policies: anyone can read; insert machine-translated static rows only
DROP POLICY IF EXISTS "Anon can read translation cache" ON public.translation_cache;
CREATE POLICY "Anon can read translation cache"
  ON public.translation_cache FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert machine translations only" ON public.translation_cache;
CREATE POLICY "Anon can insert machine translations only"
  ON public.translation_cache FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'machine');

-- Automatically create public.users row on auth signup + backfill existing auth users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (uid, email, display_name)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
  )
  ON CONFLICT (uid) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

INSERT INTO public.users (uid, email)
SELECT id::text, COALESCE(email, '')
FROM auth.users
ON CONFLICT (uid) DO NOTHING;
