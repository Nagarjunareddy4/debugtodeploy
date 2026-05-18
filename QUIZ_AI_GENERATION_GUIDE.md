# AI-Generated Daily DevOps Quiz Implementation

## Overview

The Daily DevOps Quiz feature has been upgraded to use **AI-generated questions** instead of predefined ones. This ensures:

✅ **Unique Questions Daily** - Each day gets 5 fresh, randomly generated questions  
✅ **No Duplicates** - Smart hash-based deduplication system  
✅ **Scalable** - AI generates unlimited question variations  
✅ **Engaging** - GPT-4 creates contextual, practical DevOps scenarios  
✅ **Categorized** - 10 DevOps categories with proper difficulty levels  

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Daily DevOps Quiz Flow                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User visits Dashboard                                       │
│         ↓                                                    │
│  getDailyQuestions() called                                 │
│         ↓                                                    │
│  getTodaysQuizQuestions() fetches from DB                   │
│         ↓                                                    │
│  If no pool for today → generateDailyQuizPool()             │
│         ↓                                                    │
│  For each question needed:                                   │
│    1. generateRandomQuestion() → OpenAI API                 │
│    2. isDuplicateQuestion() → Check hash in DB              │
│    3. saveGeneratedQuestion() → Store if unique             │
│         ↓                                                    │
│  dailyQuizPool table updated with question IDs              │
│         ↓                                                    │
│  User answers 5 questions via FlipCard UI                   │
│         ↓                                                    │
│  XP earned → profiles table updated                         │
│         ↓                                                    │
│  Leaderboard reflects new XP immediately                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### generated_quiz_questions
Stores AI-generated questions with duplicate prevention:
```sql
- id: UUID (Primary Key)
- category: VARCHAR (e.g., 'Kubernetes', 'CI/CD', 'Docker')
- difficulty: VARCHAR ('beginner', 'intermediate', 'advanced')
- question_text: TEXT (Full question)
- options: JSONB (Array of 4 options)
- correct_answer_index: INTEGER (0-3)
- explanation: TEXT (Why answer is correct)
- wrong_explanation: TEXT (Why wrong)
- xp_reward: INTEGER (10-15)
- question_hash: VARCHAR UNIQUE (SHA-256 for deduplication)
- generated_at: TIMESTAMP
- used_count: INTEGER (Track usage)
- is_active: BOOLEAN (Soft delete)
```

### daily_quiz_pool
Ensures same 5 questions for all users on a given day:
```sql
- id: UUID
- quiz_date: DATE UNIQUE
- question_ids: UUID[] (Array of 5 question IDs)
- created_at: TIMESTAMP
- is_used: BOOLEAN
```

### question_generation_log
Tracks AI generation attempts for monitoring:
```sql
- id: UUID
- category, difficulty: For categorizing attempts
- prompt_hash: Track which prompts generated duplicates
- generated_question_id: Reference to saved question
- attempt_count: How many retries needed
- is_duplicate: Was this a duplicate?
- error_message: If generation failed
```

## Question Generation Flow

### 1. Trigger
- First user accessing quiz on a given day
- OR manual trigger via API: `POST /api/quiz/generate`
- OR via cron job: `0 0 * * * node scripts/generate-daily-quiz.js`

### 2. AI Generation
Each question goes through:
```
generateRandomQuestion()
  ↓
Pick random category (10 available)
  ↓
Pick random difficulty (beginner/intermediate/advanced)
  ↓
Call OpenAI GPT-4 with structured prompt
  ↓
Parse response as JSON
  ↓
Validate structure (4 options, correct index, explanations)
  ↓
Return GeneratedQuizQuestion object
```

### 3. Deduplication
```
calculateQuestionHash(question_text)
  ↓
Normalize text (lowercase, trim, remove special chars)
  ↓
Generate SHA-256 hash (browser-compatible)
  ↓
isDuplicateQuestion() checks if hash exists in DB
  ↓
If duplicate → skip, retry
  ↓
If unique → saveGeneratedQuestion() to DB
```

### 4. Daily Pool
```
getTodaysQuizQuestions()
  ↓
Check if daily_quiz_pool has entry for today
  ↓
If yes → return 5 question IDs
  ↓
If no → generateDailyQuizPool():
    - Loop up to 15 times
    - Generate & save unique questions
    - Collect 5 unique IDs
    - Insert into daily_quiz_pool
```

## Setup Instructions

### 1. Run Database Migration

```sql
-- Execute in Supabase SQL console
-- File: supabase_quiz_ai_generation.sql

CREATE TABLE IF NOT EXISTS generated_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  wrong_explanation TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 10,
  question_hash VARCHAR(64) UNIQUE NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_category_difficulty (category, difficulty),
  INDEX idx_active_questions (is_active, generated_at),
  INDEX idx_question_hash (question_hash)
);

-- ... (see full migration file for daily_quiz_pool and question_generation_log)
```

### 2. Environment Variables

Add to `.env`:
```bash
# Already configured from existing OpenAI setup
OPENAI_API_KEY=sk-...
```

### 3. Test Generation

Visit Dashboard → scroll to "Daily DevOps Quiz" → questions load automatically on first visit.

OR manually trigger via:
```bash
# Node.js script
node scripts/generate-daily-quiz.js

# Or via API
curl -X POST http://localhost:3001/api/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{"action":"ensure-daily-pool"}'
```

## Question Categories (10 Total)

1. **Kubernetes** - Container orchestration
2. **CI/CD** - Build/deploy automation
3. **Docker** - Containerization
4. **Monitoring** - Observability & metrics
5. **Security** - DevOps security practices
6. **AWS** - Cloud infrastructure
7. **Linux** - System administration
8. **Terraform** - Infrastructure as Code
9. **Networking** - DevOps networking
10. **DevOps Tools** - General DevOps tooling

## Difficulty Levels

- **Beginner** (10 XP) - Foundational concepts
- **Intermediate** (15 XP) - Practical knowledge
- **Advanced** (15 XP) - Expert-level scenarios

**Daily Max XP**: 50-70 (varies by difficulty mix)

## Fallback System

If AI generation fails for any reason:
- System falls back to **5 hardcoded questions** stored in `src/lib/quizData.ts`
- These serve as emergency backup only
- User experience remains seamless
- Logging tracks all failures for monitoring

## Duplicate Prevention

Smart multi-layer duplicate detection:

1. **Hash-based** - Question text normalized & SHA-256 hashed
2. **Database Unique** - `question_hash` column has UNIQUE constraint
3. **Pre-save Check** - `isDuplicateQuestion()` called before insert
4. **Retry Logic** - Attempts up to 15 times to get 5 unique questions

## API Endpoints

### POST /api/quiz/generate

**Generate or ensure daily quiz pool**

```bash
curl -X POST http://localhost:3001/api/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{"action":"ensure-daily-pool"}'
```

Response:
```json
{
  "success": true,
  "count": 5,
  "message": "Daily quiz pool ready",
  "generated": 3,
  "attempts": 8
}
```

**Generate single question for testing**

```bash
curl -X POST http://localhost:3001/api/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{"action":"generate-single"}'
```

## Monitoring & Analytics

Track question performance:

```sql
-- Most used questions
SELECT question_text, used_count, category, difficulty
FROM generated_quiz_questions
ORDER BY used_count DESC
LIMIT 10;

-- Questions by category
SELECT category, COUNT(*) as total, 
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active
FROM generated_quiz_questions
GROUP BY category;

-- Generation success rate
SELECT 
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN generated_question_id IS NOT NULL THEN 1 END) as successful,
  SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) as duplicates
FROM question_generation_log;
```

## Performance Considerations

- **First Load**: ~3-5 seconds (AI generation + DB save)
- **Cached Loads**: <100ms (DB lookup only)
- **Daily Limit**: 1 generation per day per user
- **Concurrency**: Safe for multiple simultaneous quiz starts

## Costs

- **AI Generation**: ~$0.01-0.05 per 5 questions (GPT-4 mini)
- **Database**: Negligible (small JSON storage)
- **Monthly**: ~$0.30-0.50 for typical user base

## Future Enhancements

1. **Question Difficulty Adaptation** - Adjust based on user performance
2. **Phased Generation** - Pre-generate tomorrow's questions in advance
3. **Custom Question Prompts** - Allow admins to define question themes
4. **Analytics Dashboard** - Track question effectiveness & user performance
5. **A/B Testing** - Test different question formats
6. **Caching** - Cache questions for 24 hours before re-generation

## Troubleshooting

### Questions not loading
```
Check browser console for errors:
- OpenAI API key valid?
- Database tables created?
- Supabase RLS policies correct?
```

### Duplicate questions appearing
```
Run deduplication check:
SELECT question_hash, COUNT(*) as count
FROM generated_quiz_questions
GROUP BY question_hash
HAVING COUNT(*) > 1;
```

### Generation timeout
```
Increase timeout in api/quiz/generate.js
Or manually trigger generation:
node scripts/generate-daily-quiz.js
```

## Files Modified

- `src/lib/quizData.ts` - Updated to fetch from DB
- `src/lib/quizGeneration.ts` - NEW: AI generation logic
- `src/components/lab/DailyQuiz.tsx` - Updated to handle async loading
- `src/pages/Dashboard.tsx` - Updated UI text
- `api/quiz/generate.js` - NEW: Generation endpoint
- `scripts/generate-daily-quiz.js` - NEW: Cron job script
- `supabase_quiz_ai_generation.sql` - NEW: Database schema

## Support

For issues or questions:
1. Check logs in `question_generation_log` table
2. Verify OpenAI API key is set
3. Check RLS policies are correct
4. Ensure database migration ran successfully
