import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";

interface Student {
  id: string;
  full_name_en: string;
  program: string;
  course_level: string;
  timing: string;
}

interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

interface CreateClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExistingClass {
  id: string;
  class_name: string;
  course_name: string;
  level: string;
  timing: string;
  teacher_id: string;
  teacher_name: string;
  student_ids: string[];
}

export const CreateClassModal = ({ open, onOpenChange }: CreateClassModalProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [className, setClassName] = useState("");
  const [timing, setTiming] = useState("");
  const [courseName, setCourseName] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [existingClasses, setExistingClasses] = useState<ExistingClass[]>([]);
  const [editingClass, setEditingClass] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
      fetchExistingClasses();
    }
  }, [open]);

  const fetchData = async () => {
    setFetchingData(true);
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name_en, program, course_level, timing")
        .order("full_name_en");

      if (studentsError) throw studentsError;

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("id, full_name, email")
        .order("full_name");

      if (teachersError) throw teachersError;

      setStudents(studentsData || []);
      setTeachers(teachersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load students and teachers");
    } finally {
      setFetchingData(false);
    }
  };

  const fetchExistingClasses = async () => {
    try {
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          course_name,
          level,
          timing,
          teacher_id,
          teachers (full_name)
        `);

      if (classesError) throw classesError;

      const classesWithStudents = await Promise.all(
        (classesData || []).map(async (cls) => {
          const { data: studentsData } = await supabase
            .from("class_students")
            .select("student_id")
            .eq("class_id", cls.id);

          return {
            id: cls.id,
            class_name: cls.class_name,
            course_name: cls.course_name,
            level: cls.level || "",
            timing: cls.timing,
            teacher_id: cls.teacher_id,
            teacher_name: (cls.teachers as any)?.full_name || "",
            student_ids: studentsData?.map((s) => s.student_id) || [],
          };
        })
      );

      setExistingClasses(classesWithStudents);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to load classes");
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const suggestTiming = () => {
    if (selectedStudents.length === 0) return "";
    
    const selectedStudentData = students.filter((s) =>
      selectedStudents.includes(s.id)
    );
    
    // Get most common timing from selected students
    const timings = selectedStudentData.map((s) => s.timing).filter(Boolean);
    if (timings.length === 0) return "";
    
    const timingCount: { [key: string]: number } = {};
    timings.forEach((t) => {
      timingCount[t] = (timingCount[t] || 0) + 1;
    });
    
    const mostCommon = Object.entries(timingCount).sort((a, b) => b[1] - a[1])[0];
    return mostCommon ? mostCommon[0] : "";
  };

  const suggestCourseAndLevel = () => {
    if (selectedStudents.length === 0) return { course: "", level: "" };
    
    const selectedStudentData = students.filter((s) =>
      selectedStudents.includes(s.id)
    );
    
    const programs = selectedStudentData.map((s) => s.program).filter(Boolean);
    const levels = selectedStudentData.map((s) => s.course_level).filter(Boolean);
    
    const mostCommonProgram = programs.length > 0 ? programs[0] : "";
    const mostCommonLevel = levels.length > 0 ? levels[0] : "";
    
    return { course: mostCommonProgram, level: mostCommonLevel };
  };

  useEffect(() => {
    if (selectedStudents.length > 0) {
      const suggested = suggestTiming();
      if (suggested && !timing) {
        setTiming(suggested);
      }
      
      const { course, level: suggestedLevel } = suggestCourseAndLevel();
      if (course && !courseName) {
        setCourseName(course);
      }
      if (suggestedLevel && !level) {
        setLevel(suggestedLevel);
      }
    }
  }, [selectedStudents]);

  const handleCreateClass = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }
    if (!selectedTeacher) {
      toast.error("Please select a teacher");
      return;
    }
    if (!className.trim()) {
      toast.error("Please enter a class name");
      return;
    }
    if (!timing.trim()) {
      toast.error("Please enter timing");
      return;
    }
    if (!courseName.trim()) {
      toast.error("Please enter a course name");
      return;
    }

    setLoading(true);
    try {
      // Create the class
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .insert({
          teacher_id: selectedTeacher,
          class_name: className,
          timing: timing,
          course_name: courseName,
          level: level || null,
        })
        .select()
        .single();

      if (classError) throw classError;

      // Add students to the class
      const classStudents = selectedStudents.map((studentId) => ({
        class_id: classData.id,
        student_id: studentId,
      }));

      const { error: studentsError } = await supabase
        .from("class_students")
        .insert(classStudents);

      if (studentsError) throw studentsError;

      // Also update student_teachers table for existing relationships
      for (const studentId of selectedStudents) {
        const { error: relationError } = await supabase
          .from("student_teachers")
          .upsert(
            {
              student_id: studentId,
              teacher_id: selectedTeacher,
            },
            { onConflict: "student_id,teacher_id" }
          );

        if (relationError) {
          console.error("Error updating student-teacher relationship:", relationError);
        }
      }

      toast.success("Class created successfully!");
      
      // Reset form
      resetForm();
      fetchExistingClasses();
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedStudents([]);
    setSelectedTeacher("");
    setClassName("");
    setTiming("");
    setCourseName("");
    setLevel("");
    setEditingClass(null);
  };

  const handleEditClass = (cls: ExistingClass) => {
    setEditingClass(cls.id);
    setClassName(cls.class_name);
    setCourseName(cls.course_name);
    setLevel(cls.level);
    setTiming(cls.timing);
    setSelectedTeacher(cls.teacher_id);
    setSelectedStudents(cls.student_ids);
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;

    if (!className.trim() || !courseName.trim() || !timing.trim() || !selectedTeacher || selectedStudents.length === 0) {
      toast.error("Please fill in all fields and select at least one student");
      return;
    }

    setLoading(true);
    try {
      // Update class
      const { error: classError } = await supabase
        .from("classes")
        .update({
          class_name: className,
          course_name: courseName,
          level: level || null,
          timing: timing,
          teacher_id: selectedTeacher,
        })
        .eq("id", editingClass);

      if (classError) throw classError;

      // Delete old class_students
      await supabase.from("class_students").delete().eq("class_id", editingClass);

      // Insert new class_students
      const classStudentsData = selectedStudents.map((studentId) => ({
        class_id: editingClass,
        student_id: studentId,
      }));

      const { error: classStudentsError } = await supabase
        .from("class_students")
        .insert(classStudentsData);

      if (classStudentsError) throw classStudentsError;

      // Update student_teachers
      for (const studentId of selectedStudents) {
        await supabase
          .from("student_teachers")
          .upsert(
            {
              student_id: studentId,
              teacher_id: selectedTeacher,
            },
            { onConflict: "student_id,teacher_id" }
          );
      }

      toast.success("Class updated successfully!");
      resetForm();
      fetchExistingClasses();
    } catch (error) {
      console.error("Error updating class:", error);
      toast.error("Failed to update class");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      const { error } = await supabase.from("classes").delete().eq("id", classId);

      if (error) throw error;

      toast.success("Class deleted successfully!");
      fetchExistingClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Classes</DialogTitle>
        </DialogHeader>

        {fetchingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create New Class</TabsTrigger>
              <TabsTrigger value="manage">Existing Classes</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6 mt-4">
              {editingClass && (
                <div className="bg-primary/10 p-3 rounded-md">
                  <p className="text-sm font-medium">Editing class</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="mt-1"
                  >
                    Cancel editing
                  </Button>
                </div>
              )}
            {/* Class Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="className">Class Name</Label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g., English Level 1 - Morning Group"
                />
              </div>

              <div>
                <Label htmlFor="courseName">Course Name</Label>
                <Input
                  id="courseName"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g., English, Spanish"
                />
              </div>

              <div>
                <Label htmlFor="level">Level (Optional)</Label>
                <Input
                  id="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  placeholder="e.g., Level 1, Beginner"
                />
              </div>

              <div>
                <Label htmlFor="timing">Timing</Label>
                <Input
                  id="timing"
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                  placeholder="e.g., 4:30 PM - 5:30 PM"
                />
              </div>

              <div>
                <Label htmlFor="teacher">Select Teacher</Label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Student Selection */}
            <div className="space-y-2">
              <Label>Select Students</Label>
              <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto space-y-3">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-start space-x-3 p-2 hover:bg-accent rounded-md"
                  >
                    <Checkbox
                      id={student.id}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                    />
                    <label
                      htmlFor={student.id}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <div className="font-medium">{student.full_name_en}</div>
                      <div className="text-muted-foreground">
                        {student.program && `Course: ${student.program}`}
                        {student.course_level && ` • Level: ${student.course_level}`}
                        {student.timing && ` • Preferred Time: ${student.timing}`}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Selected: {selectedStudents.length} student(s)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={editingClass ? handleUpdateClass : handleCreateClass} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingClass ? "Update Class" : "Create Class"}
              </Button>
            </div>
            </TabsContent>

            <TabsContent value="manage" className="space-y-4 mt-4">
              {existingClasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No classes created yet
                </div>
              ) : (
                <div className="space-y-3">
                  {existingClasses.map((cls) => (
                    <Card key={cls.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{cls.class_name}</h3>
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p><span className="font-medium">Course:</span> {cls.course_name} {cls.level && `- ${cls.level}`}</p>
                              <p><span className="font-medium">Timing:</span> {cls.timing}</p>
                              <p><span className="font-medium">Teacher:</span> {cls.teacher_name}</p>
                              <p><span className="font-medium">Students:</span> {cls.student_ids.length}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClass(cls)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClass(cls.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
