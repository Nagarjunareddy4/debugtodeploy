import React from 'react';

export const Logo = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <div className={`relative ${className} group`}>
      {/* Background shape - Hexagon inspired for DevOps/Engineering */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse"
      >
        <path 
          d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" 
          fill="currentColor" 
          className="text-text-main"
        />
        {/* Debug (Bug) + Deploy (Rocket) hybrid icon */}
        <path 
          d="M50 30 L40 45 L50 60 L60 45 Z" 
          className="text-surface"
          fill="currentColor"
        />
        <rect x="48" y="65" width="4" height="10" className="text-surface" fill="currentColor" rx="1" />
        <circle cx="50" cy="50" r="15" className="text-surface/20" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );
};

export const LogoFull = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo className="w-10 h-10" />
      <div className="flex flex-col">
        <span className="font-black text-xl tracking-tighter leading-none dark:text-white uppercase">DEBUG<span className="text-soft-blue">TO</span>DEPLOY</span>
        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-text-dim mt-0.5">Automate Everything</span>
      </div>
    </div>
  );
};
