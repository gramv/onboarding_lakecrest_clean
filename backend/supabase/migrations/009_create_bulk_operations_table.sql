-- Migration: Create bulk_operations table for tracking batch processes
-- Date: 2025-08-07
-- Description: Tracks bulk operations like mass approvals, batch communications, and bulk data updates

-- Create enum for bulk operation types
CREATE TYPE bulk_operation_type AS ENUM (
    'application_approval',
    'application_rejection', 
    'employee_onboarding',
    'employee_termination',
    'document_request',
    'notification_broadcast',
    'data_export',
    'data_import',
    'property_assignment',
    'role_change',
    'password_reset',
    'email_campaign',
    'compliance_check',
    'form_distribution'
);

-- Create enum for bulk operation status
CREATE TYPE bulk_operation_status AS ENUM (
    'pending',
    'queued',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'partial_success'
);

-- Create bulk_operations table
CREATE TABLE IF NOT EXISTS bulk_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Operation details
    operation_type bulk_operation_type NOT NULL,
    operation_name TEXT NOT NULL,
    description TEXT,
    
    -- User and scope
    initiated_by UUID NOT NULL REFERENCES users(id),
    property_id UUID REFERENCES properties(id), -- NULL for global operations
    
    -- Target entities
    target_entity_type TEXT NOT NULL, -- 'applications', 'employees', 'users', etc.
    target_count INTEGER NOT NULL DEFAULT 0,
    target_ids JSONB DEFAULT '[]'::jsonb, -- IDs of entities being processed (flexible type)
    
    -- Filters and criteria used
    filter_criteria JSONB DEFAULT '{}'::jsonb, -- Store the filters used to select targets
    
    -- Processing details
    status bulk_operation_status NOT NULL DEFAULT 'pending',
    total_items INTEGER NOT NULL DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    skipped_items INTEGER DEFAULT 0,
    
    -- Progress tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    estimated_completion_time TIMESTAMP WITH TIME ZONE,
    actual_completion_time TIMESTAMP WITH TIME ZONE,
    
    -- Processing results
    results JSONB DEFAULT '{}'::jsonb, -- Detailed results for each item
    error_log JSONB DEFAULT '[]'::jsonb, -- Array of errors encountered
    warning_log JSONB DEFAULT '[]'::jsonb, -- Array of warnings
    
    -- Operation configuration
    configuration JSONB DEFAULT '{}'::jsonb, -- Operation-specific settings
    retry_failed BOOLEAN DEFAULT false,
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    processing_time_ms INTEGER, -- Total processing time in milliseconds
    avg_item_time_ms INTEGER, -- Average time per item in milliseconds
    
    -- Cancellation
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit trail
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Rollback capability
    is_reversible BOOLEAN DEFAULT false,
    rollback_operation_id UUID REFERENCES bulk_operations(id),
    rolled_back BOOLEAN DEFAULT false,
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    rolled_back_by UUID REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX idx_bulk_operations_initiated_by ON bulk_operations(initiated_by);
CREATE INDEX idx_bulk_operations_property_id ON bulk_operations(property_id);
CREATE INDEX idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX idx_bulk_operations_operation_type ON bulk_operations(operation_type);
CREATE INDEX idx_bulk_operations_created_at ON bulk_operations(created_at DESC);
CREATE INDEX idx_bulk_operations_scheduled_at ON bulk_operations(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_bulk_operations_status_processing ON bulk_operations(status) WHERE status IN ('pending', 'queued', 'processing');

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bulk_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Update progress percentage
    IF NEW.total_items > 0 THEN
        NEW.progress_percentage = (NEW.processed_items::DECIMAL / NEW.total_items::DECIMAL) * 100;
    END IF;
    
    -- Set completion time when status changes to completed/failed/cancelled
    IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
        NEW.actual_completion_time = CURRENT_TIMESTAMP;
        
        -- Calculate processing time if started_at is set
        IF NEW.started_at IS NOT NULL THEN
            NEW.processing_time_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.started_at)) * 1000;
            
            -- Calculate average time per item
            IF NEW.processed_items > 0 THEN
                NEW.avg_item_time_ms = NEW.processing_time_ms / NEW.processed_items;
            END IF;
        END IF;
    END IF;
    
    -- Set started_at when status changes to processing
    IF NEW.status = 'processing' AND OLD.status != 'processing' THEN
        NEW.started_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bulk_operations_updated_at_trigger
    BEFORE UPDATE ON bulk_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_bulk_operations_updated_at();

-- Row Level Security (RLS)
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

-- Policy: HR users can view and create all bulk operations
CREATE POLICY bulk_operations_hr_full_access ON bulk_operations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()::uuid
            AND role = 'hr'
        )
    );

-- Policy: Managers can view and create bulk operations for their properties
CREATE POLICY bulk_operations_manager_property_access ON bulk_operations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON pm.manager_id = u.id
            WHERE u.id = auth.uid()::uuid
            AND u.role = 'manager'
            AND (pm.property_id = bulk_operations.property_id OR bulk_operations.property_id IS NULL)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON pm.manager_id = u.id
            WHERE u.id = auth.uid()::uuid
            AND u.role = 'manager'
            AND pm.property_id = bulk_operations.property_id
        )
    );

-- Create a table for bulk operation items (individual records within a bulk operation)
CREATE TABLE IF NOT EXISTS bulk_operation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bulk_operation_id UUID NOT NULL REFERENCES bulk_operations(id) ON DELETE CASCADE,
    
    -- Item details
    target_id TEXT NOT NULL, -- ID of the entity being processed (flexible type)
    target_type TEXT NOT NULL, -- Type of entity
    
    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed', 'skipped'
    
    -- Processing details
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER,
    
    -- Results
    result JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bulk operation items
CREATE INDEX idx_bulk_operation_items_bulk_operation_id ON bulk_operation_items(bulk_operation_id);
CREATE INDEX idx_bulk_operation_items_target_id ON bulk_operation_items(target_id);
CREATE INDEX idx_bulk_operation_items_status ON bulk_operation_items(status);

-- Add comments for documentation
COMMENT ON TABLE bulk_operations IS 'Tracks bulk operations like mass approvals, batch communications, and bulk data updates';
COMMENT ON COLUMN bulk_operations.filter_criteria IS 'JSON object containing the filters used to select target entities';
COMMENT ON COLUMN bulk_operations.results IS 'Detailed results for each processed item including success/failure details';
COMMENT ON COLUMN bulk_operations.configuration IS 'Operation-specific settings like email templates, approval criteria, etc.';
COMMENT ON TABLE bulk_operation_items IS 'Individual items processed within a bulk operation for detailed tracking';