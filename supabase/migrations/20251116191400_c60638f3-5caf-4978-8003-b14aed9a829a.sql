-- Create table for custom form fields configuration
CREATE TABLE IF NOT EXISTS public.custom_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL, -- 'add_new_student', 'add_previous_student', 'create_teacher'
  field_name text NOT NULL,
  field_label_en text NOT NULL,
  field_label_ar text,
  field_type text NOT NULL, -- 'text', 'email', 'number', 'select', 'date', 'textarea'
  field_options jsonb, -- For select fields: ["option1", "option2"]
  is_required boolean DEFAULT true,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  placeholder_en text,
  placeholder_ar text,
  validation_rules jsonb, -- {"min": 0, "max": 100, "pattern": "regex"}
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(form_type, field_name)
);

-- Enable RLS
ALTER TABLE public.custom_form_fields ENABLE ROW LEVEL SECURITY;

-- Admins can manage custom form fields
CREATE POLICY "Admins can manage custom form fields"
  ON public.custom_form_fields
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active form fields
CREATE POLICY "Anyone can view active form fields"
  ON public.custom_form_fields
  FOR SELECT
  USING (is_active = true);

-- Create index for faster queries
CREATE INDEX idx_custom_form_fields_form_type ON public.custom_form_fields(form_type, is_active, display_order);

-- Create update trigger
CREATE TRIGGER update_custom_form_fields_updated_at
  BEFORE UPDATE ON public.custom_form_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();