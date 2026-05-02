import { supabase } from './supabase';

// Usage limit tracker for free and pro users
// Limits are stored in localStorage, keyed by action + date/week/month id.

const FREE_LIMITS: Record<string, number> = {
  roadmap: 2,    // 2 roadmap generations per week
  search: 2,     // 2 AI searches per day
  lab: Infinity, // Structural limit (1st lab only) handles this now
  interview: 1,  // 1 interview per week
  docs: Infinity,
  certificates: Infinity,
  chat: 3,       // 3 support chats per day
};

const PRO_LIMITS: Record<string, number> = {
  roadmap: Infinity,
  search: Infinity,
  lab: Infinity,
  interview: Infinity,
  docs: Infinity,
  certificates: Infinity,
  chat: 50,      // 50 support chats per day for pro
};

function todayKey(action: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `usage_${action}_${today}`;
}

function weekKey(action: string): string {
  const now = new Date();
  const firstDayOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const pastDaysOfYear = Math.floor((now.getTime() - firstDayOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
  return `usage_${action}_week_${now.getUTCFullYear()}-${weekNumber}`;
}

function monthKey(action: string): string {
  const now = new Date();
  return `usage_${action}_month_${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
}

function usageKey(action: string, isPro: boolean): string {
  if (isPro) {
    if (action === 'roadmap') return monthKey(action);
    return todayKey(action); // Actually doesn't matter much for Infinity
  }
  
  if (['roadmap', 'lab', 'interview'].includes(action)) {
    return weekKey(action);
  }
  return todayKey(action);
}

export function getUsageCount(action: string, isPro: boolean = false): number {
  const key = usageKey(action, isPro);
  return parseInt(localStorage.getItem(key) || '0', 10);
}

export async function incrementUsage(action: string, isPro: boolean = false): Promise<void> {
  if (isPro) return; 
  const key = usageKey(action, isPro);
  const current = getUsageCount(action, isPro);
  
  // Update local cache
  localStorage.setItem(key, String(current + 1));

  // Background sync to Database (Hardening)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.rpc('increment_usage_stats', { 
      u_id: user.id, 
      u_action: action, 
      u_key: key 
    }).catch(err => console.warn('Usage sync failed:', err));
  }
}

export function isLimitReached(action: string, isPro: boolean): boolean {
  if (isPro) return false; // Pro users are never limited
  const limits = isPro ? PRO_LIMITS : FREE_LIMITS;
  const limit = limits[action] ?? Infinity;
  return getUsageCount(action, isPro) >= limit;
}

export function getRemainingUsage(action: string, isPro: boolean): number {
  const limits = isPro ? PRO_LIMITS : FREE_LIMITS;
  const limit = limits[action] ?? Infinity;
  return Math.max(0, limit - getUsageCount(action, isPro));
}

export function getLimitMessage(action: string, isPro: boolean = false): string {
  if (isPro) {
    if (action === 'roadmap') return `Monthly limit of 100 AI Roadmap generations reached.`;
    return `Unlimited access unlocked with Pro.`;
  }

  const messages: Record<string, string> = {
    roadmap: `Weekly limit of 2 AI Roadmap generations reached. Upgrade to Pro for 100 generations/month.`,
    search: `Daily limit of 2 AI Assistant searches reached. Come back tomorrow or Upgrade to Pro for unlimited search.`,
    lab: `Weekly limit of 2 Cloud Labs reached. Upgrade to Pro to unlock unlimited practical environments.`,
    interview: `Weekly limit of 1 Mock Interview reached. Upgrade to Pro for unlimited interview practice.`,
    chat: `Daily chat limit reached. Please submit a support ticket for further assistance or upgrade to Pro for higher limits.`,
  };
  return messages[action] || 'Limit reached.';
}
