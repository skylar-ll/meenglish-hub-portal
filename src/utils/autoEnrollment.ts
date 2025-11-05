import { supabase } from "@/integrations/supabase/client";

interface StudentData {
  id: string;
  branch_id: string;
  program?: string | string[];
  course_level?: string;
  timing?: string;
  courses?: string[];
}

interface AutoEnrollResult {
  count: number;
  classIds: string[];
  earliestStartDate: string | null;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const toLevelKey = (val: string) => {
  const lower = val.toLowerCase();
  const m = lower.match(/level[-\s]?(\d+)/);
  if (m?.[1]) return `level-${m[1]}`;
  return lower;
};

export const autoEnrollStudent = async (studentData: StudentData): Promise<AutoEnrollResult> => {
  try {
    // Build student course list from program/courses
    let studentCourses: string[] = [];
    if (Array.isArray(studentData.courses)) studentCourses = studentData.courses;
    else if (Array.isArray(studentData.program)) studentCourses = studentData.program;
    else if (typeof studentData.program === "string" && studentData.program) {
      try {
        const parsed = JSON.parse(studentData.program);
        if (Array.isArray(parsed)) studentCourses = parsed;
        else studentCourses = [studentData.program];
      } catch {
        studentCourses = [studentData.program];
      }
    }

    // Student level keys
    const studentLevelKeys = (studentData.course_level || "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean)
      .map(toLevelKey);

    // Find classes with status active, optionally filtered by branch
    let classesQuery = supabase
      .from("classes")
      .select("id, levels, timing, courses, start_date")
      .eq("status", "active");

    if (studentData.branch_id) {
      classesQuery = classesQuery.eq("branch_id", studentData.branch_id);
    }

    const { data: classes, error: classError } = await classesQuery;

    if (classError) throw classError;
    if (!classes || classes.length === 0) {
      console.log("No active classes found in branch for auto-enrollment");
      return { count: 0, classIds: [], earliestStartDate: null };
    }

    const eligible = classes.filter((cls: any) => {
      // Timing match (if provided)
      if (studentData.timing && cls.timing !== studentData.timing) return false;

      // Course/program match using class.courses array
      if (studentCourses.length > 0) {
        const allowed = Array.isArray(cls.courses) ? cls.courses : [];
        const normAllowed = allowed.map(normalize);
        const hasCourse = studentCourses.some((c) =>
          normAllowed.some((a) => a.includes(normalize(c)) || normalize(c).includes(a))
        );
        if (!hasCourse) return false;
      }

      // Level overlap (if student specified)
      if (studentLevelKeys.length > 0) {
        const classLevelKeys = (Array.isArray(cls.levels) ? cls.levels : [])
          .map(String)
          .map(toLevelKey);
        const hasLevel = studentLevelKeys.some((lk) => classLevelKeys.includes(lk));
        if (!hasLevel) return false;
      }

      return true;
    });

    if (eligible.length === 0) {
      console.log("No classes matching student's timing, course, and levels found");
      return { count: 0, classIds: [], earliestStartDate: null };
    }

    // Create enrollment records
    const enrollments = eligible.map((cls: any) => ({
      student_id: studentData.id,
      class_id: cls.id,
    }));

    const { error: enrollError } = await supabase.from("enrollments").insert(enrollments);

    if (enrollError) {
      // Ignore unique constraint violations (student already enrolled)
      if (!enrollError.message?.includes("duplicate key")) {
        throw enrollError;
      }
    }

    // Compute earliest start date from eligible classes
    const startDates = eligible
      .map((c: any) => c.start_date)
      .filter(Boolean)
      .map((d: string) => new Date(d))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    const earliestStartDate = startDates.length > 0 ? startDates[0].toISOString().slice(0, 10) : null;

    console.log(`Successfully auto-enrolled student in ${eligible.length} class(es)`);
    return { count: eligible.length, classIds: eligible.map((c: any) => c.id), earliestStartDate };
  } catch (error) {
    console.error("Error in auto-enrollment:", error);
    throw error;
  }
};
