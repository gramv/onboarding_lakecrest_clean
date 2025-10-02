#!/usr/bin/env python3
"""
Execute step_invitations table migration
Creates the step_invitations table for HR to send individual onboarding steps via email
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
env_path = Path(__file__).parent / '.env.test'
load_dotenv(env_path)

# Database connection details
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env.test")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Schema update query
STEP_INVITATIONS_TABLE = """
-- Create step_invitations table for HR to send individual onboarding steps via email
CREATE TABLE IF NOT EXISTS step_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    step_id VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    employee_id UUID,
    sent_by UUID NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    token VARCHAR(255) NOT NULL,
    property_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    session_id UUID,
    FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);
"""

INDEXES = """
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON step_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON step_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_property ON step_invitations(property_id);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient_email ON step_invitations(recipient_email);
CREATE INDEX IF NOT EXISTS idx_invitations_employee ON step_invitations(employee_id);
CREATE INDEX IF NOT EXISTS idx_invitations_sent_at ON step_invitations(sent_at);
"""

def main():
    """Execute the step_invitations table migration"""
    
    print("🚀 Starting step_invitations table migration...")
    
    try:
        # Create the table
        print("📊 Creating step_invitations table...")
        result = supabase.rpc('exec', {'sql': STEP_INVITATIONS_TABLE}).execute()
        print("✅ step_invitations table created successfully")
        
        # Create indexes
        print("📈 Creating indexes...")
        result = supabase.rpc('exec', {'sql': INDEXES}).execute()
        print("✅ Indexes created successfully")
        
        print("🎉 Migration completed successfully!")
        
        # Verify table was created
        verify_result = supabase.rpc('exec', {
            'sql': "SELECT table_name FROM information_schema.tables WHERE table_name = 'step_invitations';"
        }).execute()
        
        if verify_result.data:
            print("✅ Table verification successful - step_invitations table exists")
        else:
            print("⚠️  Warning: Could not verify table creation")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()