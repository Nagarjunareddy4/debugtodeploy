import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ChevronRight, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LandingNavbarProps {
  onAuthClick: () => void;
  session: any;
}

export default function LandingNavbar({ onAuthClick, session }: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Labs', href: '#labs' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6",
        isScrolled
          ? "glass-panel py-3 border-b border-white/5"
          : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <img
            src="/icon.png"
            alt="DebugToDeploy"
            className="w-10 h-10 rounded-xl object-cover logo-icon"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/favicon.svg'; }}
          />
          <span className="text-lg font-black tracking-tighter hidden sm:block uppercase">
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
          </span>
        </motion.div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link, i) => (
            <motion.a
              key={link.name}
              href={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-text-dim hover:text-text-main transition-all duration-300 relative group"
            >
              <span className="relative z-10">{link.name}</span>
              <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-cyan/0 to-neon-green/0 group-hover:from-neon-cyan/8 group-hover:to-neon-green/5 transition-all duration-300" />
            </motion.a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <motion.a
              href="/dashboard"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="btn-pill btn-neon-primary flex items-center gap-2 text-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              Dashboard <ChevronRight className="w-3.5 h-3.5" />
            </motion.a>
          ) : (
            <motion.button
              onClick={onAuthClick}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="btn-pill btn-neon-primary text-xs"
            >
              Start Free Journey
            </motion.button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <motion.button
          className={cn(
            "md:hidden p-2.5 rounded-xl transition-all",
            "glass-button text-text-main"
          )}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          whileTap={{ scale: 0.93 }}
        >
          <AnimatePresence mode="wait">
            {mobileMenuOpen ? (
              <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-5 h-5" />
              </motion.span>
            ) : (
              <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Menu className="w-5 h-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden mt-3 rounded-2xl overflow-hidden glass-panel border border-white/5"
          >
            <div className="flex flex-col p-4 gap-1">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-3 rounded-xl text-base font-bold text-text-dim hover:text-text-main hover:bg-neon-cyan/8 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </motion.a>
              ))}
              <div className="pt-3 mt-2 border-t border-white/5">
                {session ? (
                  <a
                    href="/dashboard"
                    className="btn-pill btn-neon-primary w-full text-center text-xs"
                  >
                    Go to Dashboard
                  </a>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); onAuthClick(); }}
                    className="btn-pill btn-neon-primary w-full text-xs"
                  >
                    Start Free Journey
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
