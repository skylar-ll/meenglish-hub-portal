import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FilteredOptions {
  allowedPrograms: string[];
  allowedLevels: string[];
  allowedLevelKeys: string[]; // Normalized like level-1, level-2
  allowedTimings: string[];
  allowedCourses: string[];
  allowedStartDates: string[];
  allPrograms: string[];
  allLevels: string[];
  allTimings: string[];
  allCourses: string[];
}

export const useBranchFiltering = (branchId: string | null) => {
  const [filteredOptions, setFilteredOptions] = useState<FilteredOptions>({
    allowedPrograms: [],
    allowedLevels: [],
    allowedLevelKeys: [],
    allowedTimings: [],
    allowedCourses: [],
    allowedStartDates: [],
    allPrograms: [],
    allLevels: [],
    allTimings: [],
    allCourses: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableOptions();
  }, [branchId]);

  const fetchAvailableOptions = async () => {
    setLoading(true);
    try {
      console.log("🔍 Branch filtering - Starting fetch for branchId:", branchId);
      
      // Fetch ALL classes to get all possible options
      const { data: allClasses, error: allError } = await supabase
        .from("classes")
        .select("program, levels, timing, courses, branch_id, class_name, start_date")
        .eq("status", "active");

      if (allError) throw allError;

      console.log("📋 All active classes found:", allClasses?.length || 0);
      if (allClasses && allClasses.length > 0) {
        console.log("📊 Sample class data:", JSON.stringify(allClasses[0], null, 2));
      }

      // Get all possible options across all branches
      const allPrograms = new Set<string>();
      const allLevels = new Set<string>();
      const allTimings = new Set<string>();
      const allCourses = new Set<string>();

      (allClasses || []).forEach((cls) => {
        if (cls.program) allPrograms.add(cls.program);
        if (cls.timing) allTimings.add(cls.timing);
        if (cls.levels && Array.isArray(cls.levels)) {
          cls.levels.forEach((level: string) => allLevels.add(level));
        }
        if (cls.courses && Array.isArray(cls.courses)) {
          cls.courses.forEach((course: string) => allCourses.add(course));
        }
      });

      console.log("🌍 All available across branches:", {
        programs: Array.from(allPrograms),
        levels: Array.from(allLevels),
        timings: Array.from(allTimings),
        courses: Array.from(allCourses),
      });

      if (!branchId) {
        console.log("ℹ️ No branch selected - showing all options");
        setFilteredOptions({
          allowedPrograms: Array.from(allPrograms),
          allowedLevels: Array.from(allLevels),
          allowedLevelKeys: [],
          allowedTimings: Array.from(allTimings),
          allowedCourses: Array.from(allCourses),
          allowedStartDates: [],
          allPrograms: Array.from(allPrograms),
          allLevels: Array.from(allLevels),
          allTimings: Array.from(allTimings),
          allCourses: Array.from(allCourses),
        });
        setLoading(false);
        return;
      }

      // Fetch classes for the selected branch
      const { data: branchClasses, error } = await supabase
        .from("classes")
        .select("program, levels, timing, courses, branch_id, class_name, start_date")
        .eq("branch_id", branchId)
        .eq("status", "active");

      if (error) throw error;

      console.log(`🎯 Classes found for branch ${branchId}:`, branchClasses?.length || 0);
      if (branchClasses && branchClasses.length > 0) {
        console.log("📝 Branch classes details:", JSON.stringify(branchClasses, null, 2));
      } else {
        console.warn("⚠️ No active classes found for this branch!");
      }

      const programs = new Set<string>();
      const levels = new Set<string>();
      const levelKeys = new Set<string>();
      const timings = new Set<string>();
      const courses = new Set<string>();
      const startDates = new Set<string>();

      const extractLevelKey = (val: string): string | null => {
        if (!val) return null;
        const m = val.toLowerCase().match(/level[\s\-_]?(\d{1,2})/i);
        return m ? `level-${m[1]}` : null;
      };

      (branchClasses || []).forEach((cls) => {
        if (cls.program) {
          programs.add(cls.program);
          console.log("  ✓ Program:", cls.program);
        }
        if (cls.timing) {
          timings.add(cls.timing);
          console.log("  ✓ Timing:", cls.timing);
        }
        if (cls.start_date) {
          startDates.add(String(cls.start_date));
          console.log("  ✓ Start Date:", cls.start_date);
        }
        if (cls.levels && Array.isArray(cls.levels)) {
          cls.levels.forEach((level: string) => {
            levels.add(level);
            const key = extractLevelKey(level);
            if (key) levelKeys.add(key);
            console.log("  ✓ Level:", level, "| key:", key);
          });
        }
        if (cls.courses && Array.isArray(cls.courses)) {
          cls.courses.forEach((course: string) => {
            // Normalize course name for matching (remove extra spaces, case-insensitive)
            const normalizedCourse = course.trim();
            courses.add(normalizedCourse);
            console.log("  ✓ Course:", normalizedCourse);
          });
        }
      });

      const filteredResult = {
        allowedPrograms: Array.from(programs),
        allowedLevels: Array.from(levels),
        allowedLevelKeys: Array.from(levelKeys),
        allowedTimings: Array.from(timings),
        allowedCourses: Array.from(courses),
        allowedStartDates: Array.from(startDates),
        allPrograms: Array.from(allPrograms),
        allLevels: Array.from(allLevels),
        allTimings: Array.from(allTimings),
        allCourses: Array.from(allCourses),
      };

      console.log("✅ Filtered options for branch:", filteredResult);
      
      setFilteredOptions(filteredResult);
    } catch (error) {
      console.error("❌ Error fetching available options:", error);
    } finally {
      setLoading(false);
    }
  };

  return { filteredOptions, loading };
};
