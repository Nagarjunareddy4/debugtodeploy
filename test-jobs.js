/**
 * Quick Test Script for Job Scraping API
 * Run with: node test-jobs.js
 */

const API_URL = 'http://localhost:3001/api/jobs';

// Test data
const testRequest = {
  query: 'DevOps Engineer',
  keywords: ['kubernetes', 'aws', 'docker', 'devops']
};

async function testJobsAPI() {
  console.log('🔧 Testing Jobs API...\n');
  console.log('Request:', testRequest);
  console.log('Endpoint:', API_URL);
  console.log('');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ API Response Received!\n');
    console.log(`Total Jobs Found: ${data.count}`);
    console.log(`Region: ${data.region}`);
    console.log(`Cache Hit: ${data.cached ? 'Yes' : 'No'}\n`);

    if (data.jobs && data.jobs.length > 0) {
      console.log('📋 Top 5 Jobs:\n');
      data.jobs.slice(0, 5).forEach((job, index) => {
        console.log(`${index + 1}. ${job.title}`);
        console.log(`   Company: ${job.company}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   Source: ${job.source}`);
        console.log(`   Score: ${job.score}/100`);
        console.log(`   URL: ${job.url}`);
        console.log('');
      });

      console.log(`... and ${data.count - 5} more jobs available`);
    } else {
      console.log('⚠️  No jobs found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('1. Backend server is running (npm run backend)');
    console.error('2. Server is on http://localhost:3001');
    console.error('3. Node.js fetch API is available (Node 18+)');
    console.error('\nFor more details, see JOBS_IMPLEMENTATION.md');
  }
}

// Run test
testJobsAPI();
