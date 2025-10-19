-- Update teacher course assignments
UPDATE teachers SET courses_assigned = 'level-1' WHERE full_name = 'leo';
UPDATE teachers SET courses_assigned = 'spanish' WHERE full_name = 'lilly';
UPDATE teachers SET courses_assigned = 'level-10, chinese' WHERE full_name = 'dorian';
UPDATE teachers SET courses_assigned = 'level-10' WHERE full_name = 'aysha';