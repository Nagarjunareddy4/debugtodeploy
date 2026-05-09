-- Migration to add a function to check recovery link expiration
-- This allows the frontend to enforce a custom 30-minute expiration limit.

CREATE OR REPLACE FUNCTION get_recovery_info()
RETURNS TABLE (recovery_sent_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY 
  SELECT auth.users.recovery_sent_at 
  FROM auth.users 
  WHERE auth.users.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_recovery_info TO authenticated;
