-- ─────────────────────────────────────────────────────────
-- Notifications System
-- In-app, real-time notifications (lab completions, streaks,
-- pro upgrades, job matches, system alerts).
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 'lab_completed' | 'streak' | 'pro_upgrade' | 'job_match' | 'interview_graded'
  -- | 'achievement' | 'system' | 'quiz_available'
  type TEXT NOT NULL,

  title TEXT NOT NULL,
  body TEXT,

  -- Where clicking the notification should navigate the user, e.g. /labs/3
  link TEXT,

  -- Optional structured payload (xp gained, lab id, etc) for richer rendering
  metadata JSONB DEFAULT '{}'::jsonb,

  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read) WHERE is_read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON notifications
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime so the client can subscribe to INSERTs live
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─────────────────────────────────────────────────────────
-- Secure RPC: create a notification for a user.
-- Used by server-side flows (edge functions, triggers) where
-- you don't want to rely solely on client-side inserts.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id UUID,
  notif_type TEXT,
  notif_title TEXT,
  notif_body TEXT DEFAULT NULL,
  notif_link TEXT DEFAULT NULL,
  notif_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  VALUES (target_user_id, notif_type, notif_title, notif_body, notif_link, notif_metadata)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- Auto-notify on lab completion (fires from complete_lab_securely
-- if you wire it in, or call create_notification directly from
-- the client immediately after a successful completion).
-- Kept as a callable RPC rather than a blind trigger so copy
-- stays controllable from the app layer.
-- ─────────────────────────────────────────────────────────

-- Housekeeping: auto-delete read notifications older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = TRUE AND read_at < NOW() - INTERVAL '30 days';
END;
$$;
