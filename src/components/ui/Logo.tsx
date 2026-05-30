import React from 'react';

/**
 * Logo — renders the vector neon double chevron (>>) deploy icon.
 * Vector SVG guarantees 0ms load time, no flicker, and pixel-perfect scaling.
 */
export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <div className={`relative ${className} flex-shrink-0 flex items-center justify-center`}>
      <svg className="w-full h-full logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#00FF88" />
          </linearGradient>
          <filter id="logoGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="100" height="100" rx="22" fill="#05080F" />
        
        <path d="M26 30 L38 42 L26 54" stroke="#00D4FF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#logoGlow)" />
        <path d="M40 30 L52 42 L40 54" stroke="#00FF88" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#logoGlow)" />
        
        <rect x="26" y="62" width="14" height="5" rx="2.5" fill="url(#logoGrad)" filter="url(#logoGlow)" />
        <line x1="43" y1="64.5" x2="74" y2="64.5" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round" filter="url(#logoGlow)" />
        <path d="M70 60 L77 64.5 L70 69" stroke="#00FF88" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#logoGlow)" />
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
