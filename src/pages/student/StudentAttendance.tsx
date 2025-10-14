import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function StudentAttendance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  useEffect(() => {
    checkAttendanceStatus();
  }, []);

  const checkAttendanceStatus = async () => {
    const studentData = sessionStorage.getItem("studentData");
    if (!studentData) {
      navigate("/student/login");
      return;
    }

    const student = JSON.parse(studentData);
    setStudentInfo(student);

    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", student.id)
      .eq("date", today)
      .maybeSingle();

    if (data) {
      setAlreadyMarked(true);
    }
  };

  const markAttendance = async (status: 'present' | 'absent') => {
    if (!studentInfo) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();

      const { error } = await supabase
        .from("attendance")
        .upsert({
          student_id: studentInfo.id,
          date: today,
          status: status,
          marked_by: 'student',
          class_time: `${currentHour}:00`
        }, {
          onConflict: 'student_id,date,class_time'
        });

      if (error) throw error;

      toast({
        title: "Attendance Marked",
        description: `You have been marked as ${status}`,
      });

      setAlreadyMarked(true);
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/student/course")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">Mark Attendance</h1>
        </div>

        <Card className="p-8">
          {studentInfo && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">{studentInfo.full_name_en}</h2>
              <p className="text-muted-foreground" dir="rtl">{studentInfo.full_name_ar}</p>
            </div>
          )}

          {alreadyMarked ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success" />
              <h3 className="text-xl font-semibold mb-2">Attendance Already Marked</h3>
              <p className="text-muted-foreground">
                You have already marked your attendance for today.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center mb-6 text-muted-foreground">
                Please mark your attendance for today's class
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  onClick={() => markAttendance('present')}
                  disabled={loading}
                  className="h-24 flex flex-col gap-2"
                >
                  <CheckCircle className="w-8 h-8" />
                  <span>Present</span>
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => markAttendance('absent')}
                  disabled={loading}
                  className="h-24 flex flex-col gap-2"
                >
                  <XCircle className="w-8 h-8" />
                  <span>Absent</span>
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="mt-6 p-6 bg-muted/50">
          <h3 className="font-semibold mb-2">⏰ Important Notice</h3>
          <p className="text-sm text-muted-foreground">
            Please mark your attendance before the class deadline. If you don't mark yourself present by the deadline, 
            your teacher will mark you as absent.
          </p>
        </Card>
      </div>
    </div>
  );
}
