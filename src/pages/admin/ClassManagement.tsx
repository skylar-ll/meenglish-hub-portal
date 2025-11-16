import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Teacher {
  id: string;
  full_name: string;
}

interface Student {
  id: string;
  full_name_en: string;
  program: string;
  course_level: string;
}

interface Branch {
  id: string;
  name_en: string;
  name_ar: string;
}

interface CourseConfig {
  label: string;
  category: string;
}

// Hardcoded course options with bilingual labels
const COURSE_OPTIONS = [
  { label: "Speaking class", value: "Speaking class", category: "Speaking program" },
  { label: "1:1 class - private class كلاس فردي", value: "1:1 class - private class كلاس فردي", category: "Private class" },
  { label: "French language لغة فرنسية", value: "French language لغة فرنسية", category: "Other languages" },
  { label: "Chinese Language لغة صينية", value: "Chinese Language لغة صينية", category: "Other languages" },
  { label: "Spanish language لغة اسبانية", value: "Spanish language لغة اسبانية", category: "Other languages" },
  { label: "Italian Language لغة ايطالية", value: "Italian Language لغة ايطالية", category: "Other languages" },
  { label: "Arabic for Non-Arabic Speakers عربي لغير الناطقين بها", value: "Arabic for Non-Arabic Speakers عربي لغير الناطقين بها", category: "Other languages" },
];

// Hardcoded level options with bilingual labels
const LEVEL_OPTIONS = [
  "level-1 (pre1) مستوى اول",
  "level-2 (pre2) مستوى ثاني",
  "level-3 (intro A) مستوى ثالث",
  "level-4 (intro B) مستوى رابع",
  "level-5 (1A) مستوى خامس",
  "level-6 (1B) مستوى سادس",
  "level-7 (2A) مستوى سابع",
  "level-8 (2B) مستوى ثامن",
  "level-9 (3A) مستوى تاسع",
  "level-10 (3B) مستوى عاشر",
  "level-11 (IELTS 1 - STEP 1) مستوى-11",
  "level-12 (IELTS 2 - STEP 2) مستوى -12",
];

interface ExistingClass {
  id: string;
  class_name: string;
  timing: string;
  courses: string[];
  levels: string[];
  program?: string;
  start_date?: string;
  branch?: { name_en: string };
  teacher: {
    id: string;
    full_name: string;
  } | null;
  student_count: number;
}

import { AutoEnrollmentInfo } from "@/components/admin/AutoEnrollmentInfo";
import { EditClassModal } from "@/components/admin/EditClassModal";

export default function ClassManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [timings, setTimings] = useState<string[]>([]);
  const [existingClasses, setExistingClasses] = useState<ExistingClass[]>([]);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  // Form state
  const [className, setClassName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTiming, setSelectedTiming] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      toast.error('Unauthorized access');
      navigate('/admin/login');
      return;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch branches
      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select("*")
        .order("name_en");

      if (branchesError) throw branchesError;
      setBranches(branchesData || []);

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("id, full_name")
        .order("full_name");

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Fetch students with their course info
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name_en, program, course_level")
        .order("full_name_en");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch form configurations
      const { data: configData, error: configError } = await supabase
        .from("form_configurations")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (configError) throw configError;

      // Parse timings
      const timingConfigs = configData
        ?.filter((c) => c.config_type === "timing")
        .map((c) => c.config_value) || [];
      
      // Default timings if none in database
      const defaultTimings = [
        "10:30 am to 12:00 pm",
        "3:00-4:30pm",
        "4:30-6:00pm",
        "9:00-10:30pm"
      ];
      setTimings(timingConfigs.length > 0 ? timingConfigs : defaultTimings);

      // Fetch existing classes
      await fetchExistingClasses();
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingClasses = async () => {
    try {
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          timing,
          courses,
          levels,
          program,
          start_date,
          branch_id,
          teacher_id,
          branches (name_en),
          teachers (
            id,
            full_name
          )
        `);

      if (classesError) throw classesError;

      // Get student counts for each class
      const classesWithCounts = await Promise.all(
        (classesData || []).map(async (cls: any) => {
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("id")
            .eq("class_id", cls.id);

          return {
            id: cls.id,
            class_name: cls.class_name,
            timing: cls.timing,
            courses: cls.courses || [],
            levels: cls.levels || [],
            program: cls.program,
            start_date: cls.start_date,
            branch: cls.branches,
            teacher: cls.teachers ? {
              id: cls.teachers.id,
              full_name: cls.teachers.full_name,
            } : null,
            student_count: enrollments?.length || 0,
          };
        })
      );

      setExistingClasses(classesWithCounts);
    } catch (error: any) {
      toast.error("Failed to load classes: " + error.message);
    }
  };

  const toggleCourse = (course: string) => {
    setSelectedCourses((prev) =>
      prev.includes(course)
        ? prev.filter((c) => c !== course)
        : [...prev, course]
    );
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((s) => s !== studentId)
        : [...prev, studentId]
    );
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      toast.error("Please enter a class name");
      return;
    }
    if (!selectedBranch) {
      toast.error("Please select a branch");
      return;
    }
    if (selectedCourses.length === 0) {
      toast.error("Please select at least one course");
      return;
    }
    if (selectedLevels.length === 0) {
      toast.error("Please select at least one level");
      return;
    }
    // Teacher is now optional
    if (!selectedTiming) {
      toast.error("Please select a timing");
      return;
    }
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }

    setLoading(true);
    try {
      // Create the class
      const { data: newClass, error: classError } = await supabase
        .from("classes")
        .insert({
          class_name: className,
          branch_id: selectedBranch,
          courses: selectedCourses,
          levels: selectedLevels,
          teacher_id: selectedTeacher || null,
          timing: selectedTiming,
          start_date: startDate,
          status: 'active',
        })
        .select()
        .single();

      if (classError) throw classError;

      // Enroll selected students
      if (selectedStudents.length > 0) {
        const enrollments = selectedStudents.map((studentId) => ({
          class_id: newClass.id,
          student_id: studentId,
        }));

        const { error: enrollError } = await supabase
          .from("enrollments")
          .insert(enrollments);

        if (enrollError) throw enrollError;
      }

      toast.success(`✅ Class "${className}" created! ${selectedStudents.length} students enrolled. New students will auto-enroll on registration.`);
      
      // Reset form
      setClassName("");
      setSelectedBranch("");
      setSelectedCourses([]);
      setSelectedLevels([]);
      setSelectedTeacher("");
      setSelectedStudents([]);
      setSelectedTiming("");
      setStartDate("");
      
      // Refresh classes list
      fetchExistingClasses();
    } catch (error: any) {
      toast.error("Failed to create class: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);

      if (error) throw error;

      toast.success("Class deleted successfully");
      fetchExistingClasses();
    } catch (error: any) {
      toast.error("Failed to delete class: " + error.message);
    }
  };

  const handleEditClass = (cls: any) => {
    setEditingClass(cls);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchExistingClasses();
    setIsEditModalOpen(false);
    setEditingClass(null);
  };

  const handleBackfill = async () => {
    if (!confirm('Scan all students and assign them to matching classes now?')) return;
    setBackfilling(true);
    try {
      const { backfillAllEnrollments, syncTeacherAssignmentsFromEnrollments } = await import("@/utils/autoEnrollment");
      const processed = await backfillAllEnrollments();
      const linked = await syncTeacherAssignmentsFromEnrollments();
      toast.success(`Synced ${processed} students and ${linked} teacher links`);
      await fetchExistingClasses();
    } catch (e: any) {
      toast.error(e.message || 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  };

  if (loading && teachers.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate("/admin/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Class Management</h1>
          <Button variant="secondary" onClick={handleBackfill} disabled={backfilling}>
            {backfilling ? 'Scanning…' : 'Scan & Assign Students'}
          </Button>
        </div>

        <AutoEnrollmentInfo />

        <Tabs defaultValue="create" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create a Class</TabsTrigger>
            <TabsTrigger value="previous">Previous Classes</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="p-6">
              <div className="space-y-6">
                {/* Class Name */}
                <div>
                  <Label>Class Name</Label>
                  <Input
                    placeholder="e.g., English Level 1 - Morning Group"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>

                {/* Branch */}
                <div>
                  <Label>Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* Courses */}
                <div>
                  <Label>Courses</Label>
                  <Select onValueChange={toggleCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select courses..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {COURSE_OPTIONS.map((course) => (
                        <SelectItem key={course.value} value={course.value}>
                          {course.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCourses.map((course) => (
                      <Badge key={course} variant="secondary">
                        {course}
                        <button
                          onClick={() => toggleCourse(course)}
                          className="ml-2 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Levels */}
                <div>
                  <Label>Levels</Label>
                  <Select onValueChange={toggleLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select levels..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {LEVEL_OPTIONS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedLevels.map((level) => (
                      <Badge key={level} variant="outline">
                        {level}
                        <button
                          onClick={() => toggleLevel(level)}
                          className="ml-2 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Teacher */}
                <div>
                  <Label>Teacher (Optional)</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a teacher (optional)..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timing */}
                <div>
                  <Label>Timing</Label>
                  <Select value={selectedTiming} onValueChange={setSelectedTiming}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timing..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {timings.map((timing) => (
                        <SelectItem key={timing} value={timing}>
                          {timing}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Students */}
                <div>
                  <Label>Students (Optional)</Label>
                  <Select onValueChange={toggleStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select students..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background max-h-[300px] overflow-y-auto">
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{student.full_name_en}</span>
                            <span className="text-xs text-muted-foreground">
                              ({student.program} - {student.course_level})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedStudents.map((studentId) => {
                      const student = students.find((s) => s.id === studentId);
                      return student ? (
                        <Badge key={studentId} variant="secondary" className="py-1.5">
                          <div className="flex flex-col gap-0.5">
                            <span>{student.full_name_en}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {student.program} - {student.course_level}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleStudent(studentId)}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>

                <Button
                  onClick={handleCreateClass}
                  disabled={loading}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Class
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="previous">
            <div className="grid gap-4">
              {existingClasses.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No classes created yet</p>
                </Card>
              ) : (
                existingClasses.map((cls) => (
                  <Card key={cls.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{cls.class_name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Teacher: {cls.teacher ? cls.teacher.full_name : 'No teacher assigned'}
                        </p>
                        {cls.branch?.name_en && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Branch: {cls.branch.name_en}
                          </p>
                        )}
                        {cls.program && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Program: {cls.program}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mb-2">
                          Timing: {cls.timing}
                        </p>
                        {cls.start_date && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Start Date: {new Date(cls.start_date).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mb-2">
                          Students: {cls.student_count}
                        </p>
                        <div className="flex gap-2 flex-wrap mt-3">
                          {cls.courses.map((course) => (
                            <Badge key={course} variant="secondary">
                              {course}
                            </Badge>
                          ))}
                          {cls.levels.map((level) => (
                            <Badge key={level} variant="outline">
                              {level}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClass(cls)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClass(cls.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <EditClassModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingClass(null);
          }}
          classData={editingClass}
          onSuccess={handleEditSuccess}
          teachers={teachers}
          branches={branches}
          timings={timings}
          courseOptions={COURSE_OPTIONS}
          levelOptions={LEVEL_OPTIONS}
        />
      </div>
    </div>
  );
}
