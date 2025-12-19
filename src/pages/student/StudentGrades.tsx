import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GradeData {
  id: string;
  month_year: string;
  week1_wa: number | null;
  week2_wa: number | null;
  week3_wa: number | null;
  week4_wa: number | null;
  overall_v: number | null;
  teachers_evaluation: number | null;
  final_grades: number | null;
  equivalent: string | null;
  status: string | null;
  notes: string | null;
  // Monthly totals
  monthly_p: number;
  monthly_l: number;
  monthly_vl: number;
  monthly_a: number;
}

const StudentGrades = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<GradeData[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/student/login');
        return;
      }

      // Get student info
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("email", session.user.email)
        .single();

      if (!studentData) {
        toast.error("Student record not found");
        navigate('/student/login');
        return;
      }

      // Get attendance sheets with grades
      const { data: sheetsData } = await supabase
        .from("teacher_attendance_sheets")
        .select("*")
        .eq("student_id", studentData.id)
        .order("month_year", { ascending: false });

      if (sheetsData) {
        const formattedGrades: GradeData[] = sheetsData.map(sheet => {
          // Calculate monthly totals
          const allDays = [1, 2, 3, 4].flatMap(w => {
            return ['su', 'm', 'tu', 'w', 'th'].map(d => 
              sheet[`week${w}_${d}` as keyof typeof sheet]
            );
          });

          return {
            id: sheet.id,
            month_year: sheet.month_year,
            week1_wa: sheet.week1_wa as number | null,
            week2_wa: sheet.week2_wa as number | null,
            week3_wa: sheet.week3_wa as number | null,
            week4_wa: sheet.week4_wa as number | null,
            overall_v: sheet.overall_v as number | null,
            teachers_evaluation: sheet.teachers_evaluation as number | null,
            final_grades: sheet.final_grades as number | null,
            equivalent: sheet.equivalent,
            status: sheet.status,
            notes: sheet.notes,
            monthly_p: allDays.filter(d => d === 'P').length,
            monthly_l: allDays.filter(d => d === 'L').length,
            monthly_vl: allDays.filter(d => d === 'VL').length,
            monthly_a: allDays.filter(d => d === 'A').length,
          };
        });

        setGrades(formattedGrades);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load grades');
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'Passed') {
      return <Badge className="bg-success text-success-foreground">Passed</Badge>;
    } else if (status === 'Repeat') {
      return <Badge className="bg-destructive text-destructive-foreground">Repeat</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const formatMonth = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading grades...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/student/course")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Grades</h1>
        </div>

        {/* Grades List */}
        {grades.length === 0 ? (
          <Card className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Grades Yet</h2>
            <p className="text-muted-foreground">
              Your grades will appear here once your teacher enters them.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {grades.map(grade => (
              <Card key={grade.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">{formatMonth(grade.month_year)}</h3>
                  </div>
                  {getStatusBadge(grade.status)}
                </div>

                {/* Weekly Assessments */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[1, 2, 3, 4].map(week => {
                    const wa = grade[`week${week}_wa` as keyof typeof grade] as number | null;
                    return (
                      <div key={week} className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">Week {week}</div>
                        <div className="text-xl font-bold text-primary">
                          {wa !== null ? wa : '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">WA</div>
                      </div>
                    );
                  })}
                </div>

                {/* Attendance Summary */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  <div className="text-center p-2 rounded bg-success/20">
                    <div className="text-xs text-muted-foreground">Present</div>
                    <div className="font-bold text-success">{grade.monthly_p}</div>
                  </div>
                  <div className="text-center p-2 rounded bg-accent/20">
                    <div className="text-xs text-muted-foreground">Late</div>
                    <div className="font-bold text-accent">{grade.monthly_l}</div>
                  </div>
                  <div className="text-center p-2 rounded bg-secondary/20">
                    <div className="text-xs text-muted-foreground">Very Late</div>
                    <div className="font-bold text-secondary">{grade.monthly_vl}</div>
                  </div>
                  <div className="text-center p-2 rounded bg-destructive/20">
                    <div className="text-xs text-muted-foreground">Absent</div>
                    <div className="font-bold text-destructive">{grade.monthly_a}</div>
                  </div>
                </div>

                {/* Overall Grades */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Teacher Evaluation</div>
                    <div className="text-lg font-semibold">
                      {grade.teachers_evaluation !== null ? `${grade.teachers_evaluation}/20` : '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Final Grade</div>
                    <div className="text-lg font-semibold">
                      {grade.final_grades !== null ? grade.final_grades : '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Equivalent</div>
                    <div className="text-lg font-semibold text-primary">
                      {grade.equivalent || '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">V</div>
                    <div className="text-lg font-semibold">
                      {grade.overall_v !== null ? grade.overall_v : '-'}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {grade.notes && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">Notes</div>
                    <p className="text-sm">{grade.notes}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentGrades;
