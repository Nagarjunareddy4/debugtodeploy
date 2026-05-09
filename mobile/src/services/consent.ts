import { supabase } from './supabase';

export const POLICY_VERSION = 'v1.0';

/**
 * Saves the user's consent to the database from the mobile app.
 */
export async function saveMobileUserConsent(userId: string) {
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
    console.error('Error saving mobile consent:', error);
    throw error;
  }
  
  return true;
}
