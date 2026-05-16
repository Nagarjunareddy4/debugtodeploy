import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, MapPin, Building2, DollarSign, Clock, Zap, Star, ShieldCheck, Search, CheckCircle, ExternalLink, Target, Construction, Rocket, Bell, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn, usePageTitle } from '../lib/utils';

// ─── Beta Splash Screen ──────────────────────────────────────────────────────
function BetaSplash({ onContinue }: { onContinue: () => void }) {
  const features = [
    { icon: Rocket, label: 'AI-Matched Listings', desc: 'Jobs matched to your exact roadmap & skill level' },
    { icon: Bell, label: 'Real-Time Alerts', desc: 'Get notified when a perfect-fit role goes live' },
    { icon: Target, label: 'Readiness Gating', desc: 'See only jobs you are actually qualified for' },
    { icon: ShieldCheck, label: 'One-Click Apply', desc: 'Apply directly without leaving the platform' },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-2xl w-full mx-auto text-center space-y-10"
      >
        {/* Icon */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto w-24 h-24 rounded-3xl bg-soft-orange/10 border-2 border-soft-orange/30 flex items-center justify-center shadow-2xl shadow-soft-orange/10"
        >
          <Construction className="w-12 h-12 text-soft-orange" />
        </motion.div>

        {/* Badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="px-4 py-1.5 bg-soft-orange/10 border border-soft-orange/30 rounded-full text-[10px] font-black uppercase tracking-widest text-soft-orange flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Beta Feature
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter">
            AI Job Board{' '}
            <span className="text-soft-orange">Coming Soon</span>
          </h1>
          <p className="text-text-dim font-bold text-base leading-relaxed max-w-md mx-auto">
            We're building a fully AI-powered job board that matches DevOps roles directly to your skill progress. 
            This feature is currently in <span className="text-soft-orange font-black">beta</span> — expect rapid improvements every week!
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              className="playful-card flex items-start gap-4 p-5 border-2 border-border/50 hover:border-soft-orange/30 transition-colors"
            >
              <div className="w-10 h-10 bg-soft-orange/10 rounded-xl flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-soft-orange" />
              </div>
              <div>
                <p className="font-black text-sm text-text-main">{f.label}</p>
                <p className="text-xs text-text-dim font-bold leading-snug mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onContinue}
            className="btn-pill bg-text-main text-surface px-8 py-3.5 font-black uppercase tracking-widest text-sm flex items-center gap-2 shadow-xl"
          >
            Continue to Beta
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <p className="text-[10px] text-text-dim/60 font-bold uppercase tracking-widest">
            Data may be limited or approximate
          </p>
        </div>
      </motion.div>
    </div>
  );
}

interface Job {
  id: string | number;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salary: string;
  type: string;
  description: string;
  requirements: string[];
  minXp: number;
  minLevel: number;
  minReadiness: number;
  url?: string;
  publicationDate?: string;
  source?: string;
  applied_job_ids?: string[];
}

const mockJobs: Job[] = [
  {
    id: 'job-1',
    title: 'Junior DevOps Engineer',
    company: 'CloudScale Inc.',
    location: 'Remote',
    salary: '₹8,00,000 - ₹12,00,000',
    type: 'Full-time',
    description: 'Looking for an enthusiastic engineer to help maintain our CI/CD pipelines and monitor our cloud infrastructure.',
    requirements: ['Docker', 'Basic Kubernetes', 'GitHub Actions', 'Linux'],
    minXp: 50,
    minLevel: 1,
    minReadiness: 30,
  },
  {
    id: 'job-2',
    title: 'Cloud Infrastructure Specialist',
    company: 'FinTech Solutions',
    location: 'Bengaluru, India',
    salary: '₹15,00,000 - ₹22,00,000',
    type: 'Full-time',
    description: 'Join our core infrastructure team to build secure, scalable environments on AWS using Terraform and Kubernetes.',
    requirements: ['AWS', 'Terraform', 'Kubernetes', 'Python'],
    minXp: 300,
    minLevel: 3,
    minReadiness: 60,
  },
  {
    id: 'job-3',
    title: 'Site Reliability Engineer (SRE)',
    company: 'Global E-Commerce',
    location: 'Remote (Global)',
    salary: '₹25,00,000 - ₹40,00,000',
    type: 'Full-time',
    description: 'Own the uptime and performance of our critical microservices. Strong focus on observability and incident response.',
    requirements: ['Prometheus', 'Grafana', 'Go/Python', 'Advanced K8s'],
    minXp: 800,
    minLevel: 5,
    minReadiness: 85,
  },
  {
    id: 'job-4',
    title: 'DevSecOps Engineer',
    company: 'CyberGuard Systems',
    location: 'Pune, India',
    salary: '₹18,00,000 - ₹26,00,000',
    type: 'Hybrid',
    description: 'Integrate security practices into our CI/CD pipelines. Work with SonarQube, Vault, and cloud security postures.',
    requirements: ['CI/CD Security', 'HashiCorp Vault', 'AWS IAM', 'Docker Security'],
    minXp: 500,
    minLevel: 4,
    minReadiness: 70,
  },
  {
    id: 'job-5',
    title: 'Platform Engineer',
    company: 'TechNova',
    location: 'Hyderabad, India',
    salary: '₹12,00,000 - ₹18,00,000',
    type: 'Full-time',
    description: 'Build internal developer platforms to accelerate our software delivery. Experience with ArgoCD and Helm is a plus.',
    requirements: ['Helm', 'ArgoCD', 'Bash', 'Docker'],
    minXp: 200,
    minLevel: 2,
    minReadiness: 50,
  }
];

export default function JobBoard() {
  usePageTitle('Job Board – Beta');
  const [showBeta, setShowBeta] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [realJobs, setRealJobs] = useState<Job[]>([]);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetchProfileAndJobs();
  }, []);

  const fetchProfileAndJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let currentProfile = null;
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
           setProfile(data);
           currentProfile = data;
           if (data.applied_job_ids) {
             setAppliedJobs(new Set(data.applied_job_ids));
           }
        }
      }

      // Build a robust set of user keywords based on their roadmap data
      let userKeywords: string[] = ['devops', 'cloud']; // Default fallbacks
      if (currentProfile?.roadmap_data) {
        const roadmapStr = typeof currentProfile.roadmap_data === 'string' ? currentProfile.roadmap_data.toLowerCase() : JSON.stringify(currentProfile.roadmap_data).toLowerCase();
        
        const STRONG_TECH_KEYWORDS = [
          'devops', 'aws', 'azure', 'kubernetes', 'cloud', 'sre', 'docker', 
          'terraform', 'ci/cd', 'linux', 'python', 'go', 'gcp', 'jenkins', 
          'ansible', 'infrastructure', 'platform', 'git', 'security', 'monitoring'
        ];

        const matchedTech = STRONG_TECH_KEYWORDS.filter(kw => roadmapStr.includes(kw));
        
        let goalKeywords: string[] = [];
        try {
           const parsed = typeof currentProfile.roadmap_data === 'string' ? JSON.parse(currentProfile.roadmap_data) : currentProfile.roadmap_data;
           if (parsed.goal) {
              goalKeywords = parsed.goal.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').filter((k: string) => k.length > 3);
           }
        } catch(e) {}

        const combined = Array.from(new Set([...matchedTech, ...goalKeywords]));
        if (combined.length > 0) {
           userKeywords = combined;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const jobResponse = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          query: currentProfile?.roadmap_data ? (typeof currentProfile.roadmap_data === 'string' ? JSON.parse(currentProfile.roadmap_data).goal : currentProfile.roadmap_data.goal) : 'DevOps Engineer',
          keywords: userKeywords
        })
      });

      if (!jobResponse.ok) throw new Error('Failed to fetch jobs from backend');
      
      const { jobs } = await jobResponse.json();

      const formattedJobs: Job[] = jobs.map((j: any) => {
         const isSenior = j.title.toLowerCase().includes('senior') || j.title.toLowerCase().includes('lead') || j.title.toLowerCase().includes('principal');
         const isMid = j.title.toLowerCase().includes('mid') || j.title.toLowerCase().includes('engineer');
         
         const minLevel = isSenior ? 4 : isMid ? 2 : 1;
         const minXp = isSenior ? 500 : isMid ? 200 : 50;
         const minReadiness = isSenior ? 80 : isMid ? 60 : 40;

         const descText = j.description ? j.description.replace(/<[^>]+>/g, '').substring(0, 150) + '...' : '';

         return {
            id: j.id,
            title: j.title,
            company: j.company,
            location: j.location,
            salary: 'Competitive',
            type: j.type || 'Full-time',
            description: descText,
            requirements: [j.location === 'Remote' ? 'Remote' : 'On-site', isSenior ? 'Senior Level' : 'Mid/Junior Level', j.source || 'Direct'],
            minXp,
            minLevel,
            minReadiness,
            url: j.url,
            publicationDate: j.pubDate,
            source: j.source
         };
      });

      setRealJobs(formattedJobs.length > 0 ? formattedJobs : mockJobs);
      if (formattedJobs.length === 0) setFetchError(true);
    } catch (err) {
      console.error(err);
      setFetchError(true);
      setRealJobs(mockJobs);
    } finally {
      setLoading(false);
    }
  };

  const openApplicationLink = (job: Job) => {
    if (!job.url) return;
    window.open(job.url, '_blank');
  };

  const updateApplicationStatus = async (job: Job, submitted: boolean) => {
    if (!profile) return;

    const existingIds = Array.isArray(profile.applied_job_ids) ? profile.applied_job_ids.map((id: any) => id.toString()) : [];
    const jobId = job.id.toString();
    let newAppliedIds = [...existingIds];

    if (submitted) {
      if (!newAppliedIds.includes(jobId)) {
        newAppliedIds.push(jobId);
      }
    } else {
      newAppliedIds = newAppliedIds.filter(id => id !== jobId);
    }

    setAppliedJobs(new Set(newAppliedIds));
    setProfile((prev: any) => prev ? { ...prev, applied_job_ids: newAppliedIds } : null);

    try {
      await supabase
        .from('profiles')
        .update({ applied_job_ids: newAppliedIds })
        .eq('id', profile.id);
    } catch (err) {
      console.error('Failed to update application status:', err);
    }
  };

  const calculateMatch = (job: Job) => {
    if (!profile) return 0;
    
    let score = 0;
    const goal = profile?.roadmap_data ? (typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data).goal : profile.roadmap_data.goal) : 'DevOps Engineer';
    const goalWords = goal.toLowerCase().split(/\s+/).filter(w => !['engineer', 'specialist', 'junior', 'senior'].includes(w));
    const title = job.title.toLowerCase();
    
    const titleMatch = goalWords.some(word => title.includes(word)) || 
                      (goal.toLowerCase().includes('devops') && (title.includes('sre') || title.includes('cloud') || title.includes('platform')));
    
    if (titleMatch) score += 40;

    const userKeywords = [
      'devops', 'aws', 'azure', 'kubernetes', 'cloud', 'sre', 'docker', 
      'terraform', 'ci/cd', 'linux', 'python', 'go', 'gcp', 'jenkins', 
      'ansible', 'infrastructure', 'platform', 'git', 'security', 'monitoring'
    ];
    const description = job.description.toLowerCase();
    const matchedCount = userKeywords.filter(k => description.includes(k)).length;
    score += Math.min(matchedCount * 5, 30); 

    let statsScore = 0;
    if (profile.readiness_score >= (job.minReadiness || 50)) statsScore += 10;
    if (profile.xp >= (job.minXp || 500)) statsScore += 10;
    if (profile.level >= (job.minLevel || 1)) statsScore += 10;
    score += statsScore;

    return Math.min(score, 100);
  };

  const filteredJobs = realJobs.filter(job => 
    job.url && (
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.requirements.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  ).sort((a, b) => calculateMatch(b) - calculateMatch(a));

  if (loading) return null;

  if (showBeta) {
    return <BetaSplash onContinue={() => setShowBeta(false)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto space-y-12 pb-24"
    >
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter italic flex items-center gap-4">
            <Briefcase className="w-10 h-10 text-soft-purple" /> AI Job Board
          </h2>
          <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-xs flex items-center gap-2">
            Opportunities matched to your skills
            {profile?.roadmap_data && (
              <span className="bg-soft-blue/10 text-soft-blue px-2 py-0.5 rounded-sm text-[10px] animate-pulse">
                Synced with Roadmap
              </span>
            )}
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search roles, skills..."
            className="w-full bg-brand-bg border-2 border-border rounded-full pl-10 pr-4 py-3 font-bold text-sm outline-none focus:border-soft-blue transition-colors"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="playful-card bg-surface shadow-xl p-6 border-none flex items-center gap-4">
          <div className="w-12 h-12 bg-soft-blue/10 text-soft-blue rounded-full flex items-center justify-center shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-text-dim tracking-widest">Your Readiness</p>
            <p className="text-3xl font-black">{profile?.readiness_score || 0}%</p>
          </div>
        </div>
        <div className="playful-card bg-surface shadow-xl p-6 border-none flex items-center gap-4">
          <div className="w-12 h-12 bg-soft-orange/10 text-soft-orange rounded-full flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-text-dim tracking-widest">Experience (XP)</p>
            <p className="text-3xl font-black">{profile?.xp || 0}</p>
          </div>
        </div>
        <div className="playful-card bg-surface shadow-xl p-6 border-none flex items-center gap-4">
          <div className="w-12 h-12 bg-soft-green/10 text-soft-green rounded-full flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-text-dim tracking-widest">Active Jobs (24h)</p>
            <p className="text-3xl font-black">{realJobs.length}</p>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="bg-soft-orange/10 border-l-4 border-soft-orange p-4 rounded-r-xl">
           <p className="text-sm font-bold text-soft-orange flex items-center gap-2">
              <Zap className="w-4 h-4" /> Could not load external job data (possibly due to adblockers). Showing mock fallback data.
           </p>
        </div>
      )}

      <div className="bg-soft-blue/10 border-l-4 border-soft-blue p-4 rounded-r-xl mb-6">
        <p className="text-sm font-bold text-soft-blue flex items-center gap-2">
          <Star className="w-4 h-4" /> Beta Feature: The Job Board is currently in beta. Direct application links and live job data will be available soon. Stay tuned!
        </p>
      </div>

      <div className="space-y-6">
        <AnimatePresence>
          {filteredJobs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              key="no-jobs"
              className="text-center p-12 text-text-dim font-bold space-y-2"
            >
              <p>No opportunities with available application links found matching your criteria.</p>
              <p className="text-xs text-text-dim/70">Jobs are only shown when direct application links are available. Check back soon for more opportunities!</p>
            </motion.div>
          ) : (
            filteredJobs.map((job, index) => {
              const matchScore = calculateMatch(job);
              const isHighMatch = matchScore >= 80;
              const hasApplied = appliedJobs.has(job.id.toString());

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "playful-card bg-surface p-6 shadow-xl border-2 flex flex-col md:flex-row gap-6 items-start md:items-center transition-colors group",
                    isHighMatch ? "border-soft-green/30 hover:border-soft-green" : "border-border/50 hover:border-border"
                  )}
                >
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-2xl font-black italic">{job.title}</h3>
                        {isHighMatch && (
                          <span className="px-2 py-1 bg-soft-green/10 text-soft-green text-[10px] font-black uppercase tracking-widest rounded-sm flex items-center gap-1">
                            <Star className="w-3 h-3 fill-soft-green" /> Top Match
                          </span>
                        )}
                        {hasApplied && (
                          <span className="px-2 py-1 bg-soft-blue/10 text-soft-blue text-[10px] font-black uppercase tracking-widest rounded-sm flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Submitted
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-text-dim flex items-center gap-2 flex-wrap">
                        <Building2 className="w-4 h-4" /> {job.company}
                        <span className="w-1 h-1 bg-border rounded-full mx-1" />
                        <MapPin className="w-4 h-4" /> {job.location}
                        {job.publicationDate && (
                          <>
                            <span className="w-1 h-1 bg-border rounded-full mx-1" />
                            <Clock className="w-4 h-4" /> {new Date(job.publicationDate).toLocaleDateString('en-IN')}
                          </>
                        )}
                        {job.source && (
                          <>
                            <span className="w-1 h-1 bg-border rounded-full mx-1" />
                            <span className="text-soft-blue px-2 py-0.5 bg-soft-blue/10 rounded text-[10px] font-black">{job.source}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <p className="text-sm font-medium leading-relaxed max-w-3xl">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {job.requirements.map(req => (
                        <span key={req} className="bg-brand-bg px-3 py-1 border border-border/50 rounded-full text-xs font-bold text-text-main">
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="w-full md:w-64 shrink-0 bg-brand-bg rounded-3xl p-5 border-2 border-border flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm font-bold">
                         <span className="text-text-dim flex items-center gap-1"><DollarSign className="w-4 h-4" /> Salary</span>
                         <span>{job.salary}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold">
                         <span className="text-text-dim flex items-center gap-1"><Clock className="w-4 h-4" /> Type</span>
                         <span>{job.type}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold pt-3 border-t border-border">
                         <span className="text-text-dim flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Match</span>
                         <span className={cn(
                           "px-2 py-0.5 rounded-sm",
                           matchScore >= 80 ? "bg-soft-green text-surface" : matchScore >= 50 ? "bg-soft-orange text-surface" : "bg-red-500 text-surface"
                         )}>{matchScore}%</span>
                      </div>
                      {job.publicationDate && (
                         <div className="flex justify-between items-center text-xs font-bold pt-2 text-text-dim">
                            <span>Posted</span>
                            <span>{new Date(job.publicationDate).toLocaleDateString()}</span>
                         </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => openApplicationLink(job)}
                        className={cn(
                          "w-full btn-pill py-3 font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2",
                          !job.url ? "bg-text-main/10 text-text-main/50 cursor-not-allowed" : hasApplied
                            ? "bg-soft-blue text-surface hover:scale-105 shadow-lg shadow-soft-blue/20"
                            : isHighMatch
                              ? "bg-soft-green text-surface hover:scale-105 shadow-lg shadow-soft-green/20"
                              : "bg-text-main text-surface hover:scale-105 shadow-xl"
                        )}
                        disabled={!job.url}
                      >
                        {job.url ? (
                          hasApplied ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              View Application
                            </>
                          ) : (
                            <>
                              Apply Now
                              <ExternalLink className="w-4 h-4" />
                            </>
                          )
                        ) : (
                          'Application link unavailable'
                        )}
                      </button>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-text-dim">Application status</label>
                        <select
                          value={hasApplied ? 'submitted' : 'not_submitted'}
                          onChange={e => updateApplicationStatus(job, e.target.value === 'submitted')}
                          className="w-full rounded-full border border-border bg-brand-bg px-4 py-3 text-sm font-bold outline-none focus:border-soft-blue"
                        >
                          <option value="not_submitted">Not Submitted</option>
                          <option value="submitted">Submitted</option>
                        </select>
                        <p className="text-[10px] text-text-dim leading-snug">Click Apply Now to open the posting, then mark the status as Submitted once you have applied.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
