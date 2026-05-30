import React from 'react';
import { motion } from 'motion/react';
import { Logo } from '../ui/Logo';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
      }}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#05080F]"
    >
      {/* Subtle moving background radial glow */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 0.4, 
          scale: 1,
        }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.12),transparent_60%)] pointer-events-none"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, filter: 'blur(8px)' }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          filter: 'blur(0px)' 
        }}
        exit={{ 
          scale: 1.06, 
          opacity: 0, 
          filter: 'blur(6px)',
          transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } 
        }}
        transition={{ 
          type: 'spring',
          stiffness: 90,
          damping: 16,
        }}
        className="relative flex flex-col items-center gap-6"
      >
        {/* Soft pulsing glow behind the logo */}
        <div className="absolute inset-0 bg-neon-cyan/20 blur-[50px] rounded-full animate-pulse" />
        
        <div className="relative z-10 p-1.5 glass-panel rounded-[2rem] shadow-2xl shadow-black/60 overflow-hidden">
          <Logo className="w-28 h-28 sm:w-32 sm:h-32 rounded-[1.75rem]" />
          {/* High-tech sweeping scanner effect */}
          <motion.div 
            initial={{ top: '-100%' }}
            animate={{ top: '200%' }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
            className="absolute left-0 right-0 h-1/2 bg-gradient-to-b from-transparent via-neon-cyan/20 to-transparent pointer-events-none"
          />
        </div>

        {/* Glowing Brand Tagline */}
        <div className="text-center z-10">
          <h1 className="text-xl font-black italic tracking-widest uppercase">
            <span
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #00FF88 50%, #00D4FF 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Debug<span>To</span>Deploy
            </span>
          </h1>
          <p className="text-[8px] font-black tracking-[0.6em] uppercase text-neon-cyan/80 mt-2.5 animate-pulse">
            Initializing System...
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}


