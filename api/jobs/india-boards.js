/**
 * Indian Job Boards Scraping Module
 * Specific scrapers for popular Indian job platforms
 */

import { fetchLinkedInFallback } from './linkedin.js';

/**
 * Fetch from Indeed.co.in - Indian version of Indeed
 * Uses public API alternative
 */
async function fetchFromIndeedIndia() {
  try {
    // Indeed.co.in doesn't have a public API, but we can use job aggregators
    // that include Indeed India listings
    const response = await fetch('https://jsearch.p.rapidapi.com/search?query=DevOps%20Engineer%20Indeed%20India&page=1&num_pages=1&date_posted=last7days', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    });

    if (!response.ok || !process.env.RAPIDAPI_KEY) throw new Error('Indeed India API not available');
    
    const data = await response.json();
    const jobs = data.data || [];

    return jobs
      .filter(j => {
        const locLower = (j.job_location || '').toLowerCase();
        return locLower.includes('india') || locLower.includes('bangalore') || 
               locLower.includes('delhi') || locLower.includes('mumbai') || 
               locLower.includes('pune') || locLower.includes('hyderabad') || 
               j.job_country === 'IN';
      })
      .map(j => ({
        id: `indeed-india-${j.job_id}`,
        title: j.job_title,
        company: j.employer_name,
        location: j.job_location || 'India',
        description: j.job_description || '',
        url: j.job_apply_link,
        pubDate: j.job_posted_at_datetime_utc,
        source: 'Indeed',
        type: j.job_employment_type || 'Full-time'
      }))
      .slice(0, 15);
  } catch (err) {
    return [];
  }
}

/**
 * Fetch from GitHub Jobs API filtered for India
 */
async function fetchFromGitHubJobs() {
  try {
    const response = await fetch('https://jobs.github.com/positions.json?search=devops&location=india', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error('GitHub Jobs API failed');
    
    const jobs = await response.json();

    return jobs
      .filter(j => {
        const locLower = (j.location || '').toLowerCase();
        return locLower.includes('india') || locLower.includes('remote') || 
               j.location === 'Anywhere' || locLower.includes('bangalore') ||
               locLower.includes('delhi') || locLower.includes('mumbai');
      })
      .map(j => ({
        id: `github-${j.id}`,
        title: j.title,
        company: j.company,
        location: j.location || 'Remote',
        description: j.description || '',
        url: j.url,
        pubDate: j.created_at,
        source: 'GitHub Jobs',
        type: 'Full-time'
      }))
      .slice(0, 15);
  } catch (err) {
    return [];
  }
}

/**
 * Fetch from AngelList (Wellfound) filtered for India startups
 */
async function fetchFromAngelListIndia() {
  try {
    const response = await fetch('https://www.wellfound.com/api/search?query=devops&country=IN', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error('AngelList API failed');
    
    const data = await response.json();
    const jobs = data.data || [];

    return jobs
      .filter(j => j.location && j.location.includes('India'))
      .map(j => ({
        id: `angellist-${j.id}`,
        title: j.title,
        company: j.company,
        location: j.location || 'India',
        description: j.description || '',
        url: j.url,
        pubDate: j.created_at,
        source: 'AngelList',
        type: j.job_type || 'Full-time'
      }))
      .slice(0, 15);
  } catch (err) {
    return [];
  }
}

/**
 * Fetch from Stack Overflow Jobs filtered for India
 */
async function fetchFromStackOverflowJobs() {
  try {
    const response = await fetch('https://stackoverflow.com/jobs/api/jobs?searchterm=devops&location=India', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error('Stack Overflow Jobs API failed');
    
    const jobs = await response.json();

    return jobs
      .map(j => ({
        id: `stackoverflow-${j.id}`,
        title: j.title,
        company: j.company,
        location: j.location || 'India',
        description: j.description || '',
        url: j.apply_url || j.url,
        pubDate: j.published_at || new Date().toISOString(),
        source: 'Stack Overflow',
        type: j.job_type || 'Full-time'
      }))
      .slice(0, 15);
  } catch (err) {
    return [];
  }
}

/**
 * Fetch from LinkedIn Jobs via API aggregator (India filter)
 */
async function fetchFromLinkedInIndiaJobs() {
  try {
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    };

    if (!process.env.RAPIDAPI_KEY) {
      return await fetchLinkedInFallback();
    }

    const response = await fetch(
      'https://jsearch.p.rapidapi.com/search?query=DevOps%20Engineer%20LinkedIn%20India&page=1&num_pages=1',
      options
    );

    if (!response.ok) throw new Error('LinkedIn India API failed');
    
    const data = await response.json();
    const jobs = data.data || [];

    return jobs
      .filter(j => j.job_country === 'IN' || (j.job_location && j.job_location.includes('India')))
      .map(j => ({
        id: `linkedin-india-${j.job_id}`,
        title: j.job_title,
        company: j.employer_name,
        location: j.job_location || 'India',
        description: j.job_description || '',
        url: j.job_apply_link,
        pubDate: j.job_posted_at_datetime_utc,
        source: 'LinkedIn',
        type: j.job_employment_type || 'Full-time'
      }))
      .slice(0, 20);
  } catch (err) {
    return [];
  }
}

/**
 * Fetch from Dice.com - Tech jobs in India
 */
async function fetchFromDiceJobs() {
  try {
    const response = await fetch('https://dice.com/api/jobs?keyword=devops&location=India', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error('Dice API failed');
    
    const data = await response.json();
    const jobs = data.data || [];

    return jobs
      .filter(j => (j.location || '').includes('India'))
      .map(j => ({
        id: `dice-${j.id}`,
        title: j.title,
        company: j.company,
        location: j.location || 'India',
        description: j.description || '',
        url: j.url,
        pubDate: j.posted_date || new Date().toISOString(),
        source: 'Dice',
        type: 'Full-time'
      }))
      .slice(0, 15);
  } catch (err) {
    return [];
  }
}

export {
  fetchFromIndeedIndia,
  fetchFromGitHubJobs,
  fetchFromAngelListIndia,
  fetchFromStackOverflowJobs,
  fetchFromLinkedInIndiaJobs,
  fetchFromDiceJobs
};
