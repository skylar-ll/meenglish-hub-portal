import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TeacherCourseMapping {
  levelTeachers: Record<string, string>; // level -> teacher name
  courseTeachers: Record<string, string>; // course -> teacher name
  levelTimings: Record<string, string[]>; // level -> timings
  courseTimings: Record<string, string[]>; // course -> timings
}

const normalize = (s: string) => (s || "").toLowerCase().trim();

const findForLevel = <T,>(map: Record<string, T>, levelValue: string): T | null => {
  if (!levelValue) return null;
  if (map[levelValue]) return map[levelValue];

  const normalizedSearch = normalize(levelValue);
  const levelMatch = normalizedSearch.match(/level[\s\-_]?(\d+)/i);
  const levelNumber = levelMatch ? levelMatch[1] : null;

  for (const [key, value] of Object.entries(map)) {
    const keyLower = normalize(key);

    if (keyLower === normalizedSearch) return value;

    if (levelNumber) {
      const keyLevelMatch = keyLower.match(/level[\s\-_]?(\d+)/i);
      if (keyLevelMatch && keyLevelMatch[1] === levelNumber) return value;
    }

    if (keyLower.includes(normalizedSearch) || normalizedSearch.includes(keyLower)) return value;
  }

  return null;
};

const findForCourse = <T,>(map: Record<string, T>, courseValue: string): T | null => {
  if (!courseValue) return null;
  if (map[courseValue]) return map[courseValue];

  const normalizedSearch = normalize(courseValue);
  for (const [key, value] of Object.entries(map)) {
    const keyLower = normalize(key);
    if (keyLower === normalizedSearch) return value;
    if (keyLower.includes(normalizedSearch) || normalizedSearch.includes(keyLower)) return value;
  }

  return null;
};

export const useTeacherCourseMapping = (branchId: string | null) => {
  const [mapping, setMapping] = useState<TeacherCourseMapping>({
    levelTeachers: {},
    courseTeachers: {},
    levelTimings: {},
    courseTimings: {},
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!branchId) {
      setMapping({ levelTeachers: {}, courseTeachers: {}, levelTimings: {}, courseTimings: {} });
      return;
    }

    const fetchMapping = async () => {
      setLoading(true);
      try {
        // Use a backend function so we can safely return only teacher names (not teacher emails).
        const { data, error } = await supabase.functions.invoke("teacher-course-mapping", {
          body: { branchId },
        });

        if (error) throw error;

        setMapping({
          levelTeachers: data?.levelTeachers ?? {},
          courseTeachers: data?.courseTeachers ?? {},
          levelTimings: data?.levelTimings ?? {},
          courseTimings: data?.courseTimings ?? {},
        });
      } catch (err) {
        console.error("Failed to fetch teacher-course mapping:", err);
        setMapping({ levelTeachers: {}, courseTeachers: {}, levelTimings: {}, courseTimings: {} });
      } finally {
        setLoading(false);
      }
    };

    fetchMapping();
  }, [branchId]);

  const api = useMemo(() => {
    const getTeacherForLevel = (levelValue: string): string | null =>
      findForLevel(mapping.levelTeachers, levelValue);

    const getTeacherForCourse = (courseValue: string): string | null =>
      findForCourse(mapping.courseTeachers, courseValue);

    const getTimingsForLevel = (levelValue: string): string[] =>
      findForLevel(mapping.levelTimings, levelValue) ?? [];

    const getTimingsForCourse = (courseValue: string): string[] =>
      findForCourse(mapping.courseTimings, courseValue) ?? [];

    return { getTeacherForLevel, getTeacherForCourse, getTimingsForLevel, getTimingsForCourse };
  }, [mapping]);

  return {
    mapping,
    loading,
    ...api,
  };
};
