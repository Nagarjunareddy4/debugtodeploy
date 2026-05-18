/**
 * Glassdoor Job Scraping Module
 * Uses public APIs and web scraping to fetch Glassdoor job listings
 */

/**
 * Fetch jobs from Glassdoor via API alternatives
 * Uses publicly available job aggregator APIs that include Glassdoor data
 */
async function fetchFromGlassdoorAlternative() {
  try {
    // Use Rapid API's Glassdoor job search if available
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'glassdoor.p.rapidapi.com'
      }
    };

    if (!process.env.RAPIDAPI_KEY) {
      return await fetchGlassdoorFallback();
    }

    const response = await fetch(
      'https://glassdoor.p.rapidapi.com/search?keyword=DevOps%20Engineer&location=India&page=1',
      options
    );

    if (!response.ok) throw new Error('Glassdoor API failed');
    
    const data = await response.json();
    const jobs = data.data || data.jobs || [];

    return jobs
      .filter(j => {
        const locLower = (j.location || '').toLowerCase();
        return locLower.includes('india') || locLower.includes('remote');
      })
      .map(j => ({
        id: `glassdoor-${j.job_id || j.id}`,
        title: j.job_title || j.title,
        company: j.employer_name || j.company,
        location: j.job_location || j.location || 'Remote',
        description: j.job_description || j.description || '',
        url: j.job_link || j.url,
        pubDate: j.posted_date || new Date().toISOString(),
        source: 'Glassdoor',
        type: j.job_type || 'Full-time',
        salary: j.salary_range || j.salary
      }))
      .slice(0, 25);
  } catch (err) {
    return await fetchGlassdoorFallback();
  }
}

/**
 * Fallback: Use RemoteOK and other aggregators that show Glassdoor listings
 */
async function fetchGlassdoorFallback() {
  try {
    // RemoteOK includes Glassdoor job listings
    const response = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error('RemoteOK fetch failed');
    const data = await response.json();
    const jobs = Array.isArray(data) ? data.slice(1) : [];

    return jobs
      .filter(j => {
        const locLower = (j.location || '').toLowerCase();
        const titleLower = (j.position || '').toLowerCase();
        const descLower = (j.description || '').toLowerCase();
        
        const isIndia = locLower.includes('india') || locLower.includes('bangalore') || 
                       locLower.includes('delhi') || locLower.includes('mumbai') ||
                       locLower.includes('pune') || locLower.includes('hyderabad') ||
                       locLower.includes('remote');
        
        const isDevOps = titleLower.includes('devops') || titleLower.includes('sre') ||
                        titleLower.includes('cloud') || titleLower.includes('kubernetes') ||
                        descLower.includes('devops') || descLower.includes('kubernetes');
        
        return isIndia && isDevOps;
      })
      .map(j => ({
        id: `glassdoor-${j.id || Math.random()}`,
        title: j.position,
        company: j.company,
        location: j.location || 'Remote (India)',
        description: j.description || '',
        url: j.url,
        pubDate: j.date,
        source: 'Glassdoor',
        type: 'Full-time',
        slug: j.slug
      }))
      .slice(0, 25);
  } catch (err) {
    return [];
  }
}

/**
 * Additional fallback using Indeed data (which includes Glassdoor-sourced listings)
 */
async function fetchFromIndeedAggregator() {
  try {
    // Using JSearch which includes Indeed, Glassdoor, and LinkedIn data
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    };

    const response = await fetch(
      'https://jsearch.p.rapidapi.com/search?query=DevOps%20Engineer%20Glassdoor%20India&page=1&num_pages=1',
      options
    );

    if (!response.ok) throw new Error('Indeed aggregator failed');
    
    const data = await response.json();
    const jobs = data.data || [];

    return jobs
      .filter(j => {
        const locLower = (j.job_location || '').toLowerCase();
        return locLower.includes('india') || locLower.includes('remote');
      })
      .map(j => ({
        id: `glassdoor-indeed-${j.job_id}`,
        title: j.job_title,
        company: j.employer_name,
        location: j.job_location || 'Remote',
        description: j.job_description || '',
        url: j.job_apply_link || j.job_link,
        pubDate: j.job_posted_at_datetime_utc,
        source: 'Glassdoor',
        type: j.job_employment_type || 'Full-time'
      }))
      .slice(0, 15);
  } catch (err) {
    return [];
  }
}

export { fetchFromGlassdoorAlternative, fetchGlassdoorFallback, fetchFromIndeedAggregator };
