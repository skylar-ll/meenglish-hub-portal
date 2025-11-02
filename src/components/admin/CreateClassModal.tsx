import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    if (open) {
      fetchData();
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
      setSelectedStudents([]);
      setSelectedTeacher("");
      setClassName("");
      setTiming("");
      setCourseName("");
      setLevel("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
        </DialogHeader>

        {fetchingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
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
              <Button onClick={handleCreateClass} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Class
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
