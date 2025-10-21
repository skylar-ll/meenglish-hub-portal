-- Update course durations to be months, weeks, and days
DELETE FROM form_configurations WHERE config_type = 'course_duration';

INSERT INTO form_configurations (config_type, config_key, config_value, display_order, is_active, price) VALUES
('course_duration', '1-month', '1 Month', 1, true, 0),
('course_duration', '2-months', '2 Months', 2, true, 0),
('course_duration', '3-months', '3 Months', 3, true, 0),
('course_duration', '6-months', '6 Months', 4, true, 0),
('course_duration', '9-months', '9 Months', 5, true, 0),
('course_duration', '12-months', '12 Months', 6, true, 0),
('course_duration', '1-week', '1 Week', 7, true, 0),
('course_duration', '2-weeks', '2 Weeks', 8, true, 0),
('course_duration', '3-weeks', '3 Weeks', 9, true, 0),
('course_duration', '4-weeks', '4 Weeks', 10, true, 0),
('course_duration', '1-day', '1 Day', 11, true, 0),
('course_duration', '2-days', '2 Days', 12, true, 0),
('course_duration', '3-days', '3 Days', 13, true, 0),
('course_duration', '5-days', '5 Days', 14, true, 0);

-- Create timings configuration
DELETE FROM form_configurations WHERE config_type = 'timing';

INSERT INTO form_configurations (config_type, config_key, config_value, display_order, is_active) VALUES
('timing', 'morning', '10:30 am to 12:00 pm', 1, true),
('timing', 'afternoon', '3:00-4:30pm', 2, true),
('timing', 'evening', '4:30-6:00pm', 3, true);