-- Insert all level configurations for the Create Class Modal
INSERT INTO public.form_configurations (config_type, config_key, config_value, display_order, is_active)
VALUES
  -- English Program Levels (1-12)
  ('level', 'level-1', 'level-1 (pre1) مستوى اول', 1, true),
  ('level', 'level-2', 'level-2 (pre2) مستوى ثاني', 2, true),
  ('level', 'level-3', 'level-3 (intro A) مستوى ثالث', 3, true),
  ('level', 'level-4', 'level-4 (intro B) مستوى رابع', 4, true),
  ('level', 'level-5', 'level-5 (1A) مستوى خامس', 5, true),
  ('level', 'level-6', 'level-6 (1B) مستوى سادس', 6, true),
  ('level', 'level-7', 'level-7 (2A) مستوى سابع', 7, true),
  ('level', 'level-8', 'level-8 (2B) مستوى ثامن', 8, true),
  ('level', 'level-9', 'level-9 (3A) مستوى تاسع', 9, true),
  ('level', 'level-10', 'level-10 (3B) مستوى عاشر', 10, true),
  ('level', 'level-11', 'level-11 (IELTS 1 - STEP 1) مستوى-11', 11, true),
  ('level', 'level-12', 'level-12 (IELTS 2 - STEP 2) مستوى-12', 12, true),
  -- Other Languages & Courses
  ('level', 'arabic-non-arab', 'Arabic for Non-Arab Speakers - عربي لغير الناطقين', 13, true),
  ('level', 'private-class', '1-1 Private Class - صف خاص', 14, true),
  ('level', 'french', 'French - فرنسي', 15, true),
  ('level', 'chinese', 'Chinese - صيني', 16, true),
  ('level', 'spanish', 'Spanish - إسباني', 17, true),
  ('level', 'italian', 'Italian - إيطالي', 18, true),
  ('level', 'speaking', 'Speaking - محادثة', 19, true)
ON CONFLICT DO NOTHING;