-- Create password_reset_tokens table for secure password reset functionality
-- This table stores temporary tokens for password reset requests
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at) WHERE used = false;

-- Add trigger to automatically clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR used = true 
    OR created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Add rate limiting tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_reset_request TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_request_count INTEGER DEFAULT 0;

-- Function to check rate limiting (max 3 requests per hour)
CREATE OR REPLACE FUNCTION check_password_reset_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_last_request TIMESTAMP WITH TIME ZONE;
    v_request_count INTEGER;
BEGIN
    SELECT last_password_reset_request, password_reset_request_count
    INTO v_last_request, v_request_count
    FROM users
    WHERE id = p_user_id;
    
    -- Reset count if last request was more than an hour ago
    IF v_last_request IS NULL OR v_last_request < CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN
        UPDATE users 
        SET password_reset_request_count = 1, 
            last_password_reset_request = CURRENT_TIMESTAMP
        WHERE id = p_user_id;
        RETURN true;
    END IF;
    
    -- Check if within rate limit
    IF v_request_count < 3 THEN
        UPDATE users 
        SET password_reset_request_count = v_request_count + 1,
            last_password_reset_request = CURRENT_TIMESTAMP
        WHERE id = p_user_id;
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Add password history tracking for security
CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);

-- Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores temporary tokens for password reset requests';
COMMENT ON COLUMN password_reset_tokens.token IS 'Unique token sent to user via email';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (typically 1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Whether this token has been used';
COMMENT ON TABLE password_history IS 'Tracks password change history for security auditing';