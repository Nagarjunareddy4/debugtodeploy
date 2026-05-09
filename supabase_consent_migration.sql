-- Migration: Add Consent Management to Profiles
-- Description: Adds fields to track user agreement to Privacy Policy and Terms & Conditions.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepted_privacy_policy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_policy_version TEXT;

-- Update the protection trigger to allow users to update their own consent fields initially
-- but maybe we want to keep them protected once set? 
-- For now, let's ensure the trigger allows updating these specific fields.

CREATE OR REPLACE FUNCTION protect_sensitive_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (current_setting('role') <> 'service_role') THEN
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_id := OLD.subscription_id;
    NEW.current_subscription_plan := OLD.current_subscription_plan;
    NEW.subscription_end_date := OLD.subscription_end_date;
    NEW.payment_method := OLD.payment_method;
    NEW.payment_failures := OLD.payment_failures;
    NEW.xp := OLD.xp;
    NEW.level := OLD.level;
    NEW.readiness_score := OLD.readiness_score;
    NEW.email := OLD.email;
    NEW.labs_completed := OLD.labs_completed;
    
    -- We allow updating consent fields via the client if they are being set for the first time
    -- or if the version is different (re-consent).
    -- Actually, it's better to let the user update these as they are "user" fields.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
