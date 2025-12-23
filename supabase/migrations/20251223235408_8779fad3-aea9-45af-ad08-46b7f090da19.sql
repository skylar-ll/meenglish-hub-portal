-- Ensure realtime payloads include full row data
ALTER TABLE public.classes REPLICA IDENTITY FULL;
ALTER TABLE public.daily_class_status REPLICA IDENTITY FULL;
ALTER TABLE public.schedule_removal_notifications REPLICA IDENTITY FULL;

-- Enable realtime publication for tables used by /admin/teacher-schedule
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_class_status;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_removal_notifications;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;