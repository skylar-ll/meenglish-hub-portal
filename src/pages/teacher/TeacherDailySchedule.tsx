import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Clock, Users, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ClassData {
  id: string;
  class_name: string;
  timing: string;
  levels: string[];
  courses: string[];
  branch_name: string;
  students: { id: string; full_name_en: string }[];
  is_completed: boolean;
}

const TeacherDailySchedule = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    checkAuthAndFetch();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('daily-schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_class_status' }, () => {
        fetchClasses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/teacher/login');
      return;
    }
    await fetchClasses();
  };

  const fetchClasses = async () => {
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch classes assigned to this teacher
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select(`
        id,
        class_name,
        timing,
        levels,
        courses,
        branches!classes_branch_id_fkey (name_en)
      `)
      .eq("teacher_id", session.user.id)
      .eq("status", "active")
      .order("timing");

    if (classesError) {
      console.error("Error fetching classes:", classesError);
      setLoading(false);
      return;
    }

    // Fetch today's completion status
    const { data: statusData } = await supabase
      .from("daily_class_status")
      .select("class_id, is_completed")
      .eq("teacher_id", session.user.id)
      .eq("date", today);

    const statusMap = new Map(
      (statusData || []).map(s => [s.class_id, s.is_completed])
    );

    // Fetch students for each class
    const formattedClasses: ClassData[] = [];
    
    for (const cls of classesData || []) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", cls.id);

      const studentIds = (enrollments || []).map(e => e.student_id);
      let students: { id: string; full_name_en: string }[] = [];
      
      if (studentIds.length > 0) {
        const { data: studentData } = await supabase
          .from("students")
          .select("id, full_name_en")
          .in("id", studentIds);
        students = studentData || [];
      }

      formattedClasses.push({
        id: cls.id,
        class_name: cls.class_name,
        timing: cls.timing,
        levels: cls.levels || [],
        courses: cls.courses || [],
        branch_name: (cls as any).branches?.name_en || "Unknown",
        students,
        is_completed: statusMap.get(cls.id) || false,
      });
    }

    setClasses(formattedClasses);
    setLoading(false);
  };

  const handleMarkComplete = async (classId: string) => {
    setMarking(classId);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Not authenticated");
      setMarking(null);
      return;
    }

    // Check if status already exists for today
    const { data: existing } = await supabase
      .from("daily_class_status")
      .select("id")
      .eq("class_id", classId)
      .eq("teacher_id", session.user.id)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("daily_class_status")
        .update({ 
          is_completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to mark class as complete");
      } else {
        toast.success("Class marked as complete!");
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from("daily_class_status")
        .insert({
          class_id: classId,
          teacher_id: session.user.id,
          date: today,
          is_completed: true,
          completed_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error inserting status:", error);
        toast.error("Failed to mark class as complete");
      } else {
        toast.success("Class marked as complete!");
      }
    }

    // Update local state
    setClasses(prev => 
      prev.map(c => c.id === classId ? { ...c, is_completed: true } : c)
    );
    setMarking(null);
  };

  const completedCount = classes.filter(c => c.is_completed).length;
  const totalCount = classes.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Button variant="ghost" onClick={() => navigate("/teacher/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Today's Schedule
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <Button variant="outline" onClick={fetchClasses} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Progress */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Today's Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedCount} / {totalCount} classes completed
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${
                completedCount === totalCount && totalCount > 0 
                  ? 'bg-green-500' 
                  : 'bg-primary'
              }`}
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          {completedCount === totalCount && totalCount > 0 && (
            <p className="text-green-600 font-semibold mt-2 text-center">
              🎉 All classes completed for today!
            </p>
          )}
        </Card>

        {/* Classes List */}
        {classes.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No classes scheduled for today.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {classes.map((cls, index) => (
              <Card 
                key={cls.id} 
                className={`p-6 animate-slide-up transition-all ${
                  cls.is_completed 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'hover:shadow-lg'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Class Name & Timing */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold">{cls.class_name}</h3>
                      {cls.is_completed && (
                        <Badge className="bg-green-500 text-white">
                          <Check className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>

                    {/* Timing & Branch */}
                    <div className="flex items-center gap-4 text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {cls.timing}
                      </span>
                      <Badge variant="outline">{cls.branch_name}</Badge>
                    </div>

                    {/* Levels & Courses */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {cls.levels.map((level, i) => {
                        const match = level.match(/\(([^)]+)\)/);
                        const shortName = match ? match[1] : level.split(' ')[0];
                        return (
                          <Badge key={i} variant="secondary" className={cls.is_completed ? 'bg-green-600 text-white' : ''}>
                            {shortName}
                          </Badge>
                        );
                      })}
                      {cls.courses.map((course, i) => (
                        <Badge key={i} variant="outline">
                          {course.split(' ')[0]}
                        </Badge>
                      ))}
                    </div>

                    {/* Students */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{cls.students.length} students:</span>
                      <span className="truncate">
                        {cls.students.map(s => s.full_name_en).join(", ") || "No students enrolled"}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="ml-4">
                    {cls.is_completed ? (
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleMarkComplete(cls.id)}
                        disabled={marking === cls.id}
                        className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                      >
                        {marking === cls.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDailySchedule;
