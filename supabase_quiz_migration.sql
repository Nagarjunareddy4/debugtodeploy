-- Quiz Completions Table
-- Tracks daily quiz attempts and results
CREATE TABLE IF NOT EXISTS quiz_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  questions_answered INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL,
  answers JSONB NOT NULL, -- Array of {questionId, selectedIndex, isCorrect}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one completion per user per day
  UNIQUE(user_id, completion_date)
);

-- Index for fast queries
CREATE INDEX idx_quiz_user_date ON quiz_completions (user_id, completion_date);
CREATE INDEX idx_quiz_xp ON quiz_completions (user_id, xp_earned);

-- Quiz Notifications Table
-- Tracks when new quizzes are available
CREATE TABLE IF NOT EXISTS quiz_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_date DATE NOT NULL,
  notification_sent_at TIMESTAMP,
  was_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one notification per user per quiz date
  UNIQUE(user_id, quiz_date)
);

-- Index for notifications
CREATE INDEX idx_notifications_user ON quiz_notifications (user_id);
CREATE INDEX idx_notifications_unread ON quiz_notifications (user_id, was_read);

-- Update profiles table to track quiz streak
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quiz_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_quiz_date DATE,
ADD COLUMN IF NOT EXISTS total_quiz_xp INTEGER DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE quiz_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_completions
CREATE POLICY "Users can view own quiz completions" ON quiz_completions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz completions" ON quiz_completions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quiz_notifications
CREATE POLICY "Users can view own quiz notifications" ON quiz_notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz notifications" ON quiz_notifications
FOR UPDATE USING (auth.uid() = user_id);
