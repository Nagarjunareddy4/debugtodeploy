-- ================================================================
-- DebugToDeploy: Referral System Migration
-- Run this in your Supabase SQL Editor (Project > SQL Editor)
-- ================================================================

-- 1. Add referral tracking columns to the profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- 2. Create the referral counting and auto-upgrade function
CREATE OR REPLACE FUNCTION process_referral()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Only process if there's a valid referred_by and it's a NEW insertion or the referred_by just got set
  IF NEW.referred_by IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.referred_by IS DISTINCT FROM NEW.referred_by)) THEN
    
    -- Prevent self-referrals
    IF NEW.referred_by = NEW.id THEN
      RETURN NEW;
    END IF;

    -- Increment the referrer's count
    UPDATE profiles
    SET referral_count = COALESCE(referral_count, 0) + 1
    WHERE id = NEW.referred_by
    RETURNING referral_count INTO current_count;

    -- Check if the referrer just hit the goal of 3 referrals
    IF current_count = 3 THEN
      -- Upgrade them to Fleet Captain Monthly (Pro) for 30 days
      UPDATE profiles
      SET 
        subscription_status = 'active',
        current_subscription_plan = 'pro_monthly',
        subscription_end_date = CURRENT_TIMESTAMP + INTERVAL '30 days'
      WHERE id = NEW.referred_by;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to profiles
DROP TRIGGER IF EXISTS tr_process_referral ON profiles;
CREATE TRIGGER tr_process_referral
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION process_referral();

-- 4. Update the core auth handler to capture referral metadata during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_referred_by UUID := NULL;
  v_ref_val TEXT;
BEGIN
  -- Safely parse the referred_by UUID from auth metadata or look up by username
  v_ref_val := new.raw_user_meta_data->>'referred_by';
  
  IF v_ref_val IS NOT NULL AND v_ref_val != '' THEN
    BEGIN
      -- Try to cast to UUID first
      v_referred_by := v_ref_val::UUID;
    EXCEPTION WHEN OTHERS THEN
      -- If it's not a UUID, assume it's a username and look it up
      SELECT id INTO v_referred_by FROM public.profiles WHERE username = v_ref_val LIMIT 1;
    END;
  END IF;

  INSERT INTO public.profiles (id, email, username, referred_by)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'username',
    v_referred_by
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger for auth.users exists (Supabase standard)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
