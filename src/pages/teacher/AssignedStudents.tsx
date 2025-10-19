import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  class_type: string;
}

const AssignedStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTeacherAccess();
    fetchAssignedStudents();
  }, []);

  const checkTeacherAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/teacher/login");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "teacher") {
      toast.error("Access denied");
      navigate("/");
    }
  };

  const fetchAssignedStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/teacher/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <User className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            My Assigned Students
          </h1>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : students.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No students assigned yet</p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Total Fee</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-primary">{student.student_id || "N/A"}</TableCell>
                      <TableCell className="font-medium">{student.full_name_en}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.program}</TableCell>
                      <TableCell>{student.course_duration_months} months</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-primary" />
                          {student.total_course_fee.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-success">
                        ${student.amount_paid.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-destructive">
                        ${student.amount_remaining.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {student.discount_percentage > 0 ? (
                          <span className="text-success">{student.discount_percentage}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AssignedStudents;
