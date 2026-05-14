import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Rocket, Brain, Zap, ShieldCheck, Terminal as TerminalIcon, 
  Map, CheckCircle2, ChevronRight, Star, ArrowRight,
  Sparkles, Cloud, Users, Award, Play, Github,
  Facebook, Instagram, Twitter
} from 'lucide-react';
import LandingNavbar from '../components/layout/LandingNavbar';
import AuthModal from '../components/layout/AuthModal';
import { RoadmapBadge3D } from '../components/ui/RoadmapBadge3D';
import { cn, useMeta } from '../lib/utils';

export default function Landing({ session }: { session: any }) {
  useMeta(
    'DebugToDeploy | Master DevOps & Cloud Engineering', 
    'DebugToDeploy is the AI-powered career accelerator for DevOps engineers. Master Kubernetes, AWS, and Terraform with personalized roadmaps and live cloud labs.',
    '/dashboard-mockup.png'
  );

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const openAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-brand-bg text-text-main overflow-x-hidden">
      <LandingNavbar onAuthClick={() => openAuth('login')} session={session} />
      
      {/* Hero Section */}
      <section className="relative w-full pt-32 pb-20 px-6 overflow-hidden flex justify-center">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-soft-blue/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-soft-purple/5 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-soft-blue/10 border border-soft-blue/20 mb-8"
            >
              <Sparkles className="w-4 h-4 text-soft-blue" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-soft-blue">
                The AI-Powered DevOps Career Accelerator
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-7xl font-black italic tracking-tight mb-8 leading-[1.1] md:leading-[0.9]"
            >
              DebugToDeploy: <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-soft-blue to-soft-purple">
                Accelerator
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-text-dim font-bold max-w-xl mb-12 leading-relaxed"
            >
              Bridge the gap between theoretical knowledge and production expertise. 
              Build real-world infrastructure, fix complex cluster issues, and showcase 
              your verified skills with a professional engineering portfolio.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button
                onClick={() => openAuth('signup')}
                className="btn-pill bg-text-main text-surface px-10 py-5 text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-soft-blue transition-colors group"
              >
                Start Free Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#labs"
                className="btn-pill bg-surface border-4 border-border px-10 py-5 text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:border-soft-blue transition-colors"
              >
                Explore Labs
              </a>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-16 flex flex-col lg:flex-row items-center gap-4"
            >
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-brand-bg bg-surface flex items-center justify-center text-[10px] font-black shadow-lg">
                    U{i}
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">
                Trusted by 5,000+ Engineers
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', damping: 15 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-soft-blue/20 blur-[100px] rounded-full animate-pulse" />
            <img 
              src="/hero-3d.png" 
              alt="DevOps 3D Illustration" 
              className="relative z-10 w-full h-auto drop-shadow-3xl hover:scale-105 transition-transform duration-700"
            />
          </motion.div>
        </div>
      </section>


      {/* Key Features Grid */}
      <section id="features" className="w-full py-20 md:py-32 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-20 space-y-4 px-4">
            <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter leading-[0.9]">Master the <span className="text-soft-blue underline decoration-4 underline-offset-8">Modern Stack</span></h2>
            <p className="text-text-dim font-bold max-w-2xl mx-auto text-base md:text-lg">One platform. All the tools. Zero fluff. We focus on what matters most to hiring managers.</p>
          </div>

          <div className="flex overflow-x-auto gap-8 pb-12 pt-4 px-4 snap-x snap-mandatory no-scrollbar -mx-4 md:mx-0 md:px-0">
            {[
              {
                icon: Map,
                title: "Curated Roadmaps",
                desc: "Navigate the complex DevOps landscape with a path tailored to your dream role.",
                color: "text-soft-blue",
                bg: "bg-soft-blue/10"
              },
              {
                icon: TerminalIcon,
                title: "Production Labs",
                desc: "Don't just code. Solve production incidents in live cloud environments.",
                color: "text-soft-green",
                bg: "bg-soft-green/10"
              },
              {
                icon: Brain,
                title: "Technical Audits",
                desc: "Get real-time feedback on your architecture decisions and troubleshooting logic.",
                color: "text-soft-purple",
                bg: "bg-soft-purple/10"
              },
              {
                icon: ShieldCheck,
                title: "Verified Skills",
                desc: "Prove your expertise with certificates backed by actual lab performance data.",
                color: "text-soft-orange",
                bg: "bg-soft-orange/10"
              },
              {
                icon: Award,
                title: "Elite Portfolio",
                desc: "A public profile that speaks louder than a resume to hiring managers.",
                color: "text-soft-green",
                bg: "bg-soft-green/10"
              },
              {
                icon: Rocket,
                title: "Career Accelerator",
                desc: "Designed to move you from Junior to Senior/Lead faster than generic courses.",
                color: "text-soft-blue",
                bg: "bg-soft-blue/10"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="flex-none w-[320px] md:w-[350px] snap-center playful-card flex flex-col items-start gap-6 border-4"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-current/20", feature.bg, feature.color)}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black italic mb-2">{feature.title}</h3>
                  <p className="text-text-dim font-bold text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hands-on Labs Highlight */}
      <section id="labs" className="w-full py-20 md:py-32 px-6 bg-[#0B0F1A] text-white relative overflow-hidden flex justify-center">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-soft-blue/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center w-full">
          <div className="space-y-8">
            <div className="chip bg-soft-green/20 text-soft-green border border-soft-green/20">The Practice Arena</div>
            <h2 className="text-5xl font-black italic tracking-tighter leading-[0.9]">Real Labs. <br/> Real <span className="text-soft-green">Infrastructure.</span></h2>
            <p className="text-white/60 font-bold text-lg leading-relaxed">
              No more theoretical slides. Jump into interactive terminals and fix actual 
              Kubernetes crashes, Terraform drift, and CI/CD pipeline failures.
            </p>
            <ul className="space-y-4">
              {['AWS / Azure / GCP Sandboxes', 'Kubernetes Cluster Debugging', 'Terraform & IaC Challenges', 'Jenkins & GitHub Actions Labs'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-white/80">
                  <CheckCircle2 className="w-5 h-5 text-soft-green" /> {item}
                </li>
              ))}
            </ul>
            <button onClick={() => openAuth('signup')} className="btn-pill bg-white text-[#0B0F1A] px-10 py-5 text-sm uppercase tracking-widest hover:bg-soft-green transition-colors">
              Access All Labs
            </button>
          </div>
          <div className="relative">
             <div className="bg-surface/10 backdrop-blur-xl border-4 border-white/10 rounded-[2.5rem] p-4 shadow-2xl">
                <div className="bg-[#1e1e1e] rounded-2xl overflow-hidden shadow-inner">
                   <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                      <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                      <span className="ml-4 text-[10px] font-mono text-white/40 uppercase tracking-widest">terminal — k8s-debug-01</span>
                   </div>
                   <div className="p-6 font-mono text-sm space-y-2">
                      <p className="text-soft-green">$ kubectl get pods</p>
                      <p className="text-white">NAME &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; READY &nbsp; STATUS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; RESTARTS &nbsp; AGE</p>
                      <p className="text-white">nginx-deployment &nbsp; 0/1 &nbsp;&nbsp;&nbsp; CrashLoopBackOff &nbsp; 5 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 12m</p>
                      <p className="text-soft-red mt-4">ERROR: ImagePullBackOff</p>
                      <p className="text-white animate-pulse">_</p>
                   </div>
                </div>
             </div>
             {/* Floating badge */}
             <div className="absolute -bottom-10 -left-10 playful-card bg-surface border-4 border-soft-blue rotate-[-5deg] p-4">
                <div className="flex items-center gap-3">
                    <Zap className="w-8 h-8 text-soft-orange" />
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
      <section className="w-full py-20 md:py-32 px-6 flex justify-center bg-brand-bg overflow-hidden">
        <div className="max-w-7xl mx-auto w-full text-center">
          <div className="mb-20 space-y-4">
            <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter leading-[0.9]">
              Earn <span className="text-soft-orange">Verified</span> <br/> 3D Achievements
            </h2>
            <p className="text-text-dim font-bold max-w-2xl mx-auto">
              Every milestone in your AI roadmap translates into a high-quality 3D trophy. 
              Showcase your technical depth with a portfolio that actually looks the part.
            </p>
          </div>

          <div className="flex overflow-x-auto gap-8 pb-12 pt-4 px-4 snap-x snap-mandatory no-scrollbar -mx-4 md:mx-0 md:px-0">
            {[
              { name: 'Docker Pilot', icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Whale/3D/whale_3d.png', color: 'bg-soft-blue/10' },
              { name: 'K8s Healer', icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Steering%20Wheel/3D/steering_wheel_3d.png', color: 'bg-soft-green/10' },
              { name: 'SRE Master', icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png', color: 'bg-soft-purple/10' },
              { name: 'Cloud Architect', icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cloud/3D/cloud_3d.png', color: 'bg-soft-orange/10' },
              { name: 'Git Guru', icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Link/3D/link_3d.png', color: 'bg-soft-blue/10' },
              { name: 'SRE Monitor', icon: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bar%20Chart/3D/bar_chart_3d.png', color: 'bg-soft-green/10' }
            ].map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, rotateY: 10, rotateX: -10 }}
                className="flex-none w-[280px] md:w-[320px] snap-center playful-card flex flex-col items-center gap-6 p-10 border-4 relative overflow-hidden group cursor-pointer"
              >
                <div className={cn("w-32 h-32 rounded-3xl flex items-center justify-center relative z-10", badge.color)}>
                  <RoadmapBadge3D 
                    stageName={badge.name} 
                    earned={true} 
                    size="lg" 
                    showGlow={true}
                  />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-text-dim mb-1">Badge Unlocked</p>
                  <h3 className="text-xl font-black italic">{badge.name}</h3>
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section id="pricing" className="w-full py-20 md:py-32 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter">Choose Your <span className="text-soft-purple">Clearance</span></h2>
            <p className="text-text-dim font-bold">Invest in your career. Upgrade anytime.</p>
          </div>

          <div className="flex flex-col items-center gap-16 max-w-5xl mx-auto">
            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
            {/* Free Tier */}
            <div className="playful-card border-4 flex flex-col items-center text-center p-12">
              <div className="mb-8">
                <h3 className="text-2xl font-black italic mb-2">Free Fleet</h3>
                <p className="text-text-dim font-bold text-sm">The foundation for your engineering journey.</p>
              </div>
              <div className="text-4xl font-black italic mb-8">$0 <span className="text-sm font-bold text-text-dim not-italic uppercase tracking-widest ml-2">/ month</span></div>
              <ul className="space-y-4 mb-12 flex-1 w-full">
                {[
                  '1 AI Roadmap / week',
                  '2 AI Assistant searches / day',
                  'Basic Cloud Labs access',
                  'Community Support',
                  'Standard Portfolio'
                ].map((item, i) => (
                  <li key={i} className="flex items-center justify-center gap-3 text-sm font-bold text-text-main">
                    <CheckCircle2 className="w-5 h-5 text-soft-green shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => openAuth('signup')} className="btn-pill border-4 border-border text-text-main py-4 px-8 uppercase tracking-widest text-xs hover:border-soft-blue transition-colors w-full">
                Get Started Free
              </button>
            </div>

              {/* Pro Tier */}
              <div className="playful-card border-4 border-soft-purple relative overflow-hidden bg-soft-purple/5 shadow-2xl shadow-soft-purple/10 p-12 flex flex-col items-center text-center">
                <div className="absolute top-6 right-6">
                   <div className="chip bg-soft-purple text-[#0F172A] shadow-lg shadow-soft-purple/20">Fleet Captain</div>
                </div>
                <div className="mb-8">
                  <h3 className="text-2xl font-black italic mb-2">Fleet Captain (Pro)</h3>
                  <p className="text-text-dim font-bold text-sm">Full-throttle engineering with unlimited AI power.</p>
                </div>
                <div className="flex items-baseline justify-center gap-2 mb-8">
                  <span className="text-5xl font-black italic">$6</span>
                  <span className="text-xs font-bold text-text-dim uppercase tracking-[0.2em]">/ month</span>
                </div>
                <ul className="space-y-4 mb-12 flex-1 w-full">
                  {[
                    'Unlimited Interactive Cloud Sandbox',
                    'AI Portfolio & Resume Builder',
                    'Unlimited AI Mock Interviews',
                    'Unlimited AI Roadmaps',
                    'Unlimited AI Assistant Search',
                    'PDF Resume Export & Sharing',
                    'Early Access to Beta Features'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center justify-center gap-3 text-sm font-bold text-text-main">
                      <CheckCircle2 className="w-5 h-5 text-soft-purple shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <button onClick={() => openAuth('signup')} className="btn-pill bg-text-main text-surface py-5 px-8 uppercase tracking-widest text-xs hover:bg-soft-purple transition-colors shadow-2xl shadow-soft-purple/20 w-full">
                  Command the Fleet
                </button>
              </div>
            </div>

            {/* Refund Policy / Trust Badge */}
            <div className="flex items-center gap-4 px-8 py-4 bg-surface border-2 border-border rounded-full">
               <ShieldCheck className="w-6 h-6 text-soft-green" />
               <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">14-Day Money Back Guarantee • Secure Payment Processing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-20 md:py-32 px-6 bg-surface/30 border-y border-border flex justify-center">
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
                <div className="flex gap-1 group-hover:scale-110 transition-transform">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-soft-orange text-soft-orange" />)}
                </div>
                <p className="text-xl font-bold italic leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-soft-blue/20 flex items-center justify-center font-black text-soft-blue">{t.avatar}</div>
                    <div className="text-left">
                      <p className="font-black italic text-sm">{t.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">{t.role}</p>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="w-full py-20 md:py-32 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <h2 className="text-4xl font-black italic tracking-tighter mb-16 text-center">Frequently Asked <span className="text-soft-orange">Questions</span></h2>
          <div className="space-y-4">
            {[
              { q: "Is the sandbox really free?", a: "Yes! Every user gets access to a limited number of cloud lab environments every month. Pro users get unlimited access." },
              { q: "How accurate is the AI roadmap?", a: "Our AI is trained on thousands of DevOps job descriptions and career paths. It updates weekly to reflect industry trends." },
              { q: "Do I need a credit card to start?", a: "No. You can start generating roadmaps and exploring labs with just an email." },
              { q: "What certifications do I get?", a: "You get milestones certificates that you can share on LinkedIn. These are proof of your practical lab completions." }
            ].map((item, i) => (
              <div key={i} className="playful-card border-4 flex flex-col items-center text-center p-8">
                <h4 className="text-lg font-black italic mb-4 flex items-center gap-3 justify-center">
                    <div className="w-2 h-2 rounded-full bg-soft-orange" /> {item.q}
                </h4>
                <p className="text-text-dim font-bold text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-40 px-6 relative overflow-hidden flex justify-center">
        <div className="absolute inset-0 bg-text-main" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(147,197,253,0.5)_1px,transparent_1px)] bg-[length:40px_40px]" />
        
        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-12 w-full">
          <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-surface leading-[0.9]">Ready to Become an <br /> <span className="text-soft-blue">Architect?</span></h2>
          <p className="text-surface/60 font-bold text-xl max-w-xl mx-auto">Join the 5,000+ engineers who are building the future of infrastructure.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button onClick={() => openAuth('signup')} className="btn-pill bg-soft-blue text-[#0F172A] px-12 py-6 text-base uppercase tracking-widest hover:bg-white transition-colors">
              Start Free Journey
            </button>
            <button onClick={() => openAuth('login')} className="btn-pill bg-transparent border-4 border-surface/20 text-surface px-12 py-6 text-base uppercase tracking-widest hover:border-surface transition-colors">
              Login to Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-20 px-6 border-t border-border flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="DebugToDeploy" className="w-10 h-10 rounded-xl object-contain mix-blend-screen" />
              <span className="text-xl font-black italic tracking-tighter">Debug<span className="text-soft-blue">To</span>Deploy</span>
            </div>
            <p className="text-text-dim font-bold max-w-sm">The AI-Powered career accelerator for modern infrastructure engineers.</p>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest mb-6">Platform</h4>
            <ul className="space-y-4 text-sm font-bold text-text-dim">
              <li><a href="#features" className="hover:text-soft-blue">Features</a></li>
              <li><a href="#labs" className="hover:text-soft-blue">Cloud Labs</a></li>
              <li><a href="#pricing" className="hover:text-soft-blue">Pricing</a></li>
              <li><a href="/roadmap" className="hover:text-soft-blue">Roadmaps</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-4 text-sm font-bold text-text-dim">
              <li><a href="/privacy" className="hover:text-soft-blue">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-soft-blue">Terms of Service</a></li>
              <li><a href="/support" className="hover:text-soft-blue">Support</a></li>
            </ul>
          </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-10 pt-10 border-t border-border">
            <div className="flex flex-col items-center md:items-start gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim text-center md:text-left">© {new Date().getFullYear()} DebugToDeploy. Developed by Nagarjuna Reddy Annapureddy.</p>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">All Rights Reserved.</p>
            </div>
            <div className="flex items-center gap-6">
               {[
                 { icon: Facebook, link: "https://www.facebook.com/profile.php?id=61589307951543", color: "bg-blue-600 text-white", label: "Facebook" },
                 { icon: Twitter, link: "https://x.com/DebugToDeploy", color: "bg-text-main text-surface", label: "Twitter" },
                 { icon: Instagram, link: "https://www.instagram.com/debugtodeploy?igsh=MTlxcmoyNG9obWN1OA==", color: "bg-pink-600 text-white", label: "Instagram" }
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
                   whileTap={{ scale: 0.9, rotateX: 0, rotateY: 0 }}
                   className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all border-2 border-white/10 relative group",
                     social.color
                   )}
                   style={{ transformStyle: 'preserve-3d' }}
                 >
                   <social.icon className="w-5 h-5 relative z-10" />
                   <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </motion.a>
               ))}
               
               <div className="w-px h-8 bg-border mx-4" />

               <button 
                 onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                 className="text-[10px] font-black uppercase tracking-widest text-soft-blue hover:underline whitespace-nowrap"
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
