-- Add missing user_agent column to session_locks table
ALTER TABLE public.session_locks 
ADD COLUMN IF NOT EXISTS user_agent TEXT;