import { supabase } from './supabase';

export const POLICY_VERSION = 'v1.0';

export interface UserConsent {
  accepted_terms: boolean;
  accepted_privacy_policy: boolean;
  accepted_at: string;
  accepted_policy_version: string;
}

/**
 * Checks if the current user has accepted the latest policy version.
 */
export async function checkUserConsent(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return true; // Not logged in, handled by auth logic

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('accepted_policy_version')
    .eq('id', user.id)
    .single();

  if (error || !profile) return false;

  return profile.accepted_policy_version === POLICY_VERSION;
}

/**
 * Saves the user's consent to the database.
 */
export async function saveUserConsent(userId: string) {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('profiles')
    .update({
      accepted_terms: true,
      accepted_privacy_policy: true,
      accepted_at: now,
      accepted_policy_version: POLICY_VERSION
    })
    .eq('id', userId);

  if (error) {
    console.error('Error saving consent:', error);
    throw error;
  }
  
  return true;
}
