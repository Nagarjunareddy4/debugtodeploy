import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, CheckCircle2, Star, ShieldCheck, Briefcase, Users, Brain,
  Terminal as TerminalIcon, Smartphone, Facebook, Instagram, Twitter
} from 'lucide-react';
import LandingNavbar from '../components/layout/LandingNavbar';
import AuthModal from '../components/layout/AuthModal';
import { RoadmapBadge3D } from '../components/ui/RoadmapBadge3D';
import { cn, useMeta } from '../lib/utils';
import { Logo } from '../components/ui/Logo';
import { fadeUp, fadeUpLarge, staggerContainer, clayHover, clayHoverSm } from '../lib/motion';

const HERO_LOG: { text: string; cls?: string; delay: number }[] = [
  { text: '$ kubectl get pods -n production', cls: 'ldg-log-dim', delay: 0 },
  { text: 'nginx-deployment   0/1   CrashLoopBackOff   12m', cls: 'ldg-log-err', delay: 0.5 },
  { text: '$ kubectl logs nginx-deployment-7f9 --previous', cls: 'ldg-log-dim', delay: 1.1 },
  { text: 'Error: ImagePullBackOff -- tag "v2.3.1" not found', cls: 'ldg-log-err', delay: 1.6 },
  { text: '$ you fix the manifest, push, redeploy', cls: 'ldg-log-dim', delay: 2.3 },
  { text: 'rollout status: 1/1 Running', cls: 'ldg-log-ok', delay: 3.0 },
  { text: 'DEPLOYED -- 0 incidents, 4m12s', cls: 'ldg-log-ok', delay: 3.5 },
];

export default function Landing({ session }: { session: any }) {
  useMeta(
    'DebugToDeploy | Practice production-grade DevOps, not slideshows',
    'DebugToDeploy is where engineers practice fixing real Kubernetes, Terraform, and CI/CD failures -- then prove it with a portfolio that reads like an incident log, not a certificate wall.',
    '/og-image.png'
  );

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const openAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="ldg-wrap ldg-grain min-h-screen w-full overflow-x-hidden relative">
      {/* Ambient warmth — subtle radial glow, not a blob, just enough to avoid flatness */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] pointer-events-none opacity-60"
        style={{ background: 'radial-gradient(ellipse at center, rgba(255,138,30,0.07) 0%, transparent 65%)' }}
      />
      <LandingNavbar onAuthClick={() => openAuth('login')} session={session} />

      {/* Hero: the incident log is the thesis */}
      <section className="relative w-full pt-32 md:pt-40 pb-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.1)}>
            <motion.span variants={fadeUp} className="ldg-eyebrow">incident-014 -- resolved by a learner, not a slideshow</motion.span>

            <motion.h1 variants={fadeUpLarge} className="ldg-display text-[2.6rem] sm:text-5xl md:text-6xl leading-[1.05] mt-6 mb-7">
              Most DevOps courses<br />
              teach you to <span className="text-[var(--ldg-text-dim)] line-through decoration-2">watch</span>.<br />
              We hand you <span className="text-[var(--ldg-cyan)]">the pager.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-[var(--ldg-text-dim)] text-lg leading-relaxed max-w-lg mb-10">
              No carousel modules, no badge confetti. DebugToDeploy drops you into broken
              Kubernetes clusters, drifted Terraform state, and failing pipelines -- the same
              shape of problems that show up in a 2am page. You fix the real thing.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mb-12">
              <motion.button
                {...clayHover}
                onClick={() => openAuth('signup')}
                className="ldg-btn-primary px-8 py-4 flex items-center justify-center gap-2"
              >
                Start your first incident <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.a {...clayHover} href="#labs" className="ldg-btn-ghost px-8 py-4 flex items-center justify-center">
                See a real lab
              </motion.a>
            </motion.div>

            <div className="flex items-center gap-4 ldg-mono text-[0.7rem] text-[var(--ldg-text-dim)] uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[var(--ldg-ok)] rounded-full" /> 5,000+ engineers on the roster
              </span>
            </div>
          </motion.div>

          {/* Signature element: live incident-log terminal */}
          <div className="relative">
            <div className="ldg-panel relative">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--ldg-wire)]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                </div>
                <span className="ldg-mono text-[0.65rem] text-[var(--ldg-text-dim)] uppercase tracking-widest">
                  prod-cluster-01 / postmortem
                </span>
                <div className="w-10" />
              </div>
              <div className="p-6 ldg-mono text-[0.8rem] leading-7">
                {HERO_LOG.map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: line.delay, duration: 0.3 }}
                    className={line.cls}
                  >
                    {line.text}
                  </motion.p>
                ))}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 4.0 }}
                  className="ldg-cursor"
                />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 ldg-panel px-5 py-3 hidden sm:block">
              <p className="ldg-mono text-[0.65rem] text-[var(--ldg-text-dim)] uppercase tracking-widest mb-1">time to first lab</p>
              <p className="ldg-display text-xl text-[var(--ldg-cyan)]">0.2s boot</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works: a real sequence, so numbering earns its keep */}
      <section id="flow" className="w-full py-20 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <span className="ldg-eyebrow">the loop</span>
          <h2 className="ldg-display text-3xl md:text-4xl mt-4 mb-14 max-w-xl">
            Every lab runs the same loop production runs on.
          </h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer(0.08)}
            className="grid grid-cols-1 md:grid-cols-4 gap-5"
          >
            {[
              { step: '01', title: 'Break', desc: 'We hand you a cluster, pipeline, or stack that is already failing -- on purpose.' },
              { step: '02', title: 'Debug', desc: 'Read logs, trace state, isolate root cause. No multiple-choice quiz to fall back on.' },
              { step: '03', title: 'Deploy', desc: 'Ship the fix into the sandbox and watch it hold under the next check.' },
              { step: '04', title: 'Log it', desc: 'Your fix becomes a portfolio entry -- timestamped, verifiable, not a participation badge.' },
            ].map((s) => (
              <motion.div key={s.step} variants={fadeUp} {...clayHover} className="ldg-card p-8">
                <span className="ldg-mono text-[var(--ldg-cyan)] text-sm">{s.step}</span>
                <h3 className="ldg-display text-xl mt-3 mb-2">{s.title}</h3>
                <p className="text-[var(--ldg-text-dim)] text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Labs */}
      <section id="labs" className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          <div>
            <span className="ldg-eyebrow">the practice arena</span>
            <h2 className="ldg-display text-3xl md:text-4xl mt-4 mb-6 leading-tight">
              Real infrastructure.<br />Real failure states.
            </h2>
            <p className="text-[var(--ldg-text-dim)] text-lg leading-relaxed mb-8 max-w-md">
              No theoretical slides. Interactive terminals running actual Kubernetes crashes,
              Terraform drift, and CI/CD pipeline failures -- the kind that do not have a clean
              textbook answer.
            </p>
            <ul className="space-y-3 mb-10">
              {['AWS / Azure / GCP sandboxes', 'Kubernetes cluster debugging', 'Terraform & IaC drift challenges', 'Jenkins & GitHub Actions labs'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-[var(--ldg-text)]">
                  <CheckCircle2 className="w-4 h-4 text-[var(--ldg-ok)] shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <button onClick={() => openAuth('signup')} className="ldg-btn-primary px-8 py-4">
              Access all labs
            </button>
          </div>

          <div className="ldg-panel">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--ldg-wire)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <span className="ldg-mono text-[0.65rem] text-[var(--ldg-text-dim)] uppercase tracking-widest">terminal -- k8s-debug-01</span>
              <div className="w-10" />
            </div>
            <div className="p-6 ldg-mono text-sm space-y-3">
              <p className="ldg-log-dim">$ kubectl get pods</p>
              <p className="text-[var(--ldg-text-dim)] text-xs">NAME                READY   STATUS              RESTARTS   AGE</p>
              <p className="text-[var(--ldg-text)] text-xs">nginx-deployment    0/1     CrashLoopBackOff    5          12m</p>
              <p className="ldg-log-err">ERROR: ImagePullBackOff</p>
              <p className="ldg-cursor" />
            </div>
          </div>
        </div>
      </section>

      {/* App download */}
      <section className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="ldg-eyebrow">mobile -- beta</span>
            <h2 className="ldg-display text-3xl md:text-4xl mt-4 mb-6 leading-tight">
              The pager fits<br />in your pocket.
            </h2>
            <p className="text-[var(--ldg-text-dim)] text-lg leading-relaxed mb-8 max-w-md">
              Run lab exercises, track your fix history, and warm up for interviews from the
              native app -- built for the commute, not the classroom.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => openAuth('signup')} className="ldg-btn-primary px-8 py-4 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Get the app beta
              </button>
              <button disabled className="ldg-btn-ghost px-8 py-4 opacity-40 cursor-not-allowed">
                iOS -- coming soon
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="ldg-panel w-full max-w-[280px] aspect-[9/18.5] flex flex-col items-center justify-center gap-6 p-6">
              <Logo className="w-14 h-14" />
              <div className="text-center">
                <h4 className="ldg-display text-base mb-1">Cloud sandboxes</h4>
                <p className="ldg-mono text-[0.65rem] text-[var(--ldg-text-dim)] uppercase tracking-widest">in your pocket</p>
              </div>
              <div className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ldg-ok)]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ldg-cyan)]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ldg-text-dim)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="max-w-2xl mb-16">
            <span className="ldg-eyebrow">what's under the hood</span>
            <h2 className="ldg-display text-3xl md:text-4xl mt-4">
              One platform. The tools hiring managers actually check for.
            </h2>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer(0.06)}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {[
              { icon: Briefcase, title: 'AI job board', desc: 'Live roles matched to your roadmap goal and technical readiness score.' },
              { icon: Users, title: 'Global leaderboard', desc: 'Compete with engineers worldwide by completing labs and clearing interviews.' },
              { icon: Brain, title: 'Interview analytics', desc: 'AI breakdown of your mock interview performance with concrete coaching notes.' },
              { icon: TerminalIcon, title: 'Production labs', desc: 'Sandboxes that fail the way real infrastructure fails -- not staged demos.' },
              { icon: ShieldCheck, title: 'Verified portfolio', desc: 'Every completed fix becomes a timestamped, shareable record of real work.' },
              { icon: Star, title: 'AI roadmaps', desc: 'A path built from your experience level and target role, not a generic syllabus.' },
            ].map((f) => (
              <motion.div key={f.title} variants={fadeUp} {...clayHover} className="ldg-card p-8">
                <f.icon className="w-5 h-5 text-[var(--ldg-cyan)] mb-5" />
                <h3 className="ldg-display text-lg mb-2">{f.title}</h3>
                <p className="text-[var(--ldg-text-dim)] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Achievement badges */}
      <section className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="max-w-2xl mb-16">
            <span className="ldg-eyebrow">proof of work</span>
            <h2 className="ldg-display text-3xl md:text-4xl mt-4">
              Milestones that look like what you actually built.
            </h2>
          </div>
          <div className="flex overflow-x-auto gap-6 pb-6 -mx-6 px-6 no-scrollbar snap-x snap-mandatory">
            {['Docker Pilot', 'K8s Healer', 'SRE Master', 'Cloud Architect', 'Git Guru', 'SRE Monitor'].map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="ldg-card flex-none w-[240px] snap-center flex flex-col items-center gap-5 p-8"
              >
                <div className="w-24 h-24 flex items-center justify-center">
                  <RoadmapBadge3D stageName={name} earned size="md" showGlow={false} />
                </div>
                <div className="text-center">
                  <p className="ldg-mono text-[0.6rem] text-[var(--ldg-text-dim)] uppercase tracking-widest mb-1">unlocked</p>
                  <h3 className="ldg-display text-base">{name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-5xl mx-auto w-full">
          <div className="max-w-2xl mb-16">
            <span className="ldg-eyebrow">clearance levels</span>
            <h2 className="ldg-display text-3xl md:text-4xl mt-4">Start free. Upgrade when the labs aren't enough.</h2>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer(0.1)}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"
          >
            <motion.div variants={fadeUp} className="ldg-card p-10 flex flex-col">
              <h3 className="ldg-display text-xl mb-2">Free Fleet</h3>
              <p className="text-[var(--ldg-text-dim)] text-sm mb-8">The foundation for your engineering journey.</p>
              <div className="ldg-display text-4xl mb-8">$0<span className="ldg-mono text-xs text-[var(--ldg-text-dim)] ml-2 uppercase tracking-widest">/ month</span></div>
              <ul className="space-y-3 mb-10 flex-1">
                {['1 AI roadmap / week', '2 AI assistant searches / day', 'Basic cloud labs access', 'Community support', 'Standard portfolio'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[var(--ldg-ok)] shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => openAuth('signup')} className="ldg-btn-ghost w-full py-4">Get started free</button>
            </motion.div>

            <motion.div variants={fadeUp} className="ldg-card p-10 flex flex-col relative" style={{ borderColor: 'rgba(255,157,61,0.5)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 50px -12px rgba(255,138,30,0.45)' }}>
              <span className="absolute top-6 right-6 ldg-mono text-[0.6rem] uppercase tracking-widest text-[var(--ldg-amber)] border border-[var(--ldg-amber)] rounded-full px-2.5 py-1">Fleet captain</span>
              <h3 className="ldg-display text-xl mb-2">Pro</h3>
              <p className="text-[var(--ldg-text-dim)] text-sm mb-8">Full-throttle engineering with unlimited AI.</p>
              <div className="ldg-display text-4xl mb-8 text-[var(--ldg-amber)]">$6<span className="ldg-mono text-xs text-[var(--ldg-text-dim)] ml-2 uppercase tracking-widest">/ month</span></div>
              <ul className="space-y-3 mb-10 flex-1">
                {['Unlimited interactive cloud sandbox', 'AI portfolio & resume builder', 'Unlimited AI mock interviews', 'Unlimited AI roadmaps', 'Unlimited AI assistant search', 'PDF resume export & sharing', 'Early access to beta features'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[var(--ldg-amber)] shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => openAuth('signup')} className="ldg-btn-primary w-full py-4">Command the fleet</button>
            </motion.div>
          </motion.div>

          {/* <div className="flex items-center gap-3 ldg-panel px-6 py-4 w-fit">
            <ShieldCheck className="w-4 h-4 text-[var(--ldg-ok)]" />
            <p className="ldg-mono text-[0.65rem] uppercase tracking-widest text-[var(--ldg-text-dim)]">14-day money back -- secure payment processing</p>
          </div> */}
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { name: 'Alex Rivera', role: 'Cloud Engineer @ Vercel', text: 'The labs are unlike anything else. It is actually hard, which is why it works.' },
            { name: 'Sarah Chen', role: 'Junior SRE', text: 'The AI roadmap gave me a clear path when I was overwhelmed. Three months later, I had an offer.' },
            { name: 'Marcus Thorne', role: 'Platform Lead', text: 'We use it to vet new hires. If they can finish the Kubernetes labs, we know they are legit.' },
          ].map((t) => (
            <div key={t.name} className="space-y-5">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3.5 h-3.5 fill-[var(--ldg-amber)] text-[var(--ldg-amber)]" />)}
              </div>
              <p className="text-lg leading-relaxed">"{t.text}"</p>
              <div>
                <p className="ldg-mono text-sm">{t.name}</p>
                <p className="ldg-mono text-[0.65rem] text-[var(--ldg-text-dim)] uppercase tracking-widest">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="w-full py-24 px-6 flex justify-center">
        <div className="max-w-5xl mx-auto w-full">
          <span className="ldg-eyebrow">read before you ask support</span>
          <h2 className="ldg-display text-3xl md:text-4xl mt-4 mb-14">Frequently asked</h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer(0.07)}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {[
              { q: 'Is the sandbox really free?', a: 'Yes. Every user gets a limited number of cloud lab environments each month. Pro users get unlimited access.' },
              { q: 'How accurate is the AI roadmap?', a: 'Trained on thousands of DevOps job descriptions and career paths, and updated weekly against industry trends.' },
              { q: 'Do I need a credit card to start?', a: 'No. You can start generating roadmaps and exploring labs with just an email.' },
              { q: 'What certifications do I get?', a: 'Milestone certificates you can share on LinkedIn -- proof of practical lab completions, not attendance.' },
            ].map((item) => (
              <motion.div key={item.q} variants={fadeUp} className="ldg-card p-8">
                <h4 className="ldg-display text-base mb-3">{item.q}</h4>
                <p className="text-[var(--ldg-text-dim)] text-sm leading-relaxed">{item.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-32 px-6 flex justify-center">
        <div className="max-w-3xl mx-auto text-center">
          <span className="ldg-eyebrow">status: accepting new engineers</span>
          <h2 className="ldg-display text-4xl md:text-6xl mt-6 mb-8 leading-tight">
            Stop watching tutorials.<br />Start carrying the pager.
          </h2>
          <p className="text-[var(--ldg-text-dim)] text-lg mb-10">
            Join 5,000+ engineers building a portfolio that has actually been tested.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => openAuth('signup')} className="ldg-btn-primary px-10 py-5">
              Start your first incident
            </button>
            <button onClick={() => openAuth('login')} className="ldg-btn-ghost px-10 py-5">
              Log in
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-16 px-6 border-t border-[var(--ldg-wire)] flex justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <Logo className="w-8 h-8" />
                <span className="ldg-mono text-sm font-semibold">debug<span className="text-[#00D4FF]">→</span>deploy</span>
              </div>
              <p className="text-[var(--ldg-text-dim)] text-sm max-w-sm">
                A practice ground for engineers who would rather fix something real than watch another slide.
              </p>
            </div>
            <div>
              <h4 className="ldg-mono text-[0.65rem] uppercase tracking-widest mb-5 text-[var(--ldg-text-dim)]">Platform</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-[var(--ldg-cyan)] transition-colors">Features</a></li>
                <li><a href="#labs" className="hover:text-[var(--ldg-cyan)] transition-colors">Cloud labs</a></li>
                <li><a href="#pricing" className="hover:text-[var(--ldg-cyan)] transition-colors">Pricing</a></li>
                <li><a href="/roadmap" className="hover:text-[var(--ldg-cyan)] transition-colors">Roadmaps</a></li>
              </ul>
            </div>
            <div>
              <h4 className="ldg-mono text-[0.65rem] uppercase tracking-widest mb-5 text-[var(--ldg-text-dim)]">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/privacy" className="hover:text-[var(--ldg-cyan)] transition-colors">Privacy policy</a></li>
                <li><a href="/terms" className="hover:text-[var(--ldg-cyan)] transition-colors">Terms of service</a></li>
                <li><a href="/support" className="hover:text-[var(--ldg-cyan)] transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8 border-t border-[var(--ldg-wire)]">
            <p className="ldg-mono text-[0.6rem] uppercase tracking-widest text-[var(--ldg-text-dim)]">
              (c) {new Date().getFullYear()} DebugToDeploy -- Nagarjunareddy. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              {[
                { icon: Facebook, link: 'https://www.facebook.com/profile.php?id=61589307951543', label: 'Facebook' },
                { icon: Twitter, link: 'https://x.com/DebugToDeploy', label: 'Twitter' },
                { icon: Instagram, link: 'https://www.instagram.com/debugtodeploy?igsh=MTlxcmoyNG9obWN1OA==', label: 'Instagram' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 ldg-hairline border flex items-center justify-center hover:border-[var(--ldg-cyan)] hover:text-[var(--ldg-cyan)] transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="ldg-mono text-[0.65rem] uppercase tracking-widest text-[var(--ldg-cyan)] hover:underline ml-2"
              >
                Back to top
              </button>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authMode} />
    </div>
  );
}
