import React from 'react';

/**
 * Logo — renders the vector neon double chevron (>>) deploy icon.
 * Vector SVG guarantees 0ms load time, no flicker, and pixel-perfect scaling.
 */
export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  const uniqueId = React.useId().replace(/:/g, "");
  const chevronGrad = `chevronGrad-${uniqueId}`;
  const lineGrad = `lineGrad-${uniqueId}`;
  const logoGlow = `logoGlow-${uniqueId}`;

  return (
    <div className={`relative ${className} flex-shrink-0 flex items-center justify-center`}>
      <svg className="w-full h-full logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={chevronGrad} x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#00FF88" />
          </linearGradient>
          <linearGradient id={lineGrad} x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0" />
            <stop offset="30%" stopColor="#00D4FF" stopOpacity="1" />
            <stop offset="100%" stopColor="#00FF88" stopOpacity="1" />
          </linearGradient>
          <filter id={logoGlow} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <rect width="100" height="100" rx="24" fill="#05080F" />
        
        {/* Left Chevron */}
        <polygon points="20,30 32,30 50,48 32,66 20,66 38,48" fill="#00D4FF" filter={`url(#${logoGlow})`} />
        
        {/* Right Chevron */}
        <polygon points="38,30 50,30 68,48 50,66 38,66 56,48" fill={`url(#${chevronGrad})`} filter={`url(#${logoGlow})`} />
        
        {/* Underscore */}
        <rect x="62" y="56" width="14" height="10" rx="2" fill="#00FF88" filter={`url(#${logoGlow})`} />
        
        {/* Arrow Line */}
        <line x1="14" y1="76" x2="78" y2="76" stroke={`url(#${lineGrad})`} strokeWidth="2" strokeLinecap="round" filter={`url(#${logoGlow})`} />
        
        {/* Arrowhead */}
        <polygon points="76,70 88,76 76,82 79,76" fill="#00FF88" filter={`url(#${logoGlow})`} />
      </svg>
    </div>
  );
};

export const LogoFull = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className} group cursor-pointer`}>
      <Logo className="w-10 h-10" />
      <div className="flex flex-col leading-none">
        <span
          className="font-black text-lg tracking-tighter uppercase"
          style={{
            background: 'linear-gradient(135deg, #00D4FF 0%, #00FF88 60%, #00D4FF 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Debug<span style={{ WebkitTextFillColor: 'transparent' }}>To</span>Deploy
        </span>
        <span className="text-[9px] uppercase font-black tracking-[0.20em] text-text-dim mt-0.5">
          Automate Everything
        </span>
      </div>
    </div>
  );
};
