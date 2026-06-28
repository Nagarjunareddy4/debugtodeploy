import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * PlanBadge — the single, consistent way "Free" vs "Pro" is communicated
 * across the app (sidebar, dashboard header, settings, portfolio, etc).
 * Pro reads as a clearance level, not a sales banner.
 */
export function PlanBadge({ status, size = 'sm' }: { status?: string; size?: 'sm' | 'md' }) {
  const isPro = status === 'pro';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono uppercase tracking-widest border',
        size === 'sm' ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2.5 py-1',
        isPro
          ? 'border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)] bg-[color-mix(in_srgb,var(--color-neon-cyan)_10%,transparent)]'
          : 'border-[var(--color-border)] text-[var(--color-text-dim)]'
      )}
    >
      {isPro && <Zap className="w-2.5 h-2.5 fill-current" />}
      {isPro ? 'Pro' : 'Free'}
    </span>
  );
}
