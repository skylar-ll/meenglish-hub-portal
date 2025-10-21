-- Update the courses back to 'course' type with proper JSON format including categories
-- First, clear existing courses
DELETE FROM form_configurations WHERE config_type IN ('course', 'program');

-- English Program Levels as courses with category
INSERT INTO form_configurations (config_type, config_key, config_value, display_order, is_active, price) VALUES
('course', 'level-1', '{"label": "level-1 (pre1) مستوى اول", "category": "English Program"}', 1, true, 0),
('course', 'level-2', '{"label": "level-2 (pre2) مستوى ثاني", "category": "English Program"}', 2, true, 0),
('course', 'level-3', '{"label": "level-3 (intro A) مستوى ثالث", "category": "English Program"}', 3, true, 0),
('course', 'level-4', '{"label": "level-4 (intro B) مستوى رابع", "category": "English Program"}', 4, true, 0),
('course', 'level-5', '{"label": "level-5 (1A) مستوى خامس", "category": "English Program"}', 5, true, 0),
('course', 'level-6', '{"label": "level-6 (1B) مستوى سادس", "category": "English Program"}', 6, true, 0),
('course', 'level-7', '{"label": "level-7 (2A) مستوى سابع", "category": "English Program"}', 7, true, 0),
('course', 'level-8', '{"label": "level-8 (2B) مستوى ثامن", "category": "English Program"}', 8, true, 0),
('course', 'level-9', '{"label": "level-9 (3A) مستوى تاسع", "category": "English Program"}', 9, true, 0),
('course', 'level-10', '{"label": "level-10 (3B) مستوى عاشر", "category": "English Program"}', 10, true, 0),
('course', 'level-11', '{"label": "level-11 (IELTS 1 - STEP 1) مستوى-11", "category": "English Program"}', 11, true, 0),
('course', 'level-12', '{"label": "level-12 (IELTS 2 - STEP 2) مستوى -12", "category": "English Program"}', 12, true, 0),

-- Speaking Program
('course', 'speaking-class', '{"label": "Speaking class", "category": "Speaking Program"}', 13, true, 0),

-- Private Class
('course', 'private-class', '{"label": "1:1 class - privet class كلاس فردي", "category": "Private Class"}', 14, true, 0),

-- Other Languages
('course', 'french', '{"label": "French language لغة فرنسية", "category": "Other Languages"}', 15, true, 0),
('course', 'chinese', '{"label": "Chinese Language لغة صينية", "category": "Other Languages"}', 16, true, 0),
('course', 'spanish', '{"label": "Spanish language لغة اسبانية", "category": "Other Languages"}', 17, true, 0),
('course', 'italian', '{"label": "Italian Language لغة ايطالية", "category": "Other Languages"}', 18, true, 0),
('course', 'arabic-non-native', '{"label": "Arabic for Non-Arabic Speakers عربي لغير الناطقين بها", "category": "Other Languages"}', 19, true, 0);