-- Generated Quiz Questions Table
-- Stores AI-generated questions with duplicate prevention
CREATE TABLE IF NOT EXISTS generated_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) NOT NULL, -- 'beginner', 'intermediate', 'advanced'
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of 4 options
  correct_answer_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  wrong_explanation TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 10,
  
  -- Hash for duplicate detection
  question_hash VARCHAR(64) UNIQUE NOT NULL,
  
  -- Tracking
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
);

-- Indexes for fast queries
CREATE INDEX idx_category_difficulty ON generated_quiz_questions (category, difficulty);
CREATE INDEX idx_active_questions ON generated_quiz_questions (is_active, generated_at);
CREATE INDEX idx_question_hash ON generated_quiz_questions (question_hash);

-- Daily Quiz Pool Table
-- Maps which questions to use each day
CREATE TABLE IF NOT EXISTS daily_quiz_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date DATE NOT NULL UNIQUE,
  question_ids UUID[] NOT NULL, -- Array of 5 question IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_used BOOLEAN DEFAULT FALSE,
  
);

-- Index for fast date lookups
CREATE INDEX idx_quiz_date ON daily_quiz_pool (quiz_date);

-- Question Generation History
-- Tracks AI generation attempts to avoid regenerating failed prompts
CREATE TABLE IF NOT EXISTS question_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  prompt_hash VARCHAR(64) NOT NULL,
  generated_question_id UUID REFERENCES generated_quiz_questions(id),
  attempt_count INTEGER DEFAULT 1,
  is_duplicate BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_category_difficulty_date ON question_generation_log (category, difficulty, created_at);
CREATE INDEX idx_prompt_hash ON question_generation_log (prompt_hash);

-- Enable RLS
ALTER TABLE generated_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quiz_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_generation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_quiz_questions (public read-only for quiz functionality)
CREATE POLICY "Public can read active quiz questions" ON generated_quiz_questions
FOR SELECT USING (is_active = TRUE);

-- RLS Policies for daily_quiz_pool (public read-only)
CREATE POLICY "Public can read quiz pools" ON daily_quiz_pool
FOR SELECT USING (TRUE);

-- RLS Policies for generation log (server-only)
CREATE POLICY "Only server can access generation logs" ON question_generation_log
FOR ALL USING (FALSE) WITH CHECK (FALSE);

-- Create function to calculate question hash (prevents duplicates)
CREATE OR REPLACE FUNCTION calculate_question_hash(question_text TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(
    digest(
      LOWER(TRIM(REGEXP_REPLACE(question_text, '\s+', ' '))),
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate hash on insert
CREATE OR REPLACE FUNCTION set_question_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.question_hash := calculate_question_hash(NEW.question_text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER question_hash_trigger
BEFORE INSERT OR UPDATE ON generated_quiz_questions
FOR EACH ROW
EXECUTE FUNCTION set_question_hash();
