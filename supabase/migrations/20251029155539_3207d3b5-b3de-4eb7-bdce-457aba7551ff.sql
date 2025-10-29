-- Add auto-translation setting to form_configurations
INSERT INTO public.form_configurations (config_type, config_key, config_value, is_active, display_order)
VALUES ('setting', 'auto_translation_enabled', 'true', true, 0)
ON CONFLICT DO NOTHING;