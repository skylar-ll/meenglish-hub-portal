import { supabase } from "@/integrations/supabase/client";

interface StudentData {
  id: string;
  branch_id: string;
  program: string;
  course_level: string;
  timing: string;
}

export const autoEnrollStudent = async (studentData: StudentData) => {
  try {
    // Get student's chosen levels as array
    const studentLevels = studentData.course_level.split(",").map(l => l.trim());

    // Find ALL classes in the student's branch with status active
    const { data: classes, error: classError } = await supabase
      .from("classes")
      .select("id, levels, program, timing, courses")
      .eq("branch_id", studentData.branch_id)
      .eq("status", "active");

    if (classError) throw classError;

    if (!classes || classes.length === 0) {
      console.log("No active classes found in branch for auto-enrollment");
      return;
    }

    // Filter classes that match ALL criteria:
    // 1. Same branch (already filtered above)
    // 2. Same program
    // 3. Same timing
    // 4. At least one overlapping level
    const matchingClasses = classes.filter((cls) => {
      // Check program match
      if (cls.program !== studentData.program) return false;
      
      // Check timing match
      if (cls.timing !== studentData.timing) return false;
      
      // Check if class has levels array
      if (!cls.levels || !Array.isArray(cls.levels)) return false;
      
      // Check if any of the student's levels are in the class levels
      const hasMatchingLevel = studentLevels.some(studentLevel => 
        cls.levels.includes(studentLevel)
      );
      
      return hasMatchingLevel;
    });

    if (matchingClasses.length === 0) {
      console.log("No classes matching student's program, timing, and levels found");
      return;
    }

    // Create enrollment records
    const enrollments = matchingClasses.map((cls) => ({
      student_id: studentData.id,
      class_id: cls.id,
    }));

    const { error: enrollError } = await supabase
      .from("enrollments")
      .insert(enrollments);

    if (enrollError) {
      // Ignore unique constraint violations (student already enrolled)
      if (!enrollError.message.includes("duplicate key")) {
        throw enrollError;
      }
    }

    console.log(`Successfully auto-enrolled student in ${matchingClasses.length} class(es)`);
  } catch (error) {
    console.error("Error in auto-enrollment:", error);
    throw error;
  }
};
