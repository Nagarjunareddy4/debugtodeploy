import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, MapPin, Building2, DollarSign, Clock, Zap, Star, ShieldCheck, Search, Filter, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn, usePageTitle } from '../lib/utils';

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
  usePageTitle('Job Board');
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
        }
      }

      // Build a robust set of user keywords based on their roadmap data
      let userKeywords: string[] = ['devops', 'cloud']; // Default fallbacks
      if (currentProfile?.roadmap_data) {
        const roadmapStr = typeof currentProfile.roadmap_data === 'string' ? currentProfile.roadmap_data.toLowerCase() : JSON.stringify(currentProfile.roadmap_data).toLowerCase();
        
        // Dictionary of strong tech keywords relevant to our platform
        const STRONG_TECH_KEYWORDS = [
          'devops', 'aws', 'azure', 'kubernetes', 'cloud', 'sre', 'docker', 
          'terraform', 'ci/cd', 'linux', 'python', 'go', 'gcp', 'jenkins', 
          'ansible', 'infrastructure', 'platform', 'git', 'security', 'monitoring'
        ];

        // Extract all tech keywords that actually exist anywhere in the user's generated roadmap
        const matchedTech = STRONG_TECH_KEYWORDS.filter(kw => roadmapStr.includes(kw));
        
        // Also extract words from the specific goal (e.g., "Site Reliability Engineer" -> ["site", "reliability", "engineer"])
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

      // Fetch from Jobicy API via AllOrigins to bypass CORS and Cloudflare Bot Management
      const targetUrl = 'https://jobicy.com/api/v2/remote-jobs?count=50&industry=engineering';
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      
      const proxyData = await res.json();
      const apiData = JSON.parse(proxyData.contents);
      
      let jobs: any[] = apiData.jobs || [];

      // Filter jobs by relevance to the user's roadmap tech stack
      if (userKeywords.length > 0) {
         const relevantJobs = jobs.filter(j => {
            const text = ((j.jobTitle || '') + ' ' + (j.jobDescription || '')).toLowerCase();
            // A job is relevant if it mentions at least one of the user's core tech keywords
            return userKeywords.some(k => text.includes(k));
         });
         
         // Only apply relevance filter if it yields results, otherwise fallback to all engineering jobs
         if (relevantJobs.length > 0) {
            jobs = relevantJobs;
         }
      }
      
      // Filter by past 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let recentJobs = jobs.filter(j => new Date(j.pubDate) > yesterday);
      
      // If none found in 24h, fallback to all (so UI isn't completely empty, but prioritize recent)
      if (recentJobs.length === 0) {
         recentJobs = jobs.slice(0, 20); // Top 20 most recent
      }

      const formattedJobs: Job[] = recentJobs.map((j: any) => {
         // Auto-generate requirements/min levels based on keywords
         const isSenior = j.jobLevel === 'Senior' || j.jobTitle.toLowerCase().includes('senior') || j.jobTitle.toLowerCase().includes('lead') || j.jobTitle.toLowerCase().includes('principal');
         const isMid = j.jobLevel === 'Mid' || j.jobTitle.toLowerCase().includes('mid') || j.jobTitle.toLowerCase().includes('engineer');
         
         const minLevel = isSenior ? 4 : isMid ? 2 : 1;
         const minXp = isSenior ? 500 : isMid ? 200 : 50;
         const minReadiness = isSenior ? 80 : isMid ? 60 : 40;

         const descText = j.jobDescription ? j.jobDescription.replace(/<[^>]+>/g, '').substring(0, 150) + '...' : '';

         return {
            id: j.id,
            title: j.jobTitle,
            company: j.companyName,
            companyLogo: j.companyLogo,
            location: j.jobGeo || 'Remote',
            salary: 'Competitive',
            type: j.jobType && j.jobType.length > 0 ? j.jobType[0] : 'Full-time',
            description: descText,
            requirements: ['Remote', isSenior ? 'Senior Level' : 'Mid/Junior Level', j.jobIndustry && j.jobIndustry.length > 0 ? j.jobIndustry[0] : 'Engineering'],
            minXp,
            minLevel,
            minReadiness,
            url: j.url,
            publicationDate: j.pubDate
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

  const handleApply = (jobId: string) => {
    setAppliedJobs(prev => new Set(prev).add(jobId));
  };

  const calculateMatch = (job: Job) => {
    if (!profile) return 0;
    
    // Weighted scoring logic based on profile stats vs job requirements
    let score = 0;
    let maxScore = 3; 

    // Readiness score match (0-1 point)
    if (profile.readiness_score >= job.minReadiness) score += 1;
    else score += (profile.readiness_score / job.minReadiness);

    // XP match (0-1 point)
    if (profile.xp >= job.minXp) score += 1;
    else score += (profile.xp / job.minXp);

    // Level match (0-1 point)
    if (profile.level >= job.minLevel) score += 1;
    else score += (profile.level / job.minLevel);

    const percentage = Math.min(Math.round((score / maxScore) * 100), 100);
    return percentage;
  };

  const filteredJobs = realJobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.requirements.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => calculateMatch(b) - calculateMatch(a)); // Sort by highest match

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter italic flex items-center gap-4">
            <Briefcase className="w-10 h-10 text-soft-purple" /> AI Job Board
          </h2>
          <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-xs">
            Opportunities matched to your skills
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

      {/* Stats Overview */}
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

      <div className="space-y-6">
        <AnimatePresence>
          {filteredJobs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center p-12 text-text-dim font-bold"
            >
              No opportunities found matching your criteria.
            </motion.div>
          ) : (
            filteredJobs.map((job, index) => {
              const matchScore = calculateMatch(job);
              const isHighMatch = matchScore >= 80;
              const hasApplied = appliedJobs.has(job.id);

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
                      </div>
                      <p className="text-sm font-bold text-text-dim flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> {job.company}
                        <span className="w-1 h-1 bg-border rounded-full mx-1" />
                        <MapPin className="w-4 h-4" /> {job.location}
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

                    {job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "w-full btn-pill py-3 font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2",
                          isHighMatch 
                            ? "bg-soft-green text-surface hover:scale-105 shadow-lg shadow-soft-green/20"
                            : "bg-text-main text-surface hover:scale-105 shadow-xl"
                        )}
                      >
                        Apply Now
                      </a>
                    ) : (
                      <button
                        onClick={() => handleApply(job.id as string)}
                        disabled={hasApplied}
                        className={cn(
                          "w-full btn-pill py-3 font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2",
                          hasApplied 
                            ? "bg-text-main/10 text-text-main/50 cursor-not-allowed"
                            : isHighMatch 
                              ? "bg-soft-green text-surface hover:scale-105 shadow-lg shadow-soft-green/20"
                              : "bg-text-main text-surface hover:scale-105 shadow-xl"
                        )}
                      >
                        {hasApplied ? 'Applied ✓' : 'Easy Apply'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
