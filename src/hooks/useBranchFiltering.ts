import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FilteredOptions {
  allowedPrograms: string[];
  allowedLevels: string[];
  allowedTimings: string[];
}

export const useBranchFiltering = (branchId: string | null) => {
  const [filteredOptions, setFilteredOptions] = useState<FilteredOptions>({
    allowedPrograms: [],
    allowedLevels: [],
    allowedTimings: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!branchId) {
      setFilteredOptions({
        allowedPrograms: [],
        allowedLevels: [],
        allowedTimings: [],
      });
      return;
    }

    fetchAvailableOptions();
  }, [branchId]);

  const fetchAvailableOptions = async () => {
    setLoading(true);
    try {
      const { data: classes, error } = await supabase
        .from("classes")
        .select("program, levels, timing")
        .eq("branch_id", branchId)
        .eq("status", "active");

      if (error) throw error;

      if (classes && classes.length > 0) {
        const programs = new Set<string>();
        const levels = new Set<string>();
        const timings = new Set<string>();

        classes.forEach((cls) => {
          if (cls.program) programs.add(cls.program);
          if (cls.timing) timings.add(cls.timing);
          if (cls.levels && Array.isArray(cls.levels)) {
            cls.levels.forEach((level: string) => levels.add(level));
          }
        });

        setFilteredOptions({
          allowedPrograms: Array.from(programs),
          allowedLevels: Array.from(levels),
          allowedTimings: Array.from(timings),
        });
      } else {
        setFilteredOptions({
          allowedPrograms: [],
          allowedLevels: [],
          allowedTimings: [],
        });
      }
    } catch (error) {
      console.error("Error fetching available options:", error);
    } finally {
      setLoading(false);
    }
  };

  return { filteredOptions, loading };
};
