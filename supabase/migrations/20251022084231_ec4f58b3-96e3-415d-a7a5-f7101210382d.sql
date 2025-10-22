-- Create billing table
CREATE TABLE public.billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  student_name_en TEXT NOT NULL,
  student_name_ar TEXT NOT NULL,
  phone TEXT NOT NULL,
  course_package TEXT NOT NULL,
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  course_start_date DATE NOT NULL,
  time_slot TEXT,
  level_count INTEGER NOT NULL DEFAULT 1,
  total_fee NUMERIC NOT NULL DEFAULT 0,
  discount_percentage NUMERIC NOT NULL DEFAULT 10,
  fee_after_discount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  amount_remaining NUMERIC NOT NULL DEFAULT 0,
  first_payment NUMERIC,
  second_payment NUMERIC,
  signature_url TEXT,
  signed_pdf_url TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  training_license TEXT DEFAULT '5300751',
  commercial_registration TEXT DEFAULT '2050122590',
  contract_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view own billing"
ON public.billing
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

CREATE POLICY "Admins can manage all billing"
ON public.billing
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view assigned students billing"
ON public.billing
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  student_id IN (
    SELECT student_id FROM student_teachers WHERE teacher_id = auth.uid()
  )
);

-- Create storage buckets for billing
INSERT INTO storage.buckets (id, name, public) VALUES ('billing-pdfs', 'billing-pdfs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);

-- Storage policies for billing PDFs
CREATE POLICY "Students can view own billing PDFs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'billing-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage billing PDFs"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'billing-pdfs' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert own billing PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'billing-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for signatures
CREATE POLICY "Students can view own signatures"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'signatures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can insert own signatures"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'signatures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add billing fields to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS timing TEXT,
ADD COLUMN IF NOT EXISTS billing_id UUID REFERENCES public.billing(id);

-- Trigger to update updated_at
CREATE TRIGGER update_billing_updated_at
BEFORE UPDATE ON public.billing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate billing amounts
CREATE OR REPLACE FUNCTION public.calculate_billing_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate fee after discount
  NEW.fee_after_discount := NEW.total_fee * (1 - NEW.discount_percentage / 100);
  
  -- Calculate remaining amount
  NEW.amount_remaining := NEW.fee_after_discount - NEW.amount_paid;
  
  -- Set default payment splits if not set
  IF NEW.first_payment IS NULL THEN
    NEW.first_payment := NEW.fee_after_discount * 0.5;
  END IF;
  
  IF NEW.second_payment IS NULL THEN
    NEW.second_payment := NEW.fee_after_discount * 0.5;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-calculate billing amounts
CREATE TRIGGER calculate_billing_amounts_trigger
BEFORE INSERT OR UPDATE ON public.billing
FOR EACH ROW
EXECUTE FUNCTION public.calculate_billing_amounts();