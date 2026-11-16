-- Migration: 003_custom_scenarios.sql
-- Stores user-created "Build my own scenario" guides in Supabase (instead of device localStorage).
-- Run this in your Supabase Project -> SQL Editor.

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

ALTER TABLE public.custom_scenarios ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.custom_scenarios TO authenticated;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'custom_scenarios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "Users manage own custom_scenarios"
  ON public.custom_scenarios FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid)
  WITH CHECK (auth.uid()::text = user_uid);
