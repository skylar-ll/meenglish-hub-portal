-- Create a table for teacher branch schedules (the main schedule grid)
CREATE TABLE public.teacher_branch_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  timing TEXT NOT NULL,
  levels TEXT[] DEFAULT ARRAY[]::TEXT[],
  courses TEXT[] DEFAULT ARRAY[]::TEXT[],
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_removal', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id, teacher_id, timing, start_date)
);

-- Enable RLS
ALTER TABLE public.teacher_branch_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all schedules"
ON public.teacher_branch_schedules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their own schedules"
ON public.teacher_branch_schedules FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

CREATE POLICY "Teachers can insert their own schedules during registration"
ON public.teacher_branch_schedules FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

-- Create a table for pending schedule removal notifications
CREATE TABLE public.schedule_removal_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES public.teacher_branch_schedules(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  end_date DATE NOT NULL,
  notification_sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  admin_approved BOOLEAN DEFAULT NULL,
  admin_approved_by UUID,
  admin_approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedule_removal_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Admins can manage all notifications"
ON public.schedule_removal_notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their own notifications"
ON public.schedule_removal_notifications FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

-- Add branch_id and preferred_timing to teachers table for self-registration
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id),
ADD COLUMN IF NOT EXISTS preferred_timing TEXT,
ADD COLUMN IF NOT EXISTS preferred_levels TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_teacher_branch_schedules_branch ON public.teacher_branch_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_teacher_branch_schedules_teacher ON public.teacher_branch_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_branch_schedules_status ON public.teacher_branch_schedules(status);
CREATE INDEX IF NOT EXISTS idx_teacher_branch_schedules_dates ON public.teacher_branch_schedules(start_date, end_date);

-- Enable realtime for the schedules table
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_branch_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_removal_notifications;