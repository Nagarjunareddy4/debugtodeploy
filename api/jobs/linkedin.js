/**
 * LinkedIn Job Scraping Module
 * Uses LinkedIn Jobs API alternatives and web scraping techniques
 */

/**
 * Fetch jobs from LinkedIn via JSearch API (RapidAPI alternative)
 * Note: Uses free alternative APIs for job data similar to LinkedIn listings
 */
async function fetchFromLinkedInAlternative() {
  try {
    // Using JSearch API from RapidAPI - searches across multiple job boards including LinkedIn data
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    };

    if (!process.env.RAPIDAPI_KEY) {
      console.log('[LinkedIn] RapidAPI key not configured, using fallback');
      return await fetchLinkedInFallback();
    }

    const response = await fetch(
      'https://jsearch.p.rapidapi.com/search?query=DevOps%20Engineer%20India&page=1&num_pages=1',
      options
    );

    if (!response.ok) throw new Error('JSearch API failed');
    
    const data = await response.json();
    const jobs = data.data || [];

    return jobs
      .filter(j => {
        const locLower = (j.job_location || '').toLowerCase();
        return locLower.includes('india') || locLower.includes('remote') || j.job_country === 'IN';
      })
      .map(j => ({
        id: `linkedin-${j.job_id}`,
        title: j.job_title,
        company: j.employer_name,
        location: j.job_location || 'Remote',
        description: j.job_description || '',
        url: j.job_apply_link || j.job_link,
        pubDate: j.job_posted_at_datetime_utc,
        source: 'LinkedIn',
        type: j.job_employment_type || 'Full-time'
      }))
      .slice(0, 25);
  } catch (err) {
    console.error('[LinkedIn] JSearch fetch error:', err.message);
    return await fetchLinkedInFallback();
  }
}

/**
 * Fallback: Use Arbeitnow which aggregates LinkedIn jobs
 */
async function fetchLinkedInFallback() {
  try {
    const response = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error('Fallback fetch failed');
    const data = await response.json();
    const jobs = data.data || [];

    return jobs
      .filter(j => {
        const locLower = (j.location || '').toLowerCase();
        const titleLower = j.title.toLowerCase();
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
        id: `linkedin-${j.slug}`,
        title: j.title,
        company: j.company_name,
        location: j.location || 'Remote (India)',
        description: j.description || '',
        url: j.url,
        pubDate: j.created_at,
        source: 'LinkedIn',
        type: j.job_types?.[0] || 'Full-time'
      }))
      .slice(0, 25);
  } catch (err) {
    console.error('[LinkedIn] Fallback fetch error:', err.message);
    return [];
  }
}

export { fetchFromLinkedInAlternative, fetchLinkedInFallback };
