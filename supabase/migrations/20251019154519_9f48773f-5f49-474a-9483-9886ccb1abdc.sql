-- Add payment tracking columns to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS total_course_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_remaining NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;

-- Add payment tracking columns to profiles table for sync
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_course_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_remaining NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;

-- Create a table for course pricing
CREATE TABLE IF NOT EXISTS public.course_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_months INTEGER NOT NULL UNIQUE,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on course_pricing
ALTER TABLE public.course_pricing ENABLE ROW LEVEL SECURITY;

-- Anyone can view pricing
CREATE POLICY "Anyone can view course pricing"
ON public.course_pricing
FOR SELECT
USING (true);

-- Only admins can manage pricing
CREATE POLICY "Admins can manage course pricing"
ON public.course_pricing
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Insert default pricing
INSERT INTO public.course_pricing (duration_months, price) VALUES
(1, 500),
(2, 950),
(6, 2700),
(12, 5000)
ON CONFLICT (duration_months) DO NOTHING;

-- Function to calculate and update payment amounts
CREATE OR REPLACE FUNCTION public.calculate_payment_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_price NUMERIC;
BEGIN
  -- Get the price for the course duration
  SELECT price INTO course_price
  FROM public.course_pricing
  WHERE duration_months = NEW.course_duration_months;
  
  -- If no price found, use a default calculation (500 per month)
  IF course_price IS NULL THEN
    course_price := NEW.course_duration_months * 500;
  END IF;
  
  -- Set total course fee if not already set
  IF NEW.total_course_fee = 0 OR NEW.total_course_fee IS NULL THEN
    NEW.total_course_fee := course_price;
  END IF;
  
  -- Calculate remaining amount with discount
  IF NEW.discount_percentage > 0 THEN
    NEW.amount_remaining := NEW.total_course_fee - NEW.amount_paid;
    NEW.amount_remaining := NEW.amount_remaining * (1 - NEW.discount_percentage / 100);
  ELSE
    NEW.amount_remaining := NEW.total_course_fee - NEW.amount_paid;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for students table
DROP TRIGGER IF EXISTS trigger_calculate_payment_amounts ON public.students;
CREATE TRIGGER trigger_calculate_payment_amounts
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.calculate_payment_amounts();