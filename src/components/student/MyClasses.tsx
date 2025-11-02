import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, BookOpen, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassInfo {
  id: string;
  class_name: string;
  timing: string;
  course_name: string;
  level?: string;
  teacher_name: string;
}

export const MyClasses = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    try {
      // Get current student
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("email", session.user.email)
        .single();

      if (!student) return;

      // Get student's classes
      const { data: classStudents, error: classStudentsError } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", student.id);

      if (classStudentsError) throw classStudentsError;

      if (!classStudents || classStudents.length === 0) {
        setLoading(false);
        return;
      }

      // Get class details
      const classIds = classStudents.map((cs) => cs.class_id);
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          timing,
          course_name,
          level,
          teacher_id,
          teachers (full_name)
        `)
        .in("id", classIds);

      if (classesError) throw classesError;

      const formattedClasses = classesData?.map((cls: any) => ({
        id: cls.id,
        class_name: cls.class_name,
        timing: cls.timing,
        course_name: cls.course_name,
        level: cls.level || "",
        teacher_name: cls.teachers?.full_name || "N/A",
      })) || [];

      setClasses(formattedClasses);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to load your classes");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading your classes...</div>
      </Card>
    );
  }

  if (classes.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          You are not enrolled in any classes yet.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">My Classes</h3>
      <div className="grid gap-4">
        {classes.map((classInfo) => (
          <Card key={classInfo.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-lg">{classInfo.class_name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{classInfo.timing}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>
                  {classInfo.course_name}
                  {classInfo.level && ` - ${classInfo.level}`}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-secondary" />
                <span>Teacher: {classInfo.teacher_name}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
