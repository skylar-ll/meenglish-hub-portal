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
    // Get student's chosen level as array
    const studentLevels = studentData.course_level.split(",").map(l => l.trim());

    // Find matching classes
    const { data: classes, error: classError } = await supabase
      .from("classes")
      .select("id, levels, program, timing")
      .eq("branch_id", studentData.branch_id)
      .eq("program", studentData.program)
      .eq("timing", studentData.timing)
      .eq("status", "active");

    if (classError) throw classError;

    if (!classes || classes.length === 0) {
      console.log("No matching classes found for auto-enrollment");
      return;
    }

    // Filter classes that have overlapping levels
    const matchingClasses = classes.filter((cls) => {
      if (!cls.levels || !Array.isArray(cls.levels)) return false;
      
      // Check if any of the student's levels are in the class levels
      return studentLevels.some(studentLevel => 
        cls.levels.includes(studentLevel)
      );
    });

    if (matchingClasses.length === 0) {
      console.log("No classes with matching levels found");
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

    console.log(`Successfully enrolled student in ${matchingClasses.length} class(es)`);
  } catch (error) {
    console.error("Error in auto-enrollment:", error);
    throw error;
  }
};
