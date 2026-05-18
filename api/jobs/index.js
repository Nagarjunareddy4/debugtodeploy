/**
 * Job Scraping Module for DevOps Positions in India
 * Aggregates jobs from multiple sources with India-only filtering
 */

import { fetchFromLinkedInAlternative, fetchLinkedInFallback } from './linkedin.js';
import { fetchFromGlassdoorAlternative, fetchGlassdoorFallback, fetchFromIndeedAggregator } from './glassdoor.js';
import { jobCache } from './cache.js';
import {
  fetchFromIndeedIndia,
  fetchFromGitHubJobs,
  fetchFromAngelListIndia,
  fetchFromStackOverflowJobs,
  fetchFromLinkedInIndiaJobs,
  fetchFromDiceJobs
} from './india-boards.js';

const DEVOPS_KEYWORDS = [
  'devops', 'sre', 'platform engineer', 'infrastructure', 'cloud engineer', 
  'kubernetes', 'site reliability', 'cloud', 'aws', 'azure', 'gcp', 'terraform', 
  'docker', 'jenkins', 'ci/cd', 'ansible', 'automation engineer', 'cloud architect'
];

const INDIA_KEYWORDS = [
  'india', 'bangalore', 'bengaluru', 'delhi', 'mumbai', 'pune', 'hyderabad', 
  'Chennai', 'kolkata', 'noida', 'gurgaon', 'gurugram', 'ahmedabad', 'indore',
  'IN', 'India-based', 'Indian'
];

/**
 * Normalize location string for India matching
 */
function isIndiaLocation(location) {
  if (!location) return true; // Include remote without specified location
  const locLower = location.toLowerCase();
  return INDIA_KEYWORDS.some(kw => locLower.includes(kw)) || 
         locLower.includes('remote') ||
         locLower.includes('work from home') ||
         locLower.includes('wfh');
}

/**
 * Check if job matches DevOps keywords
 */
function isDevOpsJob(title, description) {
  const titleLower = title.toLowerCase();
  const descLower = (description || '').toLowerCase();
  return DEVOPS_KEYWORDS.some(kw => titleLower.includes(kw) || descLower.includes(kw));
}

/**
 * Fetch and format jobs from Arbeitnow API (LinkedIn-like aggregator)
 */
async function fetchFromArbeitnow() {
  try {
    const response = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) throw new Error('Arbeitnow fetch failed');
    const data = await response.json();
    const jobs = data.data || [];
    
    return jobs
      .filter(j => isDevOpsJob(j.title, j.description || '') && isIndiaLocation(j.location))
      .map(j => ({
        id: `arbeitnow-${j.slug}`,
        title: j.title,
        company: j.company_name,
        location: j.location || 'Remote (India)',
        description: j.description || '',
        url: j.url,
        pubDate: j.created_at,
        source: 'LinkedIn',
        type: j.job_types?.[0] || 'Full-time'
      }))
      .slice(0, 20);
  } catch (err) {
    // Silent fail
    return [];
  }
}

/**
 * Fetch and format jobs from RemoteOK API (Glassdoor-like aggregator)
 */
async function fetchFromRemoteOK() {
  try {
    const response = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) throw new Error('RemoteOK fetch failed');
    const data = await response.json();
    const jobs = Array.isArray(data) ? data.slice(1) : [];
    
    return jobs
      .filter(j => isDevOpsJob(j.position || '', j.description || '') && 
                   isIndiaLocation(j.location))
      .map(j => ({
        id: `remoteok-${j.id}`,
        title: j.position,
        company: j.company,
        location: j.location || 'Remote (India)',
        description: j.description || '',
        url: j.url,
        pubDate: j.date,
        source: 'Glassdoor',
        type: 'Full-time'
      }))
      .slice(0, 20);
  } catch (err) {
    // Silent fail
    return [];
  }
}

/**
 * Fetch from Wellfound (formerly AngelList) - Startup jobs in India
 */
async function fetchFromWellfound() {
  try {
    const response = await fetch('https://wellfound.com/api/jobs', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) throw new Error('Wellfound fetch failed');
    const data = await response.json();
    const jobs = data.jobs || [];
    
    return jobs
      .filter(j => isDevOpsJob(j.title || '', j.description || '') && 
                   isIndiaLocation(j.location))
      .map(j => ({
        id: `wellfound-${j.id}`,
        title: j.title,
        company: j.company,
        location: j.location || 'Remote (India)',
        description: j.description || '',
        url: j.url,
        pubDate: j.created_at,
        source: 'Wellfound',
        type: j.job_type || 'Full-time'
      }))
      .slice(0, 15);
  } catch (err) {
    // Silent fail
    return [];
  }
}

/**
 * Fetch from We Work Remotely - Remote job board
 */
async function fetchFromWeWorkRemotely() {
  try {
    const response = await fetch('https://weworkremotely.com/api/jobs', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) throw new Error('WeWorkRemotely fetch failed');
    const data = await response.json();
    const jobs = data.jobs || [];
    
    return jobs
      .filter(j => isDevOpsJob(j.title || '', j.description || '') && 
                   isIndiaLocation(j.location))
      .map(j => ({
        id: `weworkremotely-${j.id}`,
        title: j.title,
        company: j.company,
        location: j.location || 'Remote (India)',
        description: j.description || '',
        url: j.url,
        pubDate: j.posted_date,
        source: 'WeWorkRemotely',
        type: 'Full-time'
      }))
      .slice(0, 15);
  } catch (err) {
    // Silent fail
    return [];
  }
}

/**
 * Main job scraping function - aggregates from multiple sources
 */
async function scrapeJobs() {
  
  try {
    // Check cache first
    const cachedJobs = jobCache.get();
    if (cachedJobs) {
      return cachedJobs;
    }

    // Fetch from all sources in parallel
    const [
      arbeitnowJobs,
      remoteOKJobs,
      wellfoundJobs,
      weWorkRemotelyJobs,
      linkedInJobs,
      glassdoorJobs,
      // Indian job boards
      indeedIndiaJobs,
      githubJobs,
      angelListJobs,
      stackOverflowJobs,
      linkedInIndiaJobs,
      diceJobs
    ] = await Promise.all([
      fetchFromArbeitnow(),
      fetchFromRemoteOK(),
      fetchFromWellfound(),
      fetchFromWeWorkRemotely(),
      fetchFromLinkedInAlternative().catch(() => fetchLinkedInFallback()),
      fetchFromGlassdoorAlternative().catch(() => fetchGlassdoorFallback()),
      // Indian boards with error handling
      fetchFromIndeedIndia().catch(() => []),
      fetchFromGitHubJobs().catch(() => []),
      fetchFromAngelListIndia().catch(() => []),
      fetchFromStackOverflowJobs().catch(() => []),
      fetchFromLinkedInIndiaJobs().catch(() => []),
      fetchFromDiceJobs().catch(() => [])
    ]);

    // Combine and deduplicate jobs
    let allJobs = [
      ...arbeitnowJobs,
      ...remoteOKJobs,
      ...wellfoundJobs,
      ...weWorkRemotelyJobs,
      ...linkedInJobs,
      ...glassdoorJobs,
      ...indeedIndiaJobs,
      ...githubJobs,
      ...angelListJobs,
      ...stackOverflowJobs,
      ...linkedInIndiaJobs,
      ...diceJobs
    ];

    // Remove duplicates based on title and company
    const seen = new Set();
    allJobs = allJobs.filter(job => {
      const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by recent first
    allJobs.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0);
      const dateB = new Date(b.pubDate || 0);
      return dateB - dateA;
    });

    // deduplicate and cache
    jobCache.set(allJobs);
    
    return allJobs;
  } catch (error) {
    // Try to return cached data even if expired
    const cachedJobs = jobCache.cache;
    if (cachedJobs) {
      return cachedJobs;
    }
    return [];
  }
}

/**
 * Filter and rank jobs based on user preferences
 */
function rankJobs(jobs, userKeywords = []) {
  const keywords = userKeywords.length > 0 ? userKeywords : DEVOPS_KEYWORDS;
  
  return jobs.map(job => {
    let score = 0;
    const titleLower = job.title.toLowerCase();
    const descLower = (job.description || '').toLowerCase();

    // Title match (40 points max)
    const titleMatches = keywords.filter(k => titleLower.includes(k)).length;
    score += Math.min(titleMatches * 8, 40);

    // Description match (30 points max)
    const descMatches = keywords.filter(k => descLower.includes(k)).length;
    score += Math.min(descMatches * 5, 30);

    // Location bonus (10 points)
    if (job.location && (job.location.includes('India') || job.location.includes('Remote'))) {
      score += 10;
    }

    // Recency bonus (20 points)
    const jobDate = new Date(job.pubDate || 0);
    const daysSince = (Date.now() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 1) score += 20;
    else if (daysSince < 3) score += 15;
    else if (daysSince < 7) score += 10;

    return { ...job, score };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Get jobs with optional filtering and ranking
 */
async function getJobs(userKeywords = []) {
  const jobs = await scrapeJobs();
  return rankJobs(jobs, userKeywords).slice(0, 50);
}

export { scrapeJobs, rankJobs, getJobs, isDevOpsJob, isIndiaLocation };
