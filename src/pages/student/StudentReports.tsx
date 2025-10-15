import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const StudentReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/student/login");
          return;
        }

        const { data: student } = await supabase
          .from("students")
          .select("*")
          .eq("email", session.user.email)
          .single();

        if (!student) {
          toast.error("Student record not found");
          return;
        }

        setStudentInfo(student);

        const { data: reportsData, error } = await supabase
          .from("student_weekly_reports")
          .select("*")
          .eq("student_id", student.id)
          .order("week_number", { ascending: false });

        if (error) throw error;
        setReports(reportsData || []);
      } catch (error: any) {
        console.error("Error fetching reports:", error);
        toast.error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const calculateAttendancePercentage = () => {
    if (!reports.length) return 0;
    const total = reports.reduce((sum, r) => sum + (r.attendance_rating || 0), 0);
    return ((total / (reports.length * 5)) * 100).toFixed(1);
  };

  const calculateOverallAverage = () => {
    if (!reports.length) return 0;
    const skillRatings = reports.flatMap(r => [
      r.vocabulary_rating,
      r.grammar_rating,
      r.reading_rating,
      r.writing_rating,
      r.speaking_rating,
    ].filter(Boolean));
    
    if (!skillRatings.length) return 0;
    const avg = skillRatings.reduce((sum, val) => sum + val, 0) / skillRatings.length;
    return ((avg / 5) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-6xl mx-auto py-8">
        <Button variant="ghost" onClick={() => navigate("/student/course")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Course
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            My Weekly Reports
          </h1>
          <p className="text-muted-foreground">{studentInfo?.full_name_en}</p>
        </div>

        {/* Summary Card */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-card to-muted/20">
          <h2 className="text-xl font-semibold mb-4">Performance Summary</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{reports.length}</p>
              <p className="text-sm text-muted-foreground">Total Reports</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">{calculateOverallAverage()}%</p>
              <p className="text-sm text-muted-foreground">Overall Average</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-accent">{calculateAttendancePercentage()}%</p>
              <p className="text-sm text-muted-foreground">Attendance</p>
            </div>
          </div>
        </Card>

        {/* Reports List */}
        {reports.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No reports available yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your teacher will submit weekly reports here
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">Week {report.week_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.report_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Teacher: {report.teacher_name}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>

                {/* Course Info */}
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Course</p>
                      <p className="font-medium">{report.course_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Level</p>
                      <p className="font-medium">{report.level || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Grade</p>
                      <p className="font-medium">{report.current_grade ? `${report.current_grade}%` : "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Skill Ratings */}
                <div className="mb-4">
                  <h4 className="font-semibold mb-3">Skills Performance</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {[
                      { label: "Vocabulary", value: report.vocabulary_rating },
                      { label: "Grammar", value: report.grammar_rating },
                      { label: "Reading", value: report.reading_rating },
                      { label: "Writing", value: report.writing_rating },
                      { label: "Speaking", value: report.speaking_rating },
                      { label: "Attendance", value: report.attendance_rating },
                    ].map((skill) => (
                      <div key={skill.label} className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">{skill.label}</p>
                        <Badge variant={skill.value >= 4 ? "default" : skill.value >= 3 ? "secondary" : "outline"}>
                          {skill.value}/5
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exam Scores */}
                {(report.exam_1_score || report.exam_2_score || report.exam_3_score || report.exam_4_score) && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-3">Exam Scores</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map((num) => {
                        const score = (report as any)[`exam_${num}_score`];
                        return score ? (
                          <div key={num} className="text-center p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Exam {num}</p>
                            <p className="font-bold text-lg">{score}%</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {(report.teacher_comments || report.teacher_notes) && (
                  <div className="space-y-3">
                    {report.teacher_comments && (
                      <div>
                        <h4 className="font-semibold mb-2">Teacher Comments</h4>
                        <p className="text-sm bg-muted/30 p-3 rounded-lg">{report.teacher_comments}</p>
                      </div>
                    )}
                    {report.teacher_notes && (
                      <div>
                        <h4 className="font-semibold mb-2">Teacher Notes</h4>
                        <p className="text-sm bg-muted/30 p-3 rounded-lg">{report.teacher_notes}</p>
                      </div>
                    )}
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

export default StudentReports;
