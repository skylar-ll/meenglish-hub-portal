-- Add date_of_birth column to billing table to store DOB from registration
ALTER TABLE public.billing 
ADD COLUMN IF NOT EXISTS date_of_birth DATE;