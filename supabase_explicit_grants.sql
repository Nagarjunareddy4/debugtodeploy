-- ================================================================
-- DebugToDeploy: Explicit Data API Grants (Supabase May 2026 Advisory)
-- ================================================================
-- Starting May 30, 2026, Supabase will no longer automatically expose 
-- new tables to the Data API (supabase-js). This migration ensures 
-- all your existing tables are explicitly granted the correct permissions.

-- 1. Profiles Table (User settings, XP, and AI results)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- 2. Plans Table (Pricing and feature lists)
GRANT SELECT ON public.plans TO authenticated;
GRANT SELECT ON public.plans TO anon;
GRANT ALL ON public.plans TO service_role;

-- 3. Subscriptions Table (User subscription history)
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- 4. Payments Table (Transaction records)
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- 5. Activity Log Table (Daily XP and progress tracking)
GRANT SELECT, INSERT, UPDATE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

-- 6. Ensure RLS is still active (Future-proofing)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Note: In Supabase, GRANT gives the Data API permission to see the table,
-- while RLS (Policies) controls which rows a specific user can actually see/edit.
-- You need BOTH for your app to continue working after Oct 30, 2026.
