import { supabase } from './supabase';

type EventName = 
  | 'page_view' 
  | 'lab_started' 
  | 'lab_completed' 
  | 'roadmap_generated' 
  | 'referral_link_copied' 
  | 'portfolio_shared' 
  | 'pro_upgrade_clicked';

export const trackEvent = async (name: EventName, properties: Record<string, any> = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // In a real app, you would send this to a service like Mixpanel, PostHog, or a custom Supabase table.
    console.log(`[Analytics] Tracked: ${name}`, {
      user_id: user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
      ...properties,
    });

    // Optional: Log to Supabase if a tracking table exists
    // await supabase.from('analytics_events').insert({
    //   event_name: name,
    //   user_id: user?.id,
    //   metadata: properties
    // });

  } catch (err) {
    console.warn('Analytics tracking failed:', err);
  }
};
