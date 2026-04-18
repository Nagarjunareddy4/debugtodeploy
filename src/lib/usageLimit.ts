// Usage limit tracker for free-tier users
// Limits are stored in localStorage, keyed by action + date (YYYY-MM-DD)

const FREE_LIMITS: Record<string, number> = {
  roadmap: 1,   // 1 roadmap generation per day
  search: 2,    // 2 AI searches per day
  lab: 3,       // 3 labs per day
  interview: 2, // 2 interviews per day
  docs: 1,      // 1 learning path generation per day
  certificates: 1, // 1 certificate recommendation per day
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
    roadmap: `Daily limit of ${limit} roadmap generation reached for Beta.`,
    search: `Daily limit of ${limit} AI searches reached for Beta.`,
    lab: `Daily limit of ${limit} labs reached for Beta.`,
    interview: `Daily limit of ${limit} mock interviews reached for Beta.`,
    docs: `Daily limit of ${limit} AI learning path generation reached for Beta.`,
    certificates: `Daily limit of ${limit} certificate recommendations reached for Beta.`,
  };
  return messages[action] || 'Daily limit reached.';
}
