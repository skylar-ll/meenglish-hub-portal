import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  teacher_id: string | null;
  program: string;
}

const StudentManagement = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    amount_paid: 0,
    discount_percentage: 0,
    teacher_id: null as string | null,
  });

  useEffect(() => {
    checkAdminAccess();
    fetchStudents();
    fetchTeachers();
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
      setStudents(data || []);
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

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      amount_paid: student.amount_paid,
      discount_percentage: student.discount_percentage,
      teacher_id: student.teacher_id,
    });
  };

  const handleUpdate = async () => {
    if (!editingStudent) return;

    try {
      const { error } = await supabase
        .from("students")
        .update({
          amount_paid: formData.amount_paid,
          discount_percentage: formData.discount_percentage,
          teacher_id: formData.teacher_id,
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      toast.success("Student updated successfully");
      setEditingStudent(null);
      fetchStudents();
    } catch (error: any) {
      toast.error("Failed to update student");
    }
  };

  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return "Not Assigned";
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.full_name || "Unknown";
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Total Fee</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-primary">{student.student_id}</TableCell>
                      <TableCell className="font-medium">{student.full_name_en}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell className="text-sm">{student.program}</TableCell>
                      <TableCell className="font-medium text-primary">{getTeacherName(student.teacher_id)}</TableCell>
                      <TableCell>{student.course_duration_months}m</TableCell>
                      <TableCell>${student.total_course_fee}</TableCell>
                      <TableCell className="text-success">${student.amount_paid}</TableCell>
                      <TableCell className="text-destructive">${student.amount_remaining}</TableCell>
                      <TableCell>{student.discount_percentage}%</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(student)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(student.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Edit Student Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="teacher">Assigned Teacher</Label>
                <select
                  id="teacher"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                  value={formData.teacher_id || ""}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value || null })}
                >
                  <option value="">Not Assigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="amount_paid">Amount Paid ($)</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="discount">Discount Percentage (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                />
              </div>
              <Button onClick={handleUpdate} className="w-full">
                Update Student Details
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentManagement;
