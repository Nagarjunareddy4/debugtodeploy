import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ArrowRight } from 'lucide-react';
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
    { name: 'Labs', href: '#labs' },
    { name: 'How it works', href: '#flow' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6',
        isScrolled ? 'ldg-panel border-b py-3' : 'bg-transparent py-5 border-b border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img src="/favicon.svg" alt="DebugToDeploy" className="w-8 h-8 rounded-md object-cover" />
          <span className="ldg-mono text-sm font-semibold tracking-tight hidden sm:block">
            debug<span className="text-[#00D4FF]">→</span>deploy
          </span>
        </motion.div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <motion.a
              key={link.name}
              href={link.href}
              className="ldg-mono px-4 py-2 text-[0.78rem] text-[var(--ldg-text-dim)] hover:text-[var(--ldg-text)] transition-colors"
            >
              <span className="relative z-10">{link.name}</span>
              <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-cyan/0 to-neon-green/0 group-hover:from-neon-cyan/8 group-hover:to-neon-green/5 transition-all duration-300" />
            </motion.a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <a href="/dashboard" className="ldg-btn-primary flex items-center gap-2 px-5 py-2.5">
              Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </a>
          ) : (
            <>
              <button onClick={onAuthClick} className="ldg-mono text-[0.78rem] text-[var(--ldg-text-dim)] hover:text-[var(--ldg-text)] px-3 transition-colors">
                Log in
              </button>
              <button onClick={onAuthClick} className="ldg-btn-primary px-5 py-2.5">
                Start debugging
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <motion.button
          className="md:hidden p-2 ldg-hairline border rounded-sm text-[var(--ldg-text)]"
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden mt-3 ldg-panel overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-1">
              {navLinks.map((link) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  className="ldg-mono px-3 py-3 text-sm text-[var(--ldg-text-dim)] hover:text-[var(--ldg-text)] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </motion.a>
              ))}
              <div className="pt-3 mt-2 border-t border-[var(--ldg-wire)]">
                {session ? (
                  <a href="/dashboard" className="ldg-btn-primary w-full flex items-center justify-center gap-2 py-3">
                    Go to dashboard
                  </a>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); onAuthClick(); }}
                    className="ldg-btn-primary w-full py-3"
                  >
                    Start debugging
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
