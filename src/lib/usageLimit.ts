// Usage limit tracker for free-tier users
// Limits are stored in localStorage, keyed by action + date (YYYY-MM-DD)

const FREE_LIMITS: Record<string, number> = {
  roadmap: 1,   // 1 roadmap generation per day
  search: 2,    // 2 AI searches per day
  lab: 3,       // 3 labs per day
  interview: 2, // 2 interviews per day
};

function todayKey(action: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `usage_${action}_${today}`;
}

export function getUsageCount(action: string): number {
  const key = todayKey(action);
  return parseInt(localStorage.getItem(key) || '0', 10);
}

export function incrementUsage(action: string): void {
  const key = todayKey(action);
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
  const limit = FREE_LIMITS[action];
  const messages: Record<string, string> = {
    roadmap: `Free plan allows ${limit} roadmap generation per day. Upgrade to Pro for unlimited access.`,
    search: `Free plan allows ${limit} AI searches per day. Upgrade to Pro for unlimited access.`,
    lab: `Free plan allows ${limit} labs per day. Upgrade to Pro for unlimited access.`,
    interview: `Free plan allows ${limit} mock interviews per day. Upgrade to Pro for unlimited access.`,
  };
  return messages[action] || 'Daily limit reached. Please upgrade to Pro.';
}
