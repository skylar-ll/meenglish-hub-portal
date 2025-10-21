import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InlineStudentField } from "@/components/admin/InlineStudentField";

interface Teacher {
  id: string;
  full_name: string;
}

interface Student {
  id: string;
  student_id: string;
  full_name_en: string;
  email: string;
  course_duration_months: number;
  total_course_fee: number;
  amount_paid: number;
  amount_remaining: number;
  discount_percentage: number;
  program: string;
  teachers?: Teacher[];
}

const StudentManagement = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
    fetchStudents();
    fetchTeachers();
    fetchCourses();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin/login");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast.error("Access denied");
      navigate("/admin/login");
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch teachers for each student
      const studentsWithTeachers = await Promise.all(
        (data || []).map(async (student) => {
          const { data: teacherLinks } = await supabase
            .from("student_teachers")
            .select("teacher_id")
            .eq("student_id", student.id);

          const teacherIds = teacherLinks?.map(link => link.teacher_id) || [];
          
          const { data: teacherData } = await supabase
            .from("teachers")
            .select("id, full_name")
            .in("id", teacherIds);

          return {
            ...student,
            teachers: teacherData || []
          };
        })
      );

      setStudents(studentsWithTeachers);
    } catch (error: any) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      toast.error("Failed to load teachers");
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("form_configurations")
        .select("config_key, config_value")
        .eq("config_type", "program")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      
      const courseOptions = (data || []).map(course => ({
        value: course.config_value,
        label: course.config_value
      }));
      
      setCourses(courseOptions);
    } catch (error: any) {
      toast.error("Failed to load courses");
    }
  };

  const handleFieldUpdate = async (studentId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ [field]: value })
        .eq("id", studentId);

      if (error) throw error;
      toast.success("Updated successfully");
      fetchStudents();
    } catch (error: any) {
      toast.error("Failed to update");
    }
  };

  const handleTeacherUpdate = async (studentId: string, selectedTeacherIds: string[]) => {
    try {
      // Delete existing assignments
      await supabase
        .from("student_teachers")
        .delete()
        .eq("student_id", studentId);

      // Insert new assignments
      if (selectedTeacherIds.length > 0) {
        const { error } = await supabase
          .from("student_teachers")
          .insert(
            selectedTeacherIds.map(teacherId => ({
              student_id: studentId,
              teacher_id: teacherId
            }))
          );

        if (error) throw error;
      }

      toast.success("Teachers updated successfully");
      fetchStudents();
    } catch (error: any) {
      toast.error("Failed to update teachers");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Student deleted successfully");
      fetchStudents();
    } catch (error: any) {
      toast.error("Failed to delete student");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Student Management
        </h1>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Student ID</th>
                    <th className="text-left p-3 font-semibold">Name</th>
                    <th className="text-left p-3 font-semibold">Email</th>
                    <th className="text-left p-3 font-semibold">Courses</th>
                    <th className="text-left p-3 font-semibold">Teachers</th>
                    <th className="text-left p-3 font-semibold">Duration</th>
                    <th className="text-left p-3 font-semibold">Total Fee</th>
                    <th className="text-left p-3 font-semibold">Paid</th>
                    <th className="text-left p-3 font-semibold">Remaining</th>
                    <th className="text-left p-3 font-semibold">Discount</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <span className="font-medium text-primary">{student.student_id || 'N/A'}</span>
                      </td>
                      <td className="p-3">
                        <InlineStudentField
                          value={student.full_name_en}
                          onSave={(value) => handleFieldUpdate(student.id, "full_name_en", value)}
                          type="text"
                        />
                      </td>
                      <td className="p-3">
                        <InlineStudentField
                          value={student.email}
                          onSave={(value) => handleFieldUpdate(student.id, "email", value)}
                          type="text"
                        />
                      </td>
                      <td className="p-3">
                        <InlineStudentField
                          value={student.program}
                          onSave={(value) => handleFieldUpdate(student.id, "program", value)}
                          type="select"
                          options={courses}
                        />
                      </td>
                      <td className="p-3">
                        <InlineStudentField
                          value={student.teachers?.map(t => t.full_name).join(", ") || "Not Assigned"}
                          onSave={(value) => {
                            const teacherIds = value.split(",").map(id => id.trim()).filter(Boolean);
                            handleTeacherUpdate(student.id, teacherIds);
                          }}
                          type="select"
                          options={teachers.map(t => ({ value: t.id, label: t.full_name }))}
                          isMulti={true}
                          selectedValues={student.teachers?.map(t => t.id) || []}
                        />
                      </td>
                      <td className="p-3">
                        <InlineStudentField
                          value={`${student.course_duration_months}m`}
                          onSave={(value) => handleFieldUpdate(student.id, "course_duration_months", parseInt(value))}
                          type="number"
                        />
                      </td>
                      <td className="p-3">
                        <InlineStudentField
                          value={`$${student.total_course_fee}`}
                          onSave={(value) => handleFieldUpdate(student.id, "total_course_fee", parseFloat(value))}
                          type="number"
                        />
                      </td>
                      <td className="p-3">
                        <InlineStudentField
                          value={`$${student.amount_paid}`}
                          onSave={(value) => handleFieldUpdate(student.id, "amount_paid", parseFloat(value))}
                          type="number"
                          className="text-success"
                        />
                      </td>
                      <td className="p-3">
                        <InlineStudentField
                          value={`$${student.amount_remaining}`}
                          onSave={(value) => handleFieldUpdate(student.id, "amount_remaining", parseFloat(value))}
                          type="number"
                          className="text-destructive"
                        />
                      </td>
                      <td className="p-3">
                        <InlineStudentField
                          value={`${student.discount_percentage}%`}
                          onSave={(value) => handleFieldUpdate(student.id, "discount_percentage", parseFloat(value))}
                          type="number"
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(student.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
