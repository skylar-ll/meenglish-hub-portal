import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FilteredOptions {
  allowedPrograms: string[];
  allowedLevels: string[];
  allowedTimings: string[];
  allPrograms: string[];
  allLevels: string[];
  allTimings: string[];
}

export const useBranchFiltering = (branchId: string | null) => {
  const [filteredOptions, setFilteredOptions] = useState<FilteredOptions>({
    allowedPrograms: [],
    allowedLevels: [],
    allowedTimings: [],
    allPrograms: [],
    allLevels: [],
    allTimings: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableOptions();
  }, [branchId]);

  const fetchAvailableOptions = async () => {
    setLoading(true);
    try {
      // Fetch ALL classes to get all possible options
      const { data: allClasses, error: allError } = await supabase
        .from("classes")
        .select("program, levels, timing")
        .eq("status", "active");

      if (allError) throw allError;

      // Get all possible options across all branches
      const allPrograms = new Set<string>();
      const allLevels = new Set<string>();
      const allTimings = new Set<string>();

      (allClasses || []).forEach((cls) => {
        if (cls.program) allPrograms.add(cls.program);
        if (cls.timing) allTimings.add(cls.timing);
        if (cls.levels && Array.isArray(cls.levels)) {
          cls.levels.forEach((level: string) => allLevels.add(level));
        }
      });

      if (!branchId) {
        setFilteredOptions({
          allowedPrograms: Array.from(allPrograms),
          allowedLevels: Array.from(allLevels),
          allowedTimings: Array.from(allTimings),
          allPrograms: Array.from(allPrograms),
          allLevels: Array.from(allLevels),
          allTimings: Array.from(allTimings),
        });
        setLoading(false);
        return;
      }

      // Fetch classes for the selected branch
      const { data: branchClasses, error } = await supabase
        .from("classes")
        .select("program, levels, timing")
        .eq("branch_id", branchId)
        .eq("status", "active");

      if (error) throw error;

      const programs = new Set<string>();
      const levels = new Set<string>();
      const timings = new Set<string>();

      (branchClasses || []).forEach((cls) => {
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
        allPrograms: Array.from(allPrograms),
        allLevels: Array.from(allLevels),
        allTimings: Array.from(allTimings),
      });
    } catch (error) {
      console.error("Error fetching available options:", error);
    } finally {
      setLoading(false);
    }
  };

  return { filteredOptions, loading };
};
