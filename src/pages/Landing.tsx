import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rocket, Brain, Zap, ShieldCheck, Terminal as TerminalIcon, 
  Map, CheckCircle2, ChevronRight, Star, ArrowRight,
  Sparkles, Cloud, Users, Award, Play, Github,
  Facebook, Instagram, Twitter, Briefcase, Smartphone
} from 'lucide-react';
import LandingNavbar from '../components/layout/LandingNavbar';
import AuthModal from '../components/layout/AuthModal';
import { RoadmapBadge3D } from '../components/ui/RoadmapBadge3D';
import { cn, useMeta } from '../lib/utils';
import { Logo } from '../components/ui/Logo';

export default function Landing({ session }: { session: any }) {
  useMeta(
    'DebugToDeploy | Master DevOps & Cloud Engineering', 
    'DebugToDeploy is the AI-powered career accelerator for DevOps engineers. Master Kubernetes, AWS, and Terraform with personalized roadmaps and live cloud labs.',
    '/og-image.png'
  );

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const openAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-brand-bg text-text-main overflow-x-hidden relative">
      <LandingNavbar onAuthClick={() => openAuth('login')} session={session} />
      
      {/* Hero Section */}
      <section className="relative w-full pt-36 pb-20 px-6 overflow-hidden flex justify-center items-center">
        {/* Animated Background Blobs & Floating Lights */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.15, 0.25, 0.15],
              x: [0, 40, 0],
              y: [0, -40, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[8%] left-[12%] w-[45%] h-[45%] bg-neon-cyan/20 rounded-full blur-[140px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1.1, 0.9, 1.1],
              opacity: [0.12, 0.22, 0.12],
              x: [0, -50, 0],
              y: [0, 50, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute bottom-[8%] right-[12%] w-[50%] h-[50%] bg-neon-purple/20 rounded-full blur-[150px]" 
          />
          <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-neon-green/8 rounded-full blur-[120px] animate-pulse" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-neon-cyan/20 mb-8 bg-surface/40 hover:border-neon-cyan/40 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-neon-cyan animate-neon-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neon-cyan">
                The AI-Powered DevOps Career Accelerator
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl sm:text-5xl md:text-7xl font-black italic tracking-tight mb-8 leading-[1.05]"
            >
              DebugToDeploy:<br />
              <span className="text-neon-gradient">
                Accelerator
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg text-text-dim font-bold max-w-xl mb-10 leading-relaxed"
            >
              Bridge the gap between theoretical knowledge and production expertise. 
              Build real-world infrastructure, fix complex cluster issues, and showcase 
              your verified skills with a professional SRE portfolio.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <motion.button
                onClick={() => openAuth('signup')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-pill btn-neon-primary px-10 py-5 text-xs tracking-widest flex items-center justify-center gap-2 group"
              >
                Start Free Journey <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.a
                href="#labs"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-pill btn-ghost px-10 py-5 text-xs tracking-widest flex items-center justify-center gap-2"
              >
                Explore Labs
              </motion.a>
            </motion.div>

            {/* Social Proof with Premium Glass Avatars */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-16 flex flex-col lg:flex-row items-center gap-4"
            >
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-neon-cyan/30 glass-panel bg-surface/80 flex items-center justify-center text-[10px] font-black shadow-lg">
                    U{i}
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">
                Trusted by 5,000+ Engineers
              </p>
            </motion.div>
          </div>

          {/* Interactive 3D Mockup Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ delay: 0.25, type: 'spring', damping: 15 }}
            className="relative hidden lg:block perspective-1000 z-10"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="absolute inset-0 bg-neon-cyan/15 blur-[120px] rounded-full animate-pulse-glow pointer-events-none" />
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 w-full"
            >
              <div className="glass-panel rounded-3xl p-3 border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-neon-cyan/5 via-transparent to-neon-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <img 
                  src="/dashboard-mockup.png" 
                  alt="DevOps 3D Dashboard Mockup" 
                  className="rounded-2xl w-full h-auto object-cover shadow-inner transition-transform duration-700 group-hover:scale-[1.01]"
                  onError={(e) => {
                    // Fallback to og-image.png if mockup isn't present
                    e.currentTarget.src = '/og-image.png';
                  }}
                />
                
                {/* Floating active users counter badge */}
                <div className="absolute -top-5 -right-5 glass-panel border border-neon-cyan/30 px-4 py-2.5 rounded-2xl rotate-[6deg] shadow-2xl flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neon-green animate-blink" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-main">342 Online Now</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* App Download Section (Redesigned with Premium Glassmorphism) */}
      <section className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="glass-panel border border-neon-cyan/20 bg-gradient-to-br from-neon-cyan/5 to-neon-purple/5 p-8 md:p-16 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl glass-panel border border-neon-cyan/30 flex items-center justify-center bg-surface/50">
                    <Smartphone className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-neon-cyan/10 text-neon-cyan px-3 py-1.5 rounded-full border border-neon-cyan/20">Now Available</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black italic tracking-tight leading-[1.1]">
                  Take Your <span className="text-neon-cyan">Training</span> <br /> On the Go
                </h2>
                
                <p className="text-text-dim font-bold text-lg leading-relaxed max-w-xl">
                  Master DevOps anywhere with our native mobile app. Practice lab exercises, track your progress, and prepare for interviews while you're commuting or in between meetings.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openAuth('signup')}
                    className="btn-pill btn-neon-primary px-8 py-4 text-xs tracking-widest relative"
                  >
                    Get App Beta
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black uppercase bg-neon-orange text-white px-2 py-0.5 rounded-full tracking-wider animate-pulse shadow-md">
                      Beta
                    </span>
                  </motion.button>
                  
                  <motion.button
                    disabled
                    whileTap={{ scale: 0.97 }}
                    className="btn-pill btn-ghost px-8 py-4 text-xs tracking-widest opacity-40 cursor-not-allowed"
                  >
                    iOS Coming Soon
                  </motion.button>
                </div>
              </div>

              {/* Redesigned interactive phone frame mock */}
              <div className="flex justify-center items-center relative">
                <div className="absolute inset-0 bg-neon-purple/20 blur-[100px] rounded-full" />
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 w-full max-w-sm"
                >
                  <div className="glass-panel border-4 border-white/10 rounded-[44px] p-3.5 shadow-2xl bg-surface/60 overflow-hidden">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-surface-2 rounded-full border border-white/5 z-20 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-black/60 mr-1" />
                      <div className="w-1.5 h-1.5 rounded-full bg-black/40" />
                    </div>
                    
                    <div className="bg-gradient-to-b from-neon-cyan to-neon-purple rounded-[36px] p-0.5 aspect-[9/18.5] flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/20 to-transparent" />
                      <div className="relative z-10 w-full h-full bg-surface-2 rounded-[34px] flex flex-col items-center justify-center p-6 space-y-6">
                        <Logo className="w-16 h-16" />
                        <div className="text-center space-y-2">
                          <h4 className="text-base font-black italic uppercase tracking-wider text-neon-cyan">Cloud Sandboxes</h4>
                          <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Practice in Real Environments</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-2 h-2 rounded-full bg-neon-green animate-blink" />
                          <div className="w-2 h-2 rounded-full bg-neon-cyan" />
                          <div className="w-2 h-2 rounded-full bg-neon-purple" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Grid (Redesigned Cards) */}
      <section id="features" className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-20 space-y-4 px-4">
            <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter leading-[0.95]">
              Master the <span className="text-neon-cyan underline decoration-2 underline-offset-8">Modern Stack</span>
            </h2>
            <p className="text-text-dim font-bold max-w-2xl mx-auto text-base md:text-lg">
              One platform. All the tools. Zero fluff. We focus on what matters most to hiring managers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Briefcase,
                title: "AI Job Board",
                desc: "Real-time job opportunities matched to your roadmap goal and technical readiness score.",
                color: "text-neon-cyan border-neon-cyan/20",
                bg: "bg-neon-cyan/10"
              },
              {
                icon: Users,
                title: "Global Leaderboard",
                desc: "Compete with engineers worldwide. Climb the ranks by completing labs and passing interviews.",
                color: "text-neon-purple border-neon-purple/20",
                bg: "bg-neon-purple/10"
              },
              {
                icon: Brain,
                title: "Interview Analytics",
                desc: "Deep AI analysis of your mock interview performance with personalized coaching insights.",
                color: "text-neon-orange border-neon-orange/20",
                bg: "bg-neon-orange/10"
              },
              {
                icon: TerminalIcon,
                title: "Production Labs",
                desc: "Don't just code. Solve production incidents in live cloud environments.",
                color: "text-neon-green border-neon-green/20",
                bg: "bg-neon-green/10"
              },
              {
                icon: ShieldCheck,
                title: "Verified Skills",
                desc: "Prove your expertise with certificates backed by actual lab performance data.",
                color: "text-neon-blue border-neon-blue/20",
                bg: "bg-neon-blue/10"
              },
              {
                icon: Award,
                title: "Elite Portfolio",
                desc: "A public profile that speaks louder than a resume to hiring managers.",
                color: "text-neon-green border-neon-green/20",
                bg: "bg-neon-green/10"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                whileHover={{ y: -8 }}
                className={cn("glass-card border rounded-3xl p-8 flex flex-col items-start gap-6", feature.color)}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5", feature.bg)}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black italic mb-3 text-text-main">{feature.title}</h3>
                  <p className="text-text-dim font-bold text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hands-on Labs Highlight (Super Premium Terminal) */}
      <section id="labs" className="w-full py-24 px-6 bg-[#03060C] text-white relative overflow-hidden flex justify-center">
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-neon-cyan/8 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[550px] h-[550px] bg-neon-green/5 rounded-full blur-[140px] translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center w-full z-10">
          <div className="space-y-8">
            <div className="chip bg-neon-green/10 text-neon-green border border-neon-green/20">The Practice Arena</div>
            <h2 className="text-5xl font-black italic tracking-tighter leading-[0.95]">
              Real Labs. <br/> Real <span className="text-neon-green">Infrastructure.</span>
            </h2>
            <p className="text-white/60 font-bold text-lg leading-relaxed">
              No more theoretical slides. Jump into interactive terminals and fix actual 
              Kubernetes crashes, Terraform drift, and CI/CD pipeline failures.
            </p>
            <ul className="space-y-4">
              {['AWS / Azure / GCP Sandboxes', 'Kubernetes Cluster Debugging', 'Terraform & IaC Challenges', 'Jenkins & GitHub Actions Labs'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-white/80">
                  <CheckCircle2 className="w-5 h-5 text-neon-green" /> {item}
                </li>
              ))}
            </ul>
            <motion.button 
              onClick={() => openAuth('signup')} 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-pill btn-neon-primary py-5 px-10 text-xs tracking-widest"
            >
              Access All Labs
            </motion.button>
          </div>
          
          <div className="relative">
             <div className="terminal-glass p-4">
                <div className="bg-[#05080F]/90 rounded-xl overflow-hidden shadow-inner border border-white/5">
                   <div className="flex items-center justify-between px-4 py-3.5 bg-white/5 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                      </div>
                      <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">terminal — k8s-debug-01</span>
                      <div className="w-10" /> {/* Spacer */}
                   </div>
                   <div className="p-6 font-mono text-sm space-y-3">
                      <p className="text-neon-green flex items-center gap-2">
                        <span>$</span> 
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: "auto" }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                          className="overflow-hidden whitespace-nowrap block"
                        >
                          kubectl get pods
                        </motion.span>
                      </p>
                      <p className="text-white/60">NAME &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; READY &nbsp; STATUS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; RESTARTS &nbsp; AGE</p>
                      <p className="text-white">nginx-deployment &nbsp; 0/1 &nbsp;&nbsp;&nbsp; CrashLoopBackOff &nbsp; 5 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 12m</p>
                      <p className="text-neon-orange mt-4 animate-pulse">ERROR: ImagePullBackOff</p>
                      <p className="text-white/40 animate-blink">_</p>
                   </div>
                </div>
             </div>
             {/* Floating badge */}
             <div className="absolute -bottom-8 -left-8 glass-panel border border-neon-cyan/30 rotate-[-5deg] p-5 rounded-3xl bg-surface">
                <div className="flex items-center gap-3">
                    <Zap className="w-8 h-8 text-neon-orange animate-pulse" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim leading-none mb-1">Instant Access</p>
                        <p className="text-lg font-black italic text-text-main">0.2s Boot Time</p>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 3D Achievement Showcase */}
      <section className="w-full py-24 px-6 flex justify-center bg-brand-bg overflow-hidden">
        <div className="max-w-7xl mx-auto w-full text-center">
          <div className="mb-20 space-y-4">
            <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter leading-[0.95]">
              Earn <span className="text-neon-orange">Verified</span> <br/> 3D Achievements
            </h2>
            <p className="text-text-dim font-bold max-w-2xl mx-auto">
              Every milestone in your AI roadmap translates into a high-quality 3D trophy. 
              Showcase your technical depth with a portfolio that actually looks the part.
            </p>
          </div>

          <div className="flex overflow-x-auto gap-8 pb-12 pt-4 px-4 snap-x snap-mandatory no-scrollbar -mx-4 md:mx-0 md:px-0">
            {[
              { name: 'Docker Pilot', earned: true, color: 'bg-neon-cyan/5 border-neon-cyan/20' },
              { name: 'K8s Healer', earned: true, color: 'bg-neon-green/5 border-neon-green/20' },
              { name: 'SRE Master', earned: true, color: 'bg-neon-purple/5 border-neon-purple/20' },
              { name: 'Cloud Architect', earned: true, color: 'bg-neon-orange/5 border-neon-orange/20' },
              { name: 'Git Guru', earned: true, color: 'bg-neon-cyan/5 border-neon-cyan/20' },
              { name: 'SRE Monitor', earned: true, color: 'bg-neon-green/5 border-neon-green/20' }
            ].map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, rotateY: 8, rotateX: -8 }}
                className={cn("flex-none w-[280px] md:w-[320px] snap-center glass-card border rounded-3xl flex flex-col items-center gap-6 p-10 relative overflow-hidden group cursor-pointer", badge.color)}
              >
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center relative z-10">
                  <RoadmapBadge3D 
                    stageName={badge.name} 
                    earned={badge.earned} 
                    size="lg" 
                    showGlow={true}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1">Badge Unlocked</p>
                  <h3 className="text-xl font-black italic text-text-main">{badge.name}</h3>
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section id="pricing" className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter">
              Choose Your <span className="text-neon-purple">Clearance</span>
            </h2>
            <p className="text-text-dim font-bold">Invest in your career. Upgrade anytime.</p>
          </div>

          <div className="flex flex-col items-center gap-16 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
              {/* Free Tier */}
              <div className="glass-card border border-white/10 flex flex-col items-center text-center p-12 rounded-3xl">
                <div className="mb-8">
                  <h3 className="text-2xl font-black italic mb-2 text-text-main">Free Fleet</h3>
                  <p className="text-text-dim font-bold text-sm">The foundation for your engineering journey.</p>
                </div>
                <div className="text-4xl font-black italic mb-8">$0 <span className="text-sm font-bold text-text-dim not-italic uppercase tracking-widest ml-2">/ month</span></div>
                <ul className="space-y-4 mb-12 flex-1 w-full text-left max-w-xs mx-auto">
                  {[
                    '1 AI Roadmap / week',
                    '2 AI Assistant searches / day',
                    'Basic Cloud Labs access',
                    'Community Support',
                    'Standard Portfolio'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-text-main">
                      <CheckCircle2 className="w-5 h-5 text-neon-green shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <motion.button 
                  onClick={() => openAuth('signup')} 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-pill btn-ghost w-full py-4 text-xs"
                >
                  Get Started Free
                </motion.button>
              </div>

              {/* Pro Tier (Neon Glow Edge) */}
              <div className="glass-panel border-2 border-neon-purple/40 relative overflow-hidden bg-neon-purple/5 shadow-2xl p-12 flex flex-col items-center text-center rounded-3xl group">
                <div className="absolute top-6 right-6">
                   <div className="chip bg-neon-purple text-[#05080F] shadow-lg shadow-neon-purple/20">Fleet Captain</div>
                </div>
                <div className="mb-8">
                  <h3 className="text-2xl font-black italic mb-2 text-text-main">Fleet Captain (Pro)</h3>
                  <p className="text-text-dim font-bold text-sm">Full-throttle engineering with unlimited AI power.</p>
                </div>
                <div className="flex items-baseline justify-center gap-2 mb-8">
                  <span className="text-5xl font-black italic text-text-main">$6</span>
                  <span className="text-xs font-bold text-text-dim uppercase tracking-[0.2em]">/ month</span>
                </div>
                <ul className="space-y-4 mb-12 flex-1 w-full text-left max-w-xs mx-auto">
                  {[
                    'Unlimited Interactive Cloud Sandbox',
                    'AI Portfolio & Resume Builder',
                    'Unlimited AI Mock Interviews',
                    'Unlimited AI Roadmaps',
                    'Unlimited AI Assistant Search',
                    'PDF Resume Export & Sharing',
                    'Early Access to Beta Features'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-text-main">
                      <CheckCircle2 className="w-5 h-5 text-neon-purple shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <motion.button 
                  onClick={() => openAuth('signup')} 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-pill btn-neon-primary w-full py-5 text-xs shadow-2xl shadow-neon-purple/25"
                >
                  Command the Fleet
                </motion.button>
              </div>
            </div>

            {/* Guarantee Badge */}
            <div className="flex items-center gap-4 px-8 py-4 glass-panel border border-neon-cyan/20 rounded-full bg-surface/50">
               <ShieldCheck className="w-6 h-6 text-neon-green animate-neon-pulse" />
               <p className="text-[10px] font-black uppercase tracking-widest text-text-main">14-Day Money Back Guarantee • Secure Payment Processing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-24 px-6 bg-surface-2 border-y border-border flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                name: "Alex Rivera",
                role: "Cloud Engineer @ Vercel",
                text: "The labs on DebugToDeploy are unlike anything else. It's actually hard, which is why it works.",
                avatar: "AR"
              },
              {
                name: "Sarah Chen",
                role: "Junior SRE",
                text: "The AI Roadmap gave me a clear path when I was overwhelmed. 3 months later, I got my first offer.",
                avatar: "SC"
              },
              {
                name: "Marcus Thorne",
                role: "Platform Lead",
                text: "We use this to vet new hires. If they can finish the Kubernetes labs, we know they're legit.",
                avatar: "MT"
              }
            ].map((t, i) => (
              <div key={i} className="space-y-6 flex flex-col items-center text-center group">
                <div className="flex gap-1 group-hover:scale-110 transition-transform duration-300">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-neon-orange text-neon-orange" />)}
                </div>
                <p className="text-xl font-bold italic leading-relaxed text-text-main">"{t.text}"</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl glass-panel border border-neon-cyan/30 flex items-center justify-center font-black text-neon-cyan bg-surface/50">
                    {t.avatar}
                  </div>
                  <div className="text-left">
                    <p className="font-black italic text-sm text-text-main">{t.name}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <h2 className="text-4xl font-black italic tracking-tighter mb-16 text-center text-text-main">
            Frequently Asked <span className="text-neon-orange">Questions</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { q: "Is the sandbox really free?", a: "Yes! Every user gets access to a limited number of cloud lab environments every month. Pro users get unlimited access." },
              { q: "How accurate is the AI roadmap?", a: "Our AI is trained on thousands of DevOps job descriptions and career paths. It updates weekly to reflect industry trends." },
              { q: "Do I need a credit card to start?", a: "No. You can start generating roadmaps and exploring labs with just an email." },
              { q: "What certifications do I get?", a: "You get milestones certificates that you can share on LinkedIn. These are proof of your practical lab completions." }
            ].map((item, i) => (
              <div key={i} className="glass-card border border-white/5 flex flex-col items-center text-center p-8 rounded-3xl">
                <h4 className="text-lg font-black italic mb-4 flex items-center gap-3 justify-center text-text-main">
                    <div className="w-2.5 h-2.5 rounded-full bg-neon-orange animate-pulse" /> {item.q}
                </h4>
                <p className="text-text-dim font-bold text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA with Glowing Grid Pattern */}
      <section className="w-full py-40 px-6 relative overflow-hidden flex justify-center">
        <div className="absolute inset-0 bg-[#05080F]" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.5)_1.5px,transparent_1.5px)] bg-[length:45px_45px] z-0" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full bg-gradient-to-b from-neon-cyan/5 via-transparent to-transparent blur-2xl z-0 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-12 w-full">
          <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white leading-[1.05]">
            Ready to Become an <br /> <span className="text-neon-cyan">Architect?</span>
          </h2>
          <p className="text-white/60 font-bold text-xl max-w-xl mx-auto">Join the 5,000+ engineers who are building the future of infrastructure.</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <motion.button 
              onClick={() => openAuth('signup')} 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-pill btn-neon-primary px-12 py-6 text-sm tracking-widest shadow-2xl"
            >
              Start Free Journey
            </motion.button>
            <motion.button 
              onClick={() => openAuth('login')} 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-pill btn-ghost px-12 py-6 text-sm tracking-widest"
            >
              Login to Account
            </motion.button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-20 px-6 border-t border-border flex justify-center bg-[#05080F]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <Logo className="w-10 h-10" />
                <span className="text-xl font-black italic tracking-tighter">
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
              </div>
              <p className="text-text-dim font-bold max-w-sm">The AI-Powered career accelerator for modern infrastructure engineers.</p>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-6 text-text-main">Platform</h4>
              <ul className="space-y-4 text-sm font-bold text-text-dim">
                <li><a href="#features" className="hover:text-neon-cyan transition-colors">Features</a></li>
                <li><a href="#labs" className="hover:text-neon-cyan transition-colors">Cloud Labs</a></li>
                <li><a href="#pricing" className="hover:text-neon-cyan transition-colors">Pricing</a></li>
                <li><a href="/roadmap" className="hover:text-neon-cyan transition-colors">Roadmaps</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-6 text-text-main">Legal</h4>
              <ul className="space-y-4 text-sm font-bold text-text-dim">
                <li><a href="/privacy" className="hover:text-neon-cyan transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-neon-cyan transition-colors">Terms of Service</a></li>
                <li><a href="/support" className="hover:text-neon-cyan transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-10 pt-10 border-t border-border">
            <div className="flex flex-col items-center md:items-start gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim text-center md:text-left">
                © {new Date().getFullYear()} DebugToDeploy. Developed by Nagarjuna Reddy Annapureddy.
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">All Rights Reserved.</p>
            </div>
            <div className="flex items-center gap-6">
               {[
                 { icon: Facebook, link: "https://www.facebook.com/profile.php?id=61589307951543", color: "bg-blue-600 text-white border-blue-600/30", label: "Facebook" },
                 { icon: Twitter, link: "https://x.com/DebugToDeploy", color: "bg-text-main text-surface border-white/10", label: "Twitter" },
                 { icon: Instagram, link: "https://www.instagram.com/debugtodeploy?igsh=MTlxcmoyNG9obWN1OA==", color: "bg-pink-600 text-white border-pink-600/30", label: "Instagram" }
               ].map((social, i) => (
                 <motion.a
                   key={i}
                   href={social.link}
                   target="_blank"
                   rel="noopener noreferrer"
                   whileHover={{ 
                     y: -8, 
                     rotateX: -15, 
                     rotateY: 15,
                     scale: 1.1,
                     boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                   }}
                   whileTap={{ scale: 0.9 }}
                   className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all border relative group",
                     social.color
                   )}
                   style={{ transformStyle: 'preserve-3d' }}
                 >
                   <social.icon className="w-5 h-5 relative z-10" />
                   <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                 </motion.a>
               ))}
               
               <div className="w-px h-8 bg-border mx-4" />

               <button 
                 onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                 className="text-[10px] font-black uppercase tracking-widest text-neon-cyan hover:underline whitespace-nowrap"
               >
                 Back to Top
               </button>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode}
      />
    </div>
  );
}
