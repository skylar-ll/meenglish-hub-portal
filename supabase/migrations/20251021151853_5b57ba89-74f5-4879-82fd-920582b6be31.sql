-- Update timing formatting to use "to" consistently
UPDATE form_configurations 
SET config_value = '3:00 to 4:30pm'
WHERE config_type = 'timing' AND config_key = 'afternoon';

UPDATE form_configurations 
SET config_value = '4:30 to 6:00pm'
WHERE config_type = 'timing' AND config_key = 'evening';