import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, BookOpen, User, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassInfo {
  id: string;
  class_name: string;
  timing: string;
  course_name: string;
  level?: string;
  teacher_name: string;
  start_date?: string;
  branch_name?: string;
}

export const MyClasses = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyClasses();
    
    // Set up realtime subscription for class updates
    const channel = supabase
      .channel('classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes'
        },
        () => {
          fetchMyClasses(); // Refetch when classes are updated
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        .maybeSingle();

      if (!student) return;

      // Get student's classes
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", student.id);

      if (enrollmentsError) throw enrollmentsError;

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      // Get class details
      const classIds = enrollments.map((e) => e.class_id);
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          timing,
          courses,
          levels,
          teacher_id,
          start_date,
          branch_id,
          branches (name_en, name_ar),
          teachers (full_name)
        `)
        .in("id", classIds);

      if (classesError) throw classesError;

      const formattedClasses = classesData?.map((cls: any) => ({
        id: cls.id,
        class_name: cls.class_name,
        timing: cls.timing,
        course_name: cls.courses?.join(", ") || "N/A",
        level: cls.levels?.join(", ") || undefined,
        teacher_name: cls.teachers?.full_name || "N/A",
        start_date: cls.start_date || undefined,
        branch_name: cls.branches?.name_en || "N/A",
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
          <Card key={classInfo.id} className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg text-primary">{classInfo.class_name}</h4>
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  {classInfo.timing}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Courses:</span>
                  <span className="font-medium">{classInfo.course_name}</span>
                </div>

                {classInfo.level && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-secondary" />
                    <span className="text-muted-foreground">Levels:</span>
                    <span className="font-medium">{classInfo.level}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-accent" />
                  <span className="text-muted-foreground">Teacher:</span>
                  <span className="font-medium">{classInfo.teacher_name}</span>
                </div>

                {classInfo.branch_name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Branch:</span>
                    <span className="font-medium">{classInfo.branch_name}</span>
                  </div>
                )}

                {classInfo.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-secondary" />
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium">{new Date(classInfo.start_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
