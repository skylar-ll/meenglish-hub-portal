-- Ensure default timing options exist
INSERT INTO public.form_configurations (config_type, config_key, config_value, is_active, display_order)
SELECT 'timing', '10:30am-12:00pm', '10:30 am to 12:00 pm', true, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_configurations WHERE config_type = 'timing' AND config_key = '10:30am-12:00pm'
);

INSERT INTO public.form_configurations (config_type, config_key, config_value, is_active, display_order)
SELECT 'timing', '3:00pm-4:30pm', '3:00-4:30pm', true, 2
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_configurations WHERE config_type = 'timing' AND config_key = '3:00pm-4:30pm'
);

INSERT INTO public.form_configurations (config_type, config_key, config_value, is_active, display_order)
SELECT 'timing', '4:30pm-6:00pm', '4:30-6:00pm', true, 3
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_configurations WHERE config_type = 'timing' AND config_key = '4:30pm-6:00pm'
);
