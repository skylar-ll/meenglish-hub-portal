-- Create offers table
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_name TEXT NOT NULL,
  offer_description TEXT,
  discount_percentage NUMERIC NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Admins can manage all offers
CREATE POLICY "Admins can manage offers"
ON public.offers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active offers
CREATE POLICY "Anyone can view active offers"
ON public.offers
FOR SELECT
USING (status = 'active');

-- Create index for performance
CREATE INDEX idx_offers_dates ON public.offers(start_date, end_date, status);

-- Trigger to update updated_at
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();