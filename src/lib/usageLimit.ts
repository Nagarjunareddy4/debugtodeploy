// Usage limit tracker for free and pro users
// Limits are stored in localStorage, keyed by action + date/week/month id.

const FREE_LIMITS: Record<string, number> = {
  roadmap: 1,    // 1 roadmap generation per week
  search: 2,     // 2 AI searches per day
  lab: 2,        // 2 labs per week
  interview: 1,  // 1 interview per week
  docs: Infinity,
  certificates: Infinity,
};

const PRO_LIMITS: Record<string, number> = {
  roadmap: 100,  // 100 roadmap generations per month
  search: Infinity,
  lab: Infinity,
  interview: Infinity,
  docs: Infinity,
  certificates: Infinity,
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

export function incrementUsage(action: string, isPro: boolean = false): void {
  const key = usageKey(action, isPro);
  const current = getUsageCount(action, isPro);
  localStorage.setItem(key, String(current + 1));
}

export function isLimitReached(action: string, isPro: boolean): boolean {
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
    roadmap: `Weekly limit of 1 AI Roadmap generation reached. Upgrade to Pro for 100 generations/month.`,
    search: `Daily limit of 2 AI Assistant searches reached. Come back tomorrow or Upgrade to Pro for unlimited search.`,
    lab: `Weekly limit of 2 Cloud Labs reached. Upgrade to Pro to unlock unlimited practical environments.`,
    interview: `Weekly limit of 1 Mock Interview reached. Upgrade to Pro for unlimited interview practice.`,
  };
  return messages[action] || 'Limit reached.';
}
