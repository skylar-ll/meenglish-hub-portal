import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClassStudentsListProps {
  classId: string;
}

export const ClassStudentsList = ({ classId }: ClassStudentsListProps) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassStudents();
  }, [classId]);

  const fetchClassStudents = async () => {
    try {
      // Get enrollments for this class
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId);

      if (!enrollments || enrollments.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = enrollments.map((e) => e.student_id);

      // Get student profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name_en, full_name_ar, phone1, course_level")
        .in("id", studentIds);

      setStudents(profiles || []);
    } catch (error) {
      console.error("Error fetching class students:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Loading students...</p>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <p className="text-sm">No students enrolled yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" />
        <h4 className="font-semibold">Enrolled Students ({students.length})</h4>
      </div>
      <div className="space-y-2">
        {students.map((student) => (
          <div
            key={student.id}
            className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
          >
            <div>
              <p className="font-medium text-sm">{student.full_name_en}</p>
              <p className="text-xs text-muted-foreground" dir="rtl">
                {student.full_name_ar}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {student.course_level && (
                <Badge variant="outline" className="text-xs">
                  {student.course_level}
                </Badge>
              )}
              {student.phone1 && (
                <span className="text-xs text-muted-foreground">
                  {student.phone1}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
