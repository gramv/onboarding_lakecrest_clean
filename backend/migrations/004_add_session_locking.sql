-- Migration: Add Session Locking System
-- Created: 2025-09-13
-- Purpose: Implement optimistic locking and session management for concurrent user protection

-- 1. Create session_locks table for managing concurrent access
CREATE TABLE IF NOT EXISTS session_locks (
    session_id UUID PRIMARY KEY REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
    locked_by UUID NOT NULL REFERENCES users(id),
    locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    lock_type VARCHAR(10) NOT NULL CHECK (lock_type IN ('read', 'write')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    lock_token UUID NOT NULL DEFAULT gen_random_uuid(),
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    browser_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Add version column to onboarding_sessions for optimistic locking
ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 3. Add last_modified_by to track who made changes
ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id);

-- 4. Add conflict_resolution columns
ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS has_conflicts BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conflict_data JSONB;

-- 5. Create session_lock_history for audit trail
CREATE TABLE IF NOT EXISTS session_lock_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('acquired', 'released', 'expired', 'forced_release', 'conflict')),
    lock_type VARCHAR(10),
    lock_token UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_locks_session_id ON session_locks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_locks_locked_by ON session_locks(locked_by);
CREATE INDEX IF NOT EXISTS idx_session_locks_expires_at ON session_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_lock_history_session_id ON session_lock_history(session_id);
CREATE INDEX IF NOT EXISTS idx_session_lock_history_user_id ON session_lock_history(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_version ON onboarding_sessions(version);

-- 7. Function to auto-expire locks
CREATE OR REPLACE FUNCTION expire_session_locks()
RETURNS void AS $$
BEGIN
    -- Move expired locks to history
    INSERT INTO session_lock_history (session_id, user_id, action, lock_type, lock_token, metadata)
    SELECT 
        session_id, 
        locked_by, 
        'expired', 
        lock_type, 
        lock_token,
        jsonb_build_object(
            'expired_at', NOW(),
            'lock_duration_seconds', EXTRACT(EPOCH FROM (NOW() - locked_at))
        )
    FROM session_locks
    WHERE expires_at < NOW();
    
    -- Delete expired locks
    DELETE FROM session_locks
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. Function to check for lock conflicts
CREATE OR REPLACE FUNCTION check_lock_conflict(
    p_session_id UUID,
    p_user_id UUID,
    p_lock_token UUID DEFAULT NULL
)
RETURNS TABLE(
    has_conflict BOOLEAN,
    current_lock_holder UUID,
    lock_type VARCHAR,
    locked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN sl.session_id IS NULL THEN FALSE
            WHEN sl.locked_by = p_user_id AND (p_lock_token IS NULL OR sl.lock_token = p_lock_token) THEN FALSE
            ELSE TRUE
        END as has_conflict,
        sl.locked_by as current_lock_holder,
        sl.lock_type::VARCHAR,
        sl.locked_at
    FROM session_locks sl
    WHERE sl.session_id = p_session_id
    AND sl.expires_at > NOW();
    
    -- If no lock found, return no conflict
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID, NULL::VARCHAR, NULL::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Function for optimistic locking check
CREATE OR REPLACE FUNCTION update_session_with_version_check(
    p_session_id UUID,
    p_expected_version INTEGER,
    p_data JSONB,
    p_user_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    new_version INTEGER,
    conflict_detected BOOLEAN
) AS $$
DECLARE
    v_updated_count INTEGER;
    v_new_version INTEGER;
BEGIN
    -- Attempt to update with version check
    UPDATE onboarding_sessions
    SET 
        progress_data = p_data,
        version = version + 1,
        last_modified_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_session_id
    AND version = p_expected_version;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        -- Get the new version
        SELECT version INTO v_new_version
        FROM onboarding_sessions
        WHERE id = p_session_id;
        
        RETURN QUERY SELECT TRUE, v_new_version, FALSE;
    ELSE
        -- Version conflict detected
        -- Store conflict information
        UPDATE onboarding_sessions
        SET 
            has_conflicts = TRUE,
            conflict_data = jsonb_build_object(
                'attempted_by', p_user_id,
                'attempted_at', NOW(),
                'expected_version', p_expected_version,
                'attempted_data', p_data
            )
        WHERE id = p_session_id;
        
        -- Get current version
        SELECT version INTO v_new_version
        FROM onboarding_sessions
        WHERE id = p_session_id;
        
        RETURN QUERY SELECT FALSE, v_new_version, TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_session_locks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_locks_timestamp
BEFORE UPDATE ON session_locks
FOR EACH ROW EXECUTE FUNCTION update_session_locks_timestamp();

-- 11. Row Level Security policies
ALTER TABLE session_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_lock_history ENABLE ROW LEVEL SECURITY;

-- Allow users to see locks for sessions they have access to
CREATE POLICY session_locks_view_policy ON session_locks
    FOR SELECT USING (
        locked_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM onboarding_sessions os
            WHERE os.id = session_locks.session_id
            AND (os.employee_id = auth.uid() OR os.manager_id = auth.uid())
        )
    );

-- Allow users to manage their own locks
CREATE POLICY session_locks_manage_policy ON session_locks
    FOR ALL USING (locked_by = auth.uid());

-- Allow viewing lock history for sessions user has access to
CREATE POLICY session_lock_history_view_policy ON session_lock_history
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM onboarding_sessions os
            WHERE os.id = session_lock_history.session_id
            AND (os.employee_id = auth.uid() OR os.manager_id = auth.uid())
        )
    );

-- 12. Create scheduled job to expire locks (if using pg_cron)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('expire-session-locks', '*/1 * * * *', 'SELECT expire_session_locks();');

-- Grant necessary permissions
GRANT ALL ON session_locks TO authenticated;
GRANT ALL ON session_lock_history TO authenticated;
GRANT EXECUTE ON FUNCTION check_lock_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_with_version_check TO authenticated;
GRANT EXECUTE ON FUNCTION expire_session_locks TO authenticated;