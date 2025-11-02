-- Add payment tracking fields to billing table
ALTER TABLE public.billing 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed')),
ADD COLUMN IF NOT EXISTS payment_deadline DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Create payment_history table to track individual payments
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billing_id UUID NOT NULL REFERENCES public.billing(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_history
CREATE POLICY "Students can view their own payment history"
ON public.payment_history
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Admins can view all payment history"
ON public.payment_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can insert their own payments"
ON public.payment_history
FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can manage all payment history"
ON public.payment_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update payment status automatically
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update payment status based on amount_remaining
  IF NEW.amount_remaining <= 0 THEN
    NEW.payment_status := 'completed';
  ELSE
    NEW.payment_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically update payment status
CREATE TRIGGER update_billing_payment_status
BEFORE INSERT OR UPDATE ON public.billing
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_status();

-- Function to calculate payment deadline based on course duration
CREATE OR REPLACE FUNCTION public.calculate_payment_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set payment deadline to end of the first month of the course
  IF NEW.payment_deadline IS NULL AND NEW.course_start_date IS NOT NULL THEN
    NEW.payment_deadline := (NEW.course_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to set payment deadline
CREATE TRIGGER set_payment_deadline
BEFORE INSERT OR UPDATE ON public.billing
FOR EACH ROW
EXECUTE FUNCTION public.calculate_payment_deadline();

-- Add updated_at trigger for payment_history
CREATE TRIGGER update_payment_history_updated_at
BEFORE UPDATE ON public.payment_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();