#!/usr/bin/env node

/**
 * Daily Quiz Generation Scheduler
 * Run this via cron job to generate new quiz questions daily
 * 
 * Example cron entry:
 * 0 0 * * * node scripts/generate-daily-quiz.js
 */

require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function generateDailyQuiz() {
  try {
    console.log(`[${new Date().toISOString()}] Starting daily quiz generation...`);

    const response = await fetch(`${API_URL}/api/quiz/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_API_KEY || ''}`,
      },
      body: JSON.stringify({
        action: 'ensure-daily-pool'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Daily quiz generated successfully:`, data);
      console.log(`   Generated: ${data.generated || 0} questions`);
      console.log(`   Attempts: ${data.attempts || 0}`);
      process.exit(0);
    } else {
      console.error(`❌ Failed to generate daily quiz:`, data.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error generating daily quiz:', error.message);
    process.exit(1);
  }
}

generateDailyQuiz();
