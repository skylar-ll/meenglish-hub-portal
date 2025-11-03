-- Modify classes table to support multiple levels
ALTER TABLE public.classes 
DROP COLUMN IF EXISTS level;

ALTER TABLE public.classes 
ADD COLUMN levels TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.classes.levels IS 'Array of levels (e.g., Level 1, Level 2, etc.) that this class covers';