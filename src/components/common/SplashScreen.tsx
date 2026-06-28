import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../ui/Logo';

/**
 * Cinematic splash screen — smooth, premium, no mechanical phase-jumps.
 *
 * Timeline (fits within the 2s App.tsx window):
 *   0.00s — Pure darkness. Single amber point ignites at screen center.
 *   0.15s — Glow bloom expands outward (radial, amber → teal edge)
 *   0.25s — Logo rises through the bloom on a spring, halo pulses once
 *   0.50s — Orbit ring fades in, slowly rotating
 *   0.70s — Wordmark streams left→right with trailing amber shimmer
 *   1.10s — Tagline fades up
 *   1.20s — Loading arc sweeps (SVG circle stroke-dashoffset)
 *   2.00s — Exit: screen folds upward (translateY -100%, clip-path) — drawer close
 */

const WORDMARK = [
  { ch: 'd', amber: false }, { ch: 'e', amber: false }, { ch: 'b', amber: false },
  { ch: 'u', amber: false }, { ch: 'g', amber: false }, { ch: '→', amber: true },
  { ch: 'd', amber: false }, { ch: 'e', amber: false }, { ch: 'p', amber: false },
  { ch: 'l', amber: false }, { ch: 'o', amber: false }, { ch: 'y', amber: false },
];

const EASE_OUT: [number,number,number,number] = [0.16, 1, 0.3, 1];

export default function SplashScreen() {
  const [phase, setPhase] = useState<0|1|2|3|4>(0);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase(1), 80);   // ignite glow
    const t1 = setTimeout(() => setPhase(2), 280);  // logo
    const t2 = setTimeout(() => setPhase(3), 720);  // wordmark
    const t3 = setTimeout(() => setPhase(4), 1120); // tagline + arc
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        // Drawer-close exit: slides the whole screen up and out
        y: '-100%',
        opacity: 0,
        transition: {
          y: { duration: 0.55, ease: [0.4, 0, 0.6, 1] },
          opacity: { duration: 0.3, delay: 0.28 },
        },
      }}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: '#04050A' }}
    >
      {/* ── Layer 0: subtle animated noise grain (very faint) ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── Layer 1: ambient bloom — ignites from a point ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        style={{
          background: `
            radial-gradient(ellipse 700px 450px at 50% 46%, rgba(255,157,61,0.11) 0%, transparent 60%),
            radial-gradient(ellipse 400px 280px at 40% 60%, rgba(79,209,181,0.05) 0%, transparent 55%)
          `,
        }}
      />

      {/* ── Layer 2: dot-grid that swims up (parallax feel) ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: phase >= 1 ? 0.35 : 0, y: 0 }}
        transition={{ duration: 1.8, ease: EASE_OUT }}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 48%, black 20%, transparent 80%)',
        }}
      />

      {/* ── Layer 3: horizontal scan line that sweeps once ── */}
      <motion.div
        className="absolute left-0 right-0 pointer-events-none"
        initial={{ top: '35%', opacity: 0 }}
        animate={phase >= 2 ? { top: '65%', opacity: [0, 0.18, 0] } : {}}
        transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.1 }}
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,157,61,0.55) 30%, rgba(255,157,61,0.85) 50%, rgba(255,157,61,0.55) 70%, transparent)',
          filter: 'blur(0.5px)',
        }}
      />

      {/* ── Core: logo + wordmark + tagline ── */}
      <div className="relative flex flex-col items-center" style={{ gap: '28px' }}>

        {/* ── Logo ── */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, y: 32, scale: 0.78, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 200, damping: 18, mass: 0.9 }}
              className="relative flex items-center justify-center"
            >
              {/* Halo bloom — expands and fades to a soft ring */}
              <motion.div
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{
                  opacity: [0, 0.7, 0.18],
                  scale: [0.4, 1.5, 1.1],
                }}
                transition={{ duration: 1.2, ease: EASE_OUT, times: [0, 0.45, 1] }}
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: '-24px',
                  background: 'radial-gradient(circle, rgba(255,157,61,0.4) 0%, transparent 65%)',
                  filter: 'blur(16px)',
                }}
              />

              {/* Orbit ring — slow continuous spin */}
              <motion.div
                initial={{ opacity: 0, rotate: -30 }}
                animate={{ opacity: 0.3, rotate: 330 }}
                transition={{
                  opacity: { duration: 0.8, delay: 0.3, ease: EASE_OUT },
                  rotate: { duration: 12, ease: 'linear', repeat: Infinity },
                }}
                className="absolute pointer-events-none"
                style={{
                  inset: '-18px',
                  borderRadius: '50%',
                  border: '1px dashed rgba(255,157,61,0.5)',
                }}
              />

              {/* Inner counter-spin ring */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15, rotate: -360 }}
                transition={{
                  opacity: { duration: 0.8, delay: 0.5, ease: EASE_OUT },
                  rotate: { duration: 8, ease: 'linear', repeat: Infinity },
                }}
                className="absolute pointer-events-none"
                style={{
                  inset: '-6px',
                  borderRadius: '50%',
                  border: '1px solid rgba(79,209,181,0.4)',
                }}
              />

              {/* Logo glass chip with slow pulse */}
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 0 1px rgba(255,255,255,0.08), 0 24px 64px -16px rgba(0,0,0,0.8)',
                    '0 0 0 1px rgba(255,157,61,0.35), 0 24px 64px -12px rgba(255,138,30,0.35)',
                    '0 0 0 1px rgba(255,255,255,0.08), 0 24px 64px -16px rgba(0,0,0,0.8)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  background: 'rgba(28,33,48,0.7)',
                  backdropFilter: 'blur(28px)',
                  borderRadius: '26px',
                  padding: '7px',
                }}
              >
                <Logo className="w-28 h-28 sm:w-32 sm:h-32 rounded-[20px]" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Wordmark: letters stream in with amber trailing shimmer ── */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              key="wordmark"
              className="flex items-center overflow-hidden"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(26px, 5vw, 36px)',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              {WORDMARK.map(({ ch, amber }, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 14, filter: 'blur(5px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 24,
                    delay: i * 0.042,
                  }}
                  style={{
                    display: 'inline-block',
                    color: amber ? '#00D4FF' : '#F5F4F0',
                    textShadow: amber
                      ? '0 0 28px rgba(0,212,255,0.85), 0 0 60px rgba(0,212,255,0.3)'
                      : 'none',
                    marginLeft: ch === '→' ? '3px' : '0',
                    marginRight: ch === '→' ? '3px' : '0',
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tagline + sweeping arc loader ── */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div
              key="tagline"
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
              className="flex flex-col items-center"
              style={{ gap: '18px' }}
            >
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'rgba(146,150,163,0.75)',
              }}>
                practice &nbsp;·&nbsp; deploy &nbsp;·&nbsp; prove
              </p>

              {/* Sweeping arc — more premium than a flat bar */}
              <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ transform: 'rotate(-90deg)' }}>
                  {/* track */}
                  <circle
                    cx="24" cy="24" r="20"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="2"
                    fill="none"
                  />
                  {/* animated fill */}
                  <motion.circle
                    cx="24" cy="24" r="20"
                    stroke="url(#arcGrad)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 0.72, ease: EASE_OUT, delay: 0.05 }}
                  />
                  <defs>
                    <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00D4FF" />
                      <stop offset="100%" stopColor="#00FF88" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Amber dot that rides the arc */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#00FF88',
                    boxShadow: '0 0 8px rgba(0,255,136,0.9)',
                    transformOrigin: '-18px 0',
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.72, ease: EASE_OUT, delay: 0.05 }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#00FF88',
                      boxShadow: '0 0 10px rgba(0,255,136,1)',
                      transformOrigin: '-18px -3px',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
