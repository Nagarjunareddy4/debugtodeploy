-- ================================================================
-- DebugToDeploy: Supabase Schema Migrations
-- Run this in your Supabase SQL Editor (Project > SQL Editor)
-- Safe to re-run — all operations are idempotent.
-- ================================================================

-- 1. Add new columns to profiles table (safe to run multiple times)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE,
  ADD COLUMN IF NOT EXISTS labs_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS readiness_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS roadmap_data TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS generated_labs JSONB,
  ADD COLUMN IF NOT EXISTS generated_interviews JSONB,
  ADD COLUMN IF NOT EXISTS generated_docs JSONB,
  ADD COLUMN IF NOT EXISTS read_docs_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS completed_roadmap_tasks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interview_scores JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_subscription_plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS autopay_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_failures INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  -- FIX DASH-001: quiz tracking columns
  ADD COLUMN IF NOT EXISTS quiz_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_quiz_date DATE,
  ADD COLUMN IF NOT EXISTS total_quiz_xp INTEGER DEFAULT 0,
  -- Consent columns
  ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepted_privacy_policy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_policy_version TEXT,
  -- Profile deactivation
  ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN DEFAULT FALSE,
  -- Auto renew
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE,
  -- Referral
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  -- Roadmap version tracking
  ADD COLUMN IF NOT EXISTS roadmap_version TEXT,
  ADD COLUMN IF NOT EXISTS generated_certificates JSONB;

-- 2. Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL UNIQUE,
  amount_inr INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  billing_period TEXT DEFAULT 'month',
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert plan data
INSERT INTO plans (name, plan_type, amount_inr, billing_period, description, features)
VALUES 
  ('Free Fleet', 'free', 0, 'month', 'Foundation plan', '["1 AI Roadmap/week", "2 AI searches/day", "Basic Cloud Labs"]'::jsonb),
  ('Fleet Captain Monthly', 'pro_monthly', 499, 'month', 'Full-throttle engineering', '["Unlimited Cloud Sandbox", "AI Portfolio Builder", "Unlimited Interviews", "Unlimited Roadmaps"]'::jsonb),
  ('Fleet Captain Yearly', 'pro_yearly', 3999, 'year', 'Full-throttle engineering', '["Unlimited Cloud Sandbox", "AI Portfolio Builder", "Unlimited Interviews", "Unlimited Roadmaps"]'::jsonb)
ON CONFLICT DO NOTHING;

-- 3. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL REFERENCES plans(plan_type),
  subscription_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  autopay_enabled BOOLEAN DEFAULT FALSE,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  next_billing_date TIMESTAMP,
  cancelled_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_sub_id ON subscriptions(subscription_id);

-- 4. Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_id TEXT UNIQUE,
  order_id TEXT,
  amount_inr INTEGER,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);

-- 5. Create activity_log table for real-time progress graphs
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  labs_done INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- FIX DASH-001: Create quiz_completions table (was missing from original migrations)
CREATE TABLE IF NOT EXISTS quiz_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completion_date DATE NOT NULL,
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 5,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, completion_date)
);

CREATE INDEX IF NOT EXISTS idx_quiz_completions_user ON quiz_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_date ON quiz_completions(completion_date);

-- 6. Enable Row Level Security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_completions ENABLE ROW LEVEL SECURITY;

-- 7. Drop ALL existing policies before recreating (prevents duplicate-policy errors on re-run)
-- activity_log policies
DROP POLICY IF EXISTS "Users can read own activity"   ON activity_log;
DROP POLICY IF EXISTS "Users can insert own activity" ON activity_log;
DROP POLICY IF EXISTS "Users can update own activity" ON activity_log;

-- profiles policies (drop ALL variants including duplicates from old migrations)
DROP POLICY IF EXISTS "Users can view own profile"    ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"  ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"  ON profiles;
-- FIX SEC-007: Drop the overly-permissive anonymous read policy
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON profiles;

-- subscriptions / payments / plans policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Plans are publicly readable" ON plans;

-- quiz_completions policies
DROP POLICY IF EXISTS "Users manage own quiz completions" ON quiz_completions;

-- 8. Recreate all policies cleanly (no duplicates)
CREATE POLICY "Users can read own activity"   ON activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity" ON activity_log FOR UPDATE USING (auth.uid() = user_id);

-- FIX SEC-007: Only authenticated owner can SELECT their own profile row.
-- Public portfolio uses a separate view (see below) that exposes only safe fields.
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payments"      ON payments      FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Plans are publicly readable"      ON plans         FOR SELECT USING (true);

-- Quiz completions — owner-only access
CREATE POLICY "Users manage own quiz completions" ON quiz_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FIX SEC-007: Safe public view exposing only non-sensitive profile fields
-- DROP first to allow column changes (CREATE OR REPLACE cannot rename columns)
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT
    id,
    username,
    full_name,
    avatar_url,
    xp,
    level,
    streak,
    readiness_score,
    subscription_status,
    labs_completed,
    is_deactivated
  FROM profiles;

-- 9. Protect sensitive columns from being updated by the client
-- FIX BUG-006: Use correct JWT claim check instead of current_setting('role')
CREATE OR REPLACE FUNCTION protect_sensitive_profile_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Correctly read the Supabase role from the JWT claims
  v_role := coalesce(
    current_setting('request.jwt.claims', true)::json->>'role',
    'anon'
  );

  IF v_role <> 'service_role' THEN
    -- Prevent client from modifying payment/subscription/gamification fields
    NEW.subscription_status        := OLD.subscription_status;
    NEW.subscription_id            := OLD.subscription_id;
    NEW.current_subscription_plan  := OLD.current_subscription_plan;
    NEW.subscription_end_date      := OLD.subscription_end_date;
    NEW.payment_method             := OLD.payment_method;
    NEW.payment_failures           := OLD.payment_failures;
    NEW.xp                         := OLD.xp;
    NEW.level                      := OLD.level;
    NEW.readiness_score            := OLD.readiness_score;
    NEW.email                      := OLD.email;
    NEW.labs_completed             := OLD.labs_completed;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_columns ON profiles;
CREATE TRIGGER tr_protect_sensitive_profile_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_sensitive_profile_columns();

-- 10. Enable Realtime (safe — skips if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'activity_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'quiz_completions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quiz_completions;
  END IF;
END $$;

-- ================================================================
-- 11. Storage Bucket & Policies for Avatars
-- ================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar."     ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar."    ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( 
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar."
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( 
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ================================================================
-- 12. Secure RPC for Lab Completion
-- FIX BUG-007: Use TEXT lab IDs (AI generates 'lab-0', 'lab-1' etc.)
--              Store count as increment, not cast lab_id to INTEGER.
-- ================================================================
CREATE OR REPLACE FUNCTION complete_lab_securely(lab_id_input TEXT, xp_gain_input INTEGER)
RETURNS VOID AS $$
DECLARE
  v_current_completed INTEGER;
  v_today DATE := CURRENT_DATE;
  v_already_done BOOLEAN;
BEGIN
  -- Get current progress
  SELECT
    labs_completed,
    (completed_roadmap_tasks @> to_jsonb(lab_id_input))
  INTO v_current_completed, v_already_done
  FROM profiles
  WHERE id = auth.uid();

  IF v_current_completed IS NULL THEN
    v_current_completed := 0;
  END IF;

  -- Only award XP and increment if this specific lab hasn't been completed before
  IF NOT v_already_done THEN
    UPDATE profiles
    SET
      labs_completed        = v_current_completed + 1,
      xp                    = xp + xp_gain_input,
      completed_roadmap_tasks = coalesce(completed_roadmap_tasks, '[]'::jsonb) || to_jsonb(lab_id_input)
    WHERE id = auth.uid();

    INSERT INTO activity_log (user_id, date, xp_earned, labs_done)
    VALUES (auth.uid(), v_today, xp_gain_input, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      xp_earned = activity_log.xp_earned + EXCLUDED.xp_earned,
      labs_done = activity_log.labs_done + EXCLUDED.labs_done;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 13. Public RPC for Login & Availability Checks
-- ================================================================
CREATE OR REPLACE FUNCTION check_availability(target_username TEXT, target_email TEXT)
RETURNS TABLE (username_taken BOOLEAN, email_taken BOOLEAN) AS $$
BEGIN
  RETURN QUERY SELECT 
    EXISTS(SELECT 1 FROM profiles WHERE username = target_username),
    EXISTS(SELECT 1 FROM profiles WHERE email = target_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_email_by_username(target_username TEXT)
RETURNS TABLE (email TEXT) AS $$
BEGIN
  RETURN QUERY SELECT profiles.email FROM profiles WHERE profiles.username = target_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 14. Server-side usage limit tracking (FIX SEC-002)
-- Prevents localStorage bypass of free-tier limits.
-- ================================================================
CREATE TABLE IF NOT EXISTS usage_counts (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  period_key TEXT NOT NULL,
  count      INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, action, period_key)
);

ALTER TABLE usage_counts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own usage" ON usage_counts;
CREATE POLICY "Users manage own usage" ON usage_counts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RPC to safely increment and return current count (atomic, no client-side bypass)
CREATE OR REPLACE FUNCTION increment_usage_stats(u_id UUID, u_action TEXT, u_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO usage_counts (user_id, action, period_key, count, updated_at)
  VALUES (u_id, u_action, u_key, 1, NOW())
  ON CONFLICT (user_id, action, period_key)
  DO UPDATE SET
    count      = usage_counts.count + 1,
    updated_at = NOW()
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to get current usage count (read-only, safe)
CREATE OR REPLACE FUNCTION get_usage_count(u_id UUID, u_action TEXT, u_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count INTO v_count
  FROM usage_counts
  WHERE user_id = u_id AND action = u_action AND period_key = u_key;
  RETURN coalesce(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
