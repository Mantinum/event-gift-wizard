-- Fix security issue: Make user_id NOT NULL in persons table
-- This ensures all person records are always associated with a user
-- and the RLS policies can properly protect the data

-- First, delete any orphaned records without a user_id (if any exist)
DELETE FROM public.persons WHERE user_id IS NULL;

-- Then, make user_id NOT NULL
ALTER TABLE public.persons 
ALTER COLUMN user_id SET NOT NULL;

-- Add a comment to document this security fix
COMMENT ON COLUMN public.persons.user_id IS 'Required user association for RLS protection. Must never be NULL.';