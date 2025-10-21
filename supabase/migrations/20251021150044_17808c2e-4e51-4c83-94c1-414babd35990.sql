-- Update the course configurations to use 'program' as config_type to match the query
UPDATE form_configurations 
SET config_type = 'program' 
WHERE config_type = 'course';