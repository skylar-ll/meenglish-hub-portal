import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserPlus, UserMinus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Student {
  id: string;
  full_name_en: string;
  email: string;
  program: string;
}

interface ClassWithStudents {
  id: string;
  class_name: string;
  timing: string;
  courses: string[];
  levels: string[];
  teacher: {
    id: string;
    full_name: string;
  };
  students: Student[];
}

export default function ClassEnrollmentManagement() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassWithStudents[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassWithStudents | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/admin/login");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      navigate("/admin/login");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all classes with teachers
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          timing,
          courses,
          levels,
          teacher_id,
          teachers!inner (
            id,
            full_name
          )
        `);

      if (classesError) throw classesError;

      // Fetch all class enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("class_students")
        .select(`
          class_id,
          student_id,
          students!inner (
            id,
            full_name_en,
            email,
            program
          )
        `);

      if (enrollmentsError) throw enrollmentsError;

      // Combine data
      const classesWithStudents = classesData.map((cls: any) => {
        const classEnrollments = enrollmentsData.filter(
          (e: any) => e.class_id === cls.id
        );
        
        return {
          id: cls.id,
          class_name: cls.class_name,
          timing: cls.timing,
          courses: cls.courses || [],
          levels: cls.levels || [],
          teacher: {
            id: cls.teachers.id,
            full_name: cls.teachers.full_name,
          },
          students: classEnrollments.map((e: any) => e.students),
        };
      });

      setClasses(classesWithStudents);

      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name_en, email, program")
        .order("full_name_en");

      if (studentsError) throw studentsError;
      setAllStudents(studentsData || []);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (studentId: string) => {
    if (!selectedClass) return;

    try {
      // Check if already enrolled
      const { data: existing } = await supabase
        .from("class_students")
        .select("id")
        .eq("class_id", selectedClass.id)
        .eq("student_id", studentId)
        .single();

      if (existing) {
        toast.error("Student is already enrolled in this class");
        return;
      }

      const { error } = await supabase
        .from("class_students")
        .insert({
          class_id: selectedClass.id,
          student_id: studentId,
        });

      if (error) throw error;

      toast.success("Student added to class successfully");
      fetchData();
      setShowAddStudentModal(false);
    } catch (error: any) {
      toast.error("Failed to add student: " + error.message);
    }
  };

  const handleRemoveStudent = async (classId: string, studentId: string) => {
    if (!confirm("Are you sure you want to remove this student from the class?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("class_students")
        .delete()
        .eq("class_id", classId)
        .eq("student_id", studentId);

      if (error) throw error;

      toast.success("Student removed from class successfully");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to remove student: " + error.message);
    }
  };

  const filteredClasses = classes.filter((cls) =>
    cls.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableStudents = allStudents.filter((student) => {
    if (!selectedClass) return false;
    
    const isAlreadyEnrolled = selectedClass.students.some(
      (s) => s.id === student.id
    );
    
    const matchesSearch = student.full_name_en
      .toLowerCase()
      .includes(studentSearchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearchQuery.toLowerCase());
    
    return !isAlreadyEnrolled && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate("/admin/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Class Enrollment Management</h1>
          <p className="text-muted-foreground">
            View and manage student enrollments in classes. Students are automatically enrolled based on their courses/levels.
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by class name or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {filteredClasses.map((cls) => (
            <Card key={cls.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{cls.class_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Teacher: {cls.teacher.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Timing: {cls.timing}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedClass(cls);
                    setShowAddStudentModal(true);
                    setStudentSearchQuery("");
                  }}
                  size="sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </div>

              <div className="mb-4">
                <div className="flex gap-2 flex-wrap">
                  {cls.courses.map((course, idx) => (
                    <Badge key={idx} variant="secondary">
                      {course}
                    </Badge>
                  ))}
                  {cls.levels.map((level, idx) => (
                    <Badge key={idx} variant="outline">
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium">
                    Enrolled Students ({cls.students.length})
                  </h4>
                </div>
                
                {cls.students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No students enrolled yet
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {cls.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{student.full_name_en}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.email} • {student.program}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStudent(cls.id, student.id)}
                        >
                          <UserMinus className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filteredClasses.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No classes found</p>
          </Card>
        )}
      </div>

      <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Add Student to {selectedClass?.class_name}
            </DialogTitle>
          </DialogHeader>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search students..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-2">
              {availableStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium">{student.full_name_en}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.email} • {student.program}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddStudent(student.id)}
                  >
                    Add
                  </Button>
                </div>
              ))}
              {availableStudents.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No available students found
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
