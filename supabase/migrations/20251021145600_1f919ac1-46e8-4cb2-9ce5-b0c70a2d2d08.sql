-- Clear existing course configurations and add the new structured courses
DELETE FROM form_configurations WHERE config_type = 'course';

-- English Program Levels
INSERT INTO form_configurations (config_type, config_key, config_value, display_order, is_active) VALUES
('course', 'level-1', 'level-1 (pre1) مستوى اول', 1, true),
('course', 'level-2', 'level-2 (pre2) مستوى ثاني', 2, true),
('course', 'level-3', 'level-3 (intro A) مستوى ثالث', 3, true),
('course', 'level-4', 'level-4 (intro B) مستوى رابع', 4, true),
('course', 'level-5', 'level-5 (1A) مستوى خامس', 5, true),
('course', 'level-6', 'level-6 (1B) مستوى سادس', 6, true),
('course', 'level-7', 'level-7 (2A) مستوى سابع', 7, true),
('course', 'level-8', 'level-8 (2B) مستوى ثامن', 8, true),
('course', 'level-9', 'level-9 (3A) مستوى تاسع', 9, true),
('course', 'level-10', 'level-10 (3B) مستوى عاشر', 10, true),
('course', 'level-11', 'level-11 (IELTS 1 - STEP 1) مستوى-11', 11, true),
('course', 'level-12', 'level-12 (IELTS 2 - STEP 2) مستوى -12', 12, true),

-- Speaking Program
('course', 'speaking-class', 'Speaking class', 13, true),

-- Private Class
('course', 'private-class', '1:1 class - privet class كلاس فردي', 14, true),

-- Other Languages
('course', 'french', 'French language لغة فرنسية', 15, true),
('course', 'chinese', 'Chinese Language لغة صينية', 16, true),
('course', 'spanish', 'Spanish language لغة اسبانية', 17, true),
('course', 'italian', 'Italian Language لغة ايطالية', 18, true),
('course', 'arabic-non-native', 'Arabic for Non-Arabic Speakers عربي لغير الناطقين بها', 19, true);