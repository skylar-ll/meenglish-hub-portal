-- Create form configurations table for centralized form management
CREATE TABLE IF NOT EXISTS public.form_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(config_type, config_key)
);

-- Enable RLS
ALTER TABLE public.form_configurations ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read form configurations
CREATE POLICY "Anyone can view form configurations"
  ON public.form_configurations
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage form configurations
CREATE POLICY "Admins can manage form configurations"
  ON public.form_configurations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default courses
INSERT INTO public.form_configurations (config_type, config_key, config_value, display_order) VALUES
  ('course', 'level-1', '{"label": "Level 1 (Pre1) - مستوى اول", "category": "English Program"}', 1),
  ('course', 'level-2', '{"label": "Level 2 (Pre2) - مستوى ثاني", "category": "English Program"}', 2),
  ('course', 'level-3', '{"label": "Level 3 (Intro A) - مستوى ثالث", "category": "English Program"}', 3),
  ('course', 'level-4', '{"label": "Level 4 (Intro B) - مستوى رابع", "category": "English Program"}', 4),
  ('course', 'level-5', '{"label": "Level 5 (1A) - مستوى خامس", "category": "English Program"}', 5),
  ('course', 'level-6', '{"label": "Level 6 (1B) - مستوى سادس", "category": "English Program"}', 6),
  ('course', 'level-7', '{"label": "Level 7 (2A) - مستوى سابع", "category": "English Program"}', 7),
  ('course', 'level-8', '{"label": "Level 8 (2B) - مستوى ثامن", "category": "English Program"}', 8),
  ('course', 'level-9', '{"label": "Level 9 (3A) - مستوى تاسع", "category": "English Program"}', 9),
  ('course', 'level-10', '{"label": "Level 10 (3B) - مستوى عاشر", "category": "English Program"}', 10),
  ('course', 'level-11', '{"label": "Level 11 (IELTS 1 - STEP 1) - مستوى-11", "category": "English Program"}', 11),
  ('course', 'level-12', '{"label": "Level 12 (IELTS 2 - STEP 2) - مستوى-12", "category": "English Program"}', 12),
  ('course', 'speaking', '{"label": "Speaking Class", "category": "Speaking Program"}', 13),
  ('course', 'private', '{"label": "1:1 Class - Private Class - كلاس فردي", "category": "Private Class"}', 14),
  ('course', 'french', '{"label": "French Language - لغة فرنسية", "category": "Other Languages"}', 15),
  ('course', 'chinese', '{"label": "Chinese Language - لغة صينية", "category": "Other Languages"}', 16),
  ('course', 'spanish', '{"label": "Spanish Language - لغة اسبانية", "category": "Other Languages"}', 17),
  ('course', 'italian', '{"label": "Italian Language - لغة ايطالية", "category": "Other Languages"}', 18),
  ('course', 'arabic', '{"label": "Arabic for Non-Arabic Speakers - عربي لغير الناطقين بها", "category": "Other Languages"}', 19);

-- Insert default branches
INSERT INTO public.form_configurations (config_type, config_key, config_value, display_order) VALUES
  ('branch', 'online', 'Online Classes - صفوف اونلاين', 1),
  ('branch', 'dammam', 'Dammam Branch - فرع الدمام', 2),
  ('branch', 'dhahran', 'Dhahran Branch - فرع الظهران', 3),
  ('branch', 'khobar', 'Khobar Branch - فرع الخبر', 4);

-- Insert default payment methods
INSERT INTO public.form_configurations (config_type, config_key, config_value, display_order) VALUES
  ('payment_method', 'card', 'Card - بطاقة', 1),
  ('payment_method', 'cash', 'Cash - كاش', 2),
  ('payment_method', 'card-cash', 'Card/Cash - بطاقة/كاش', 3),
  ('payment_method', 'transfer', 'Transfer - تحويل', 4),
  ('payment_method', 'tamara', 'Tamara - تمارا', 5),
  ('payment_method', 'tabby', 'Tabby - تابي', 6),
  ('payment_method', 'stcpay', 'Stcpay - اس تي سي باي', 7);

-- Insert default programs
INSERT INTO public.form_configurations (config_type, config_key, config_value, display_order) VALUES
  ('program', 'general-english', 'General English', 1),
  ('program', 'business-english', 'Business English', 2),
  ('program', 'ielts-preparation', 'IELTS Preparation', 3);

-- Insert default class types
INSERT INTO public.form_configurations (config_type, config_key, config_value, display_order) VALUES
  ('class_type', 'group', 'Group', 1),
  ('class_type', 'private', 'Private', 2);