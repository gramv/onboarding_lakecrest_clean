-- Fix RLS policies for property_managers table

-- First, let's check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS public.property_managers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(manager_id, property_id)
);

-- Enable RLS
ALTER TABLE public.property_managers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "HR can manage all property manager assignments" ON public.property_managers;
DROP POLICY IF EXISTS "Managers can view their own assignments" ON public.property_managers;
DROP POLICY IF EXISTS "Allow anonymous inserts for testing" ON public.property_managers;

-- Create comprehensive RLS policies
CREATE POLICY "HR can manage all property manager assignments" ON public.property_managers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'hr'
        )
    );

CREATE POLICY "Managers can view their own assignments" ON public.property_managers
    FOR SELECT USING (
        manager_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'hr'
        )
    );

-- Temporary policy to allow anonymous operations (for testing)
CREATE POLICY "Allow anonymous operations for testing" ON public.property_managers
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.property_managers TO authenticated;
GRANT ALL ON public.property_managers TO service_role;
GRANT ALL ON public.property_managers TO anon;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_managers_manager_id ON public.property_managers(manager_id);
CREATE INDEX IF NOT EXISTS idx_property_managers_property_id ON public.property_managers(property_id);
CREATE INDEX IF NOT EXISTS idx_property_managers_active ON public.property_managers(is_active);