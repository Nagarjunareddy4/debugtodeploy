import React from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
      }}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0A0A0B]"
    >
      {/* Subtle moving background radial glow */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 0.3, 
          scale: 1,
        }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,197,253,0.15),transparent_60%)] pointer-events-none"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, filter: 'blur(8px)' }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          filter: 'blur(0px)' 
        }}
        exit={{ 
          scale: 1.05, 
          opacity: 0, 
          filter: 'blur(5px)',
          transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } 
        }}
        transition={{ 
          type: 'spring',
          stiffness: 100,
          damping: 18,
        }}
        className="relative flex flex-col items-center gap-6"
      >
        {/* Soft pulsing glow behind the logo */}
        <div className="absolute inset-0 bg-soft-blue/20 blur-[40px] rounded-full animate-pulse" />
        
        <div className="relative z-10 p-1 bg-[#16161a] border-4 border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
          <img 
            src="/logo.jpg" 
            alt="DebugToDeploy Logo" 
            className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-2xl"
          />
          {/* High-tech sweeping scanner effect */}
          <motion.div 
            initial={{ top: '-100%' }}
            animate={{ top: '200%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
            className="absolute left-0 right-0 h-1/2 bg-gradient-to-b from-transparent via-soft-blue/15 to-transparent pointer-events-none"
          />
        </div>

        {/* Glowing Brand Tagline */}
        <div className="text-center z-10">
          <h1 className="text-lg font-black italic tracking-wider text-white">
            DEBUG<span className="text-soft-blue">TO</span>DEPLOY
          </h1>
          <p className="text-[7px] font-black tracking-[0.5em] uppercase text-text-dim mt-1.5 animate-pulse">
            Initializing System...
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}


