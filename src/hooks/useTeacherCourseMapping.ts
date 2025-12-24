import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TeacherCourseMapping {
  levelTeachers: Record<string, string>; // level -> teacher name
  courseTeachers: Record<string, string>; // course -> teacher name
}

export const useTeacherCourseMapping = (branchId: string | null) => {
  const [mapping, setMapping] = useState<TeacherCourseMapping>({
    levelTeachers: {},
    courseTeachers: {},
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!branchId) {
      setMapping({ levelTeachers: {}, courseTeachers: {} });
      return;
    }

    const fetchMapping = async () => {
      setLoading(true);
      try {
        // Fetch classes for the branch with teacher info
        const { data: classes, error: classError } = await supabase
          .from("classes")
          .select(`
            id,
            levels,
            courses,
            teacher_id,
            teachers (
              id,
              full_name
            )
          `)
          .eq("branch_id", branchId)
          .eq("status", "active");

        if (classError) throw classError;

        const levelTeachers: Record<string, string> = {};
        const courseTeachers: Record<string, string> = {};

        (classes || []).forEach((cls: any) => {
          const teacherName = cls.teachers?.full_name || "";
          
          if (teacherName) {
            // Map levels to teachers
            if (cls.levels && Array.isArray(cls.levels)) {
              cls.levels.forEach((level: string) => {
                const normalizedLevel = level.trim();
                if (!levelTeachers[normalizedLevel]) {
                  levelTeachers[normalizedLevel] = teacherName;
                }
              });
            }
            
            // Map courses to teachers
            if (cls.courses && Array.isArray(cls.courses)) {
              cls.courses.forEach((course: string) => {
                const normalizedCourse = course.trim();
                if (!courseTeachers[normalizedCourse]) {
                  courseTeachers[normalizedCourse] = teacherName;
                }
              });
            }
          }
        });

        console.log("📚 Teacher-Course Mapping:", { levelTeachers, courseTeachers });
        setMapping({ levelTeachers, courseTeachers });
      } catch (error) {
        console.error("Failed to fetch teacher-course mapping:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMapping();
  }, [branchId]);

  // Helper function to find teacher for a level/course
  const getTeacherForLevel = (levelValue: string): string | null => {
    // Try exact match first
    if (mapping.levelTeachers[levelValue]) {
      return mapping.levelTeachers[levelValue];
    }
    
    // Try normalized match
    const normalizedSearch = levelValue.toLowerCase().trim();
    for (const [key, teacher] of Object.entries(mapping.levelTeachers)) {
      if (key.toLowerCase().trim() === normalizedSearch) {
        return teacher;
      }
      // Also check if search is contained
      if (key.toLowerCase().includes(normalizedSearch) || normalizedSearch.includes(key.toLowerCase())) {
        return teacher;
      }
    }
    
    return null;
  };

  const getTeacherForCourse = (courseValue: string): string | null => {
    // Try exact match first
    if (mapping.courseTeachers[courseValue]) {
      return mapping.courseTeachers[courseValue];
    }
    
    // Try normalized match
    const normalizedSearch = courseValue.toLowerCase().trim();
    for (const [key, teacher] of Object.entries(mapping.courseTeachers)) {
      if (key.toLowerCase().trim() === normalizedSearch) {
        return teacher;
      }
      // Also check if search is contained
      if (key.toLowerCase().includes(normalizedSearch) || normalizedSearch.includes(key.toLowerCase())) {
        return teacher;
      }
    }
    
    return null;
  };

  return { 
    mapping, 
    loading, 
    getTeacherForLevel, 
    getTeacherForCourse 
  };
};
