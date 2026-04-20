-- ================================================================
-- DebugToDeploy: Supabase Schema Migrations
-- Run this in your Supabase SQL Editor (Project > SQL Editor)
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
  ADD COLUMN IF NOT EXISTS interview_scores JSONB DEFAULT '{}'::jsonb;

-- 2. Create activity_log table for real-time progress graphs
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  labs_done INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- 3. Enable Row Level Security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies before recreating (safe approach)
DROP POLICY IF EXISTS "Users can read own activity"   ON activity_log;
DROP POLICY IF EXISTS "Users can insert own activity" ON activity_log;
DROP POLICY IF EXISTS "Users can update own activity" ON activity_log;
DROP POLICY IF EXISTS "Users can view own profile"    ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"  ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"  ON profiles;

-- 5. Recreate all policies cleanly
CREATE POLICY "Users can read own activity"   ON activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity" ON activity_log FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);

-- Protect sensitive columns from being updated by the client
CREATE OR REPLACE FUNCTION protect_sensitive_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (current_setting('role') <> 'service_role') THEN
    NEW.subscription_status := OLD.subscription_status;
    NEW.xp := OLD.xp;
    NEW.level := OLD.level;
    NEW.readiness_score := OLD.readiness_score;
    NEW.email := OLD.email;
    NEW.labs_completed := OLD.labs_completed;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_sensitive_profile_columns ON profiles;
CREATE TRIGGER tr_protect_sensitive_profile_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_sensitive_profile_columns();

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Enable Realtime for live subscriptions (safe — skips if already a member)
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
END $$;

-- ================================================================
-- 7. Storage Bucket & Policies for Avatars
-- ================================================================

-- Create the avatars bucket if it doesn't exist (must be public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies just in case to avoid duplicates
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;

-- Create policies to allow public read and authenticated insert/update
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

-- 8. Secure RPC for Lab Completion
CREATE OR REPLACE FUNCTION complete_lab_securely(lab_id_input TEXT, xp_gain_input INTEGER)
RETURNS VOID AS $$
DECLARE
  v_current_completed INTEGER;
  v_new_completed INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current progress
  v_current_completed := (SELECT labs_completed FROM profiles WHERE id = auth.uid());
  
  -- If profile not found, do nothing
  IF v_current_completed IS NULL THEN
    v_current_completed := 0;
  END IF;

  -- Only update if it's a new lab or higher progress
  v_new_completed := GREATEST(v_current_completed, lab_id_input::INTEGER);
  
  -- Update profile with SERVICE ROLE (bypasses trigger)
  UPDATE profiles 
  SET 
    labs_completed = v_new_completed,
    xp = xp + (CASE WHEN lab_id_input::INTEGER > v_current_completed THEN xp_gain_input ELSE 0 END)
  WHERE id = auth.uid();

  -- Update activity log
  IF (lab_id_input::INTEGER > v_current_completed) THEN
    INSERT INTO activity_log (user_id, date, xp_earned, labs_done)
    VALUES (auth.uid(), v_today, xp_gain_input, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      xp_earned = activity_log.xp_earned + EXCLUDED.xp_earned,
      labs_done = activity_log.labs_done + EXCLUDED.labs_done;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Public RPC for Login & Availability Checks
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
