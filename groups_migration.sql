-- ============================================================
--  ECONOVO — Groups + Group Members migration
--  Run this in your Supabase SQL Editor
--  (Dashboard → SQL Editor → New Query → paste → Run)
--
--  This replaces the hardcoded DEFAULT_GROUPS array in
--  dashboard.html with real tables, so member counts reflect
--  actual joins instead of fake starting numbers.
-- ============================================================

-- 1. Groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon_key    TEXT NOT NULL DEFAULT 'sparkles',   -- Lucide icon name, see js/icons.js
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Group membership (join table) — this is what makes the
--    counter real: COUNT(*) on this table per group_id.
CREATE TABLE IF NOT EXISTS public.group_members (
    group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id  ON public.group_members (user_id);

-- 3. RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read groups"
    ON public.groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create groups"
    ON public.groups FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read memberships"
    ON public.group_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join groups themselves"
    ON public.group_members FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups themselves"
    ON public.group_members FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 4. Seed the 4 starter groups (real rows now, not JS objects).
--    Member counts will start at 0 and grow only when someone
--    actually clicks "Join" — no more fake starting numbers.
INSERT INTO public.groups (name, description, icon_key)
SELECT * FROM (VALUES
    ('FinTech & Payments',  'Digital banking, crypto, and financial innovation.', 'credit-card'),
    ('Startups & Founders', 'Building, fundraising, and early-stage ideas.',      'rocket'),
    ('AI & Data Science',   'ML, data analysis, and applied AI projects.',        'brain-circuit'),
    ('Economics Research',  'Academic papers, debates, and economic analysis.',   'bar-chart-3')
) AS seed(name, description, icon_key)
WHERE NOT EXISTS (SELECT 1 FROM public.groups);

-- ============================================================
--  DONE. After running this:
--  1. dashboard.html now fetches groups + a real COUNT(*) of
--     group_members per group, instead of reading DEFAULT_GROUPS.
--  2. Clicking "Join" inserts a group_members row; "Leave"
--     deletes it. The number on screen is always accurate.
-- ============================================================
