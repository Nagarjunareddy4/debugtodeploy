import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Menu, X, Github, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LandingNavbarProps {
  onAuthClick: () => void;
  session: any;
}

export default function LandingNavbar({ onAuthClick, session }: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Labs', href: '#labs' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4",
        isScrolled 
          ? "glass-panel py-3" 
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/logo.jpg" alt="DebugToDeploy" className="w-10 h-10 rounded-xl object-contain mix-blend-screen group-hover:scale-110 transition-transform duration-500" />
          <span className="text-xl font-black italic tracking-tighter hidden sm:block bg-clip-text text-transparent bg-linear-to-r from-text-main to-soft-blue">
            Debug<span className="text-soft-blue">To</span>Deploy
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-bold text-text-dim hover:text-text-main hover:-translate-y-0.5 transition-all duration-300"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-text-dim hover:text-text-main hover:scale-110 transition-all duration-300"
          >
            <Github className="w-5 h-5" />
          </a>
          {session ? (
            <a
              href="/dashboard"
              className="btn-pill glass-button bg-text-main/90 text-surface flex items-center gap-2 text-xs uppercase tracking-widest"
            >
              Go to Dashboard <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          ) : (
            <button
              onClick={onAuthClick}
              className="btn-pill glass-button bg-text-main/90 text-surface text-xs uppercase tracking-widest hover:bg-soft-blue transition-colors"
            >
              Start Free
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-text-main"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface border-b border-border overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-lg font-bold text-text-dim"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 border-t border-border flex flex-col gap-4">
                {session ? (
                   <a
                   href="/dashboard"
                   className="btn-pill bg-text-main text-surface text-center text-xs uppercase tracking-widest"
                 >
                   Go to Dashboard
                 </a>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onAuthClick();
                    }}
                    className="btn-pill bg-text-main text-surface text-xs uppercase tracking-widest"
                  >
                    Start Free
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
