-- ============================================================
--  ECONOVO — Reactions table migration
--  Run this in your Supabase SQL Editor
--  (Dashboard → SQL Editor → New Query → paste → Run)
-- ============================================================

-- 1. Create reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji      TEXT NOT NULL,                          -- e.g. '👍', '🔥', '❤️'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One reaction per emoji per user per post
    CONSTRAINT reactions_unique_per_user UNIQUE (post_id, user_id, emoji)
);

-- 2. Index for fast lookups by post
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions (post_id);

-- 3. Enable Row Level Security
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Anyone authenticated can READ reactions (to see counts)
CREATE POLICY "Authenticated users can read reactions"
    ON public.reactions
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can INSERT their own reactions
CREATE POLICY "Authenticated users can add reactions"
    ON public.reactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own reactions
CREATE POLICY "Users can delete own reactions"
    ON public.reactions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
--  DONE — your reactions table is ready.
--  The feed JS will now load, display and toggle reactions.
-- ============================================================
