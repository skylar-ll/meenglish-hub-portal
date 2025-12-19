import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface WeeklyReport {
  id: string;
  week_number: number;
  report_date: string;
  teacher_name: string | null;
  teacher_comments: string | null;
  weekly_p_count: number | null;
  weekly_l_count: number | null;
  weekly_vl_count: number | null;
  weekly_a_count: number | null;
  weekly_assessment: number | null;
}

const StudentWeeklyReportsView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);

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

      // Get weekly reports
      const { data: reportsData } = await supabase
        .from("student_weekly_reports")
        .select("id, week_number, report_date, teacher_name, teacher_comments, weekly_p_count, weekly_l_count, weekly_vl_count, weekly_a_count, weekly_assessment")
        .eq("student_id", studentData.id)
        .order("report_date", { ascending: false });

      setReports(reportsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load reports');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading reports...</p>
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
          <h1 className="text-2xl font-bold">Weekly Reports</h1>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Weekly Reports Yet</h2>
            <p className="text-muted-foreground">
              Your teacher will send you weekly progress reports here.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <Card 
                key={report.id}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-primary/20">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Week {report.week_number} Report</h3>
                      <p className="text-sm text-muted-foreground">
                        By {report.teacher_name || 'Teacher'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(report.report_date), 'MMM dd, yyyy')}
                  </div>
                </div>

                {/* Quick Summary */}
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-success"></span>
                    <span>P: {report.weekly_p_count ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-accent"></span>
                    <span>L: {report.weekly_l_count ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-secondary"></span>
                    <span>VL: {report.weekly_vl_count ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-destructive"></span>
                    <span>A: {report.weekly_a_count ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="font-semibold">WA:</span>
                    <span className="text-primary font-bold">{report.weekly_assessment ?? '-'}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Report Detail Modal */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Week {selectedReport?.week_number} Report</DialogTitle>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-6 mt-4">
                {/* Teacher Info */}
                <div className="text-sm text-muted-foreground">
                  <p>From: {selectedReport.teacher_name || 'Your Teacher'}</p>
                  <p>Date: {format(new Date(selectedReport.report_date), 'MMMM dd, yyyy')}</p>
                </div>

                {/* Attendance Summary */}
                <Card className="p-4 bg-muted/50">
                  <h4 className="font-semibold mb-3">Attendance Summary</h4>
                  <div className="grid grid-cols-5 gap-2 text-center text-sm">
                    <div className="p-2 rounded bg-success/20">
                      <div className="text-xs text-muted-foreground">Present</div>
                      <div className="font-bold text-success">{selectedReport.weekly_p_count ?? 0}</div>
                    </div>
                    <div className="p-2 rounded bg-accent/20">
                      <div className="text-xs text-muted-foreground">Late</div>
                      <div className="font-bold text-accent">{selectedReport.weekly_l_count ?? 0}</div>
                    </div>
                    <div className="p-2 rounded bg-secondary/20">
                      <div className="text-xs text-muted-foreground">Very Late</div>
                      <div className="font-bold text-secondary">{selectedReport.weekly_vl_count ?? 0}</div>
                    </div>
                    <div className="p-2 rounded bg-destructive/20">
                      <div className="text-xs text-muted-foreground">Absent</div>
                      <div className="font-bold text-destructive">{selectedReport.weekly_a_count ?? 0}</div>
                    </div>
                    <div className="p-2 rounded bg-primary/20">
                      <div className="text-xs text-muted-foreground">WA Grade</div>
                      <div className="font-bold text-primary">{selectedReport.weekly_assessment ?? '-'}</div>
                    </div>
                  </div>
                </Card>

                {/* Teacher Comments */}
                {selectedReport.teacher_comments && (
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold">Teacher's Feedback</h4>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.teacher_comments}</p>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentWeeklyReportsView;
