// Usage limit tracker for free-tier users
// Limits are stored in localStorage, keyed by action + date or week id.

const FREE_LIMITS: Record<string, number> = {
  roadmap: 1,    // 1 roadmap generation per week
  search: 2,     // 2 AI searches per day
  lab: 2,        // 2 labs per week
  interview: 1,  // 1 interview per week
  docs: Infinity, // Unlimited
  certificates: Infinity, // Unlimited
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

function usageKey(action: string): string {
  if (['roadmap', 'lab', 'interview'].includes(action)) {
    return weekKey(action);
  }
  return todayKey(action);
}

export function getUsageCount(action: string): number {
  const key = usageKey(action);
  return parseInt(localStorage.getItem(key) || '0', 10);
}

export function incrementUsage(action: string): void {
  const key = usageKey(action);
  const current = getUsageCount(action);
  localStorage.setItem(key, String(current + 1));
}

export function isLimitReached(action: string, isPro: boolean): boolean {
  if (isPro) return false;
  const limit = FREE_LIMITS[action] ?? Infinity;
  return getUsageCount(action) >= limit;
}

export function getRemainingUsage(action: string, isPro: boolean): number {
  if (isPro) return Infinity;
  const limit = FREE_LIMITS[action] ?? Infinity;
  return Math.max(0, limit - getUsageCount(action));
}

export function getLimitMessage(action: string): string {
  const messages: Record<string, string> = {
    roadmap: `Weekly limit of 1 AI Roadmap generation reached. Upgrade to Pro for unlimited access.`,
    search: `Daily limit of 2 AI Assistant searches reached. Come back tomorrow or Upgrade to Pro.`,
    lab: `Weekly limit of 2 Cloud Labs reached. Upgrade to Pro to unlock unlimited practical environments.`,
    interview: `Weekly limit of 1 Mock Interview reached. Upgrade to Pro for unlimited interview practice.`,
    docs: `Unlimited`,
    certificates: `Unlimited`,
  };
  return messages[action] || 'Limit reached.';
}
