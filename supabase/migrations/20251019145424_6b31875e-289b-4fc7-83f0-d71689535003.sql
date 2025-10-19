-- Add price field to form_configurations table
ALTER TABLE public.form_configurations 
ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0;