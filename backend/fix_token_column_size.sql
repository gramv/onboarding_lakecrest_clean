-- Fix the token column size to accommodate JWT tokens
-- JWT tokens can be 500+ characters long

ALTER TABLE step_invitations 
ALTER COLUMN token TYPE TEXT;

-- Add a comment explaining the change
COMMENT ON COLUMN step_invitations.token IS 'JWT token for accessing the invitation - stored as TEXT to accommodate variable length tokens';