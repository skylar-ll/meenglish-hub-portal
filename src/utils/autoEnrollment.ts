/**
 * AUTO-ENROLLMENT SYSTEM
 * 
 * This utility automatically enrolls students into matching classes based on:
 * - Branch (student.branch_id must match class.branch_id)
 * - Course/Program (student's courses must overlap with class.courses)
 * - Level (student.course_level must match one of class.levels)
 * - Timing (optional: student.timing must match class.timing if specified)
 * 
 * When a student completes registration, this function:
 * 1. Finds all active classes matching their criteria
 * 2. Creates enrollment records in the enrollments table
 * 3. Returns the count of classes enrolled and the earliest start date
 * 
 * This ensures students automatically appear in:
 * - Teacher dashboards (only for their assigned classes)
 * - Attendance sheets (students self-mark)
 * - Quiz distribution (through teacher-student relationships)
 */

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
      .select("id, levels, timing, courses, start_date, teacher_id")
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

    if (enrollError && !String(enrollError.message || '').includes('duplicate key')) {
      // Allow duplicates to pass silently
      throw enrollError;
    }

    // Also ensure teacher-student links for visibility (best-effort)
    try {
      const uniqueTeacherIds = Array.from(
        new Set((eligible || []).map((c: any) => c.teacher_id).filter(Boolean))
      );
      if (uniqueTeacherIds.length > 0) {
        const links = uniqueTeacherIds.map((tid) => ({
          student_id: studentData.id,
          teacher_id: tid as string,
        }));
        await supabase.from("student_teachers").insert(links);
      }
    } catch (linkErr) {
      console.warn("student_teachers link insert skipped:", linkErr);
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

// Backfill auto-enrollments for all existing students
export const backfillAllEnrollments = async (): Promise<number> => {
  const { data: allStudents, error } = await supabase
    .from("students")
    .select("id, branch_id, program, course_level, timing");
  if (error || !allStudents) return 0;

  let processed = 0;
  for (const s of allStudents) {
    try {
      const courses = typeof s.program === 'string' && s.program
        ? s.program.split(',').map((c: string) => c.trim()).filter(Boolean)
        : [];
      await autoEnrollStudent({
        id: s.id,
        branch_id: (s as any).branch_id || '',
        program: courses,
        course_level: (s as any).course_level || '',
        timing: (s as any).timing || '',
        courses,
      });
      processed++;
    } catch (e) {
      console.warn('Auto-enroll failed for student', s.id, e);
    }
  }
  return processed;
};

// Ensure student_teachers links exist for all enrollments so teachers can view students
export const syncTeacherAssignmentsFromEnrollments = async (): Promise<number> => {
  const { data: enrolls } = await supabase
    .from("enrollments")
    .select("student_id, class_id");
  if (!enrolls || enrolls.length === 0) return 0;

  const classIds = Array.from(new Set(enrolls.map((e: any) => e.class_id)));
  const { data: classRows } = await supabase
    .from("classes")
    .select("id, teacher_id")
    .in("id", classIds);
  const teacherByClass = new Map<string, string>();
  (classRows || []).forEach((c: any) => {
    if (c.teacher_id) teacherByClass.set(c.id, c.teacher_id);
  });

  const links: { student_id: string; teacher_id: string }[] = [];
  for (const e of enrolls) {
    const tid = teacherByClass.get(e.class_id);
    if (tid) links.push({ student_id: e.student_id, teacher_id: tid });
  }

  if (links.length === 0) return 0;

  try {
    const { error: linkErr } = await supabase.from("student_teachers").insert(links);
    if (linkErr && !String(linkErr.message || '').includes('duplicate key')) throw linkErr;
  } catch (err) {
    console.warn('Sync teacher links encountered errors (some may already exist):', err);
  }

  return links.length;
};
