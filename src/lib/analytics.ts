import { supabase } from './supabase';
import { getCookie, setCookie } from './cookies';

type EventName = 
  | 'page_view' 
  | 'lab_started' 
  | 'lab_completed' 
  | 'roadmap_generated' 
  | 'referral_link_copied' 
  | 'portfolio_shared' 
  | 'pro_upgrade_clicked'
  | 'auth_form_viewed'
  | 'resume_edited';

// Generate a unique ID if one doesn't exist
const getOrCreateVisitorId = () => {
  let visitorId = getCookie('dtd_visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setCookie('dtd_visitor_id', visitorId, 365); // 1 year
  }
  return visitorId;
};

// Generate a session ID that expires in 30 mins of inactivity
const getOrCreateSessionId = () => {
  let sessionId = getCookie('dtd_session_id');
  if (!sessionId) {
    sessionId = 's_' + Math.random().toString(36).substring(2, 10);
  }
  // Refresh expiration on every call (approx 30 mins)
  setCookie('dtd_session_id', sessionId, 0.02); 
  return sessionId;
};

export const trackEvent = async (name: EventName, properties: Record<string, any> = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    
    const eventPayload = {
      event_name: name,
      visitor_id: visitorId,
      session_id: sessionId,
      user_id: user?.id || 'anonymous',
      url: window.location.pathname,
      timestamp: new Date().toISOString(),
      ...properties,
    };

    // 1. Log to console for development
    console.log(`[Analytics] Tracked: ${name}`, eventPayload);

    // 2. Log to Supabase for persistent tracking
    supabase.from('analytics_events').insert(eventPayload).then(({ error }) => {
      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase analytics log failed:', error.message);
      }
    });

  } catch (err) {
    console.warn('Analytics tracking failed:', err);
  }
};
