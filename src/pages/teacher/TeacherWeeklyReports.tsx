import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Student {
  id: string;
  full_name_en: string;
  phone1: string;
}

interface WeekSummary {
  p_count: number;
  l_count: number;
  vl_count: number;
  a_count: number;
  wa: number | null;
}

interface SentReport {
  id: string;
  student_name: string;
  week_number: number;
  created_at: string;
}

const TeacherWeeklyReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null);
  const [teacherComment, setTeacherComment] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [sentReports, setSentReports] = useState<SentReport[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStudent && selectedWeek) {
      loadWeekSummary();
    }
  }, [selectedStudent, selectedWeek, selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/teacher/login');
        return;
      }

      setTeacherId(session.user.id);

      // Get teacher name
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      if (teacherData) {
        setTeacherName(teacherData.full_name);
      }

      // Get students assigned to this teacher via student_teachers table
      const { data: studentTeachersData } = await supabase
        .from("student_teachers")
        .select("student_id")
        .eq("teacher_id", session.user.id);

      if (studentTeachersData && studentTeachersData.length > 0) {
        const studentIds = [...new Set(studentTeachersData.map(st => st.student_id))];

        const { data: studentsData } = await supabase
          .from("students")
          .select("id, full_name_en, phone1")
          .in("id", studentIds);

        setStudents(studentsData || []);
      }

      // Get sent reports
      const { data: reportsData } = await supabase
        .from("student_weekly_reports")
        .select("id, student_id, week_number, created_at")
        .eq("teacher_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (reportsData) {
        // Get student names for reports
        const studentIds = [...new Set(reportsData.map(r => r.student_id))];
        const { data: studentNames } = await supabase
          .from("students")
          .select("id, full_name_en")
          .in("id", studentIds);

        const nameMap = new Map(studentNames?.map(s => [s.id, s.full_name_en]) || []);

        setSentReports(reportsData.map(r => ({
          id: r.id,
          student_name: nameMap.get(r.student_id) || 'Unknown',
          week_number: r.week_number,
          created_at: r.created_at || '',
        })));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const loadWeekSummary = async () => {
    if (!selectedStudent || !selectedWeek) return;

    try {
      const weekNum = parseInt(selectedWeek);
      
      // Get attendance sheet data for this student and month
      const { data: sheetData } = await supabase
        .from("teacher_attendance_sheets")
        .select("*")
        .eq("student_id", selectedStudent)
        .eq("month_year", selectedMonth)
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (sheetData) {
        const weekKey = `week${weekNum}` as 'week1' | 'week2' | 'week3' | 'week4';
        const days = ['su', 'm', 'tu', 'w', 'th'];
        
        let p = 0, l = 0, vl = 0, a = 0;
        days.forEach(day => {
          const value = sheetData[`${weekKey}_${day}` as keyof typeof sheetData];
          if (value === 'P') p++;
          else if (value === 'L') l++;
          else if (value === 'VL') vl++;
          else if (value === 'A') a++;
        });

        const wa = sheetData[`${weekKey}_wa` as keyof typeof sheetData] as number | null;

        setWeekSummary({ p_count: p, l_count: l, vl_count: vl, a_count: a, wa });
      } else {
        setWeekSummary({ p_count: 0, l_count: 0, vl_count: 0, a_count: 0, wa: null });
      }
    } catch (error) {
      console.error('Error loading week summary:', error);
    }
  };

  const handleSendReport = async () => {
    if (!selectedStudent || !selectedWeek) {
      toast.error('Please select a student and week');
      return;
    }

    setSending(true);
    try {
      const weekNum = parseInt(selectedWeek);
      const studentName = students.find(s => s.id === selectedStudent)?.full_name_en || '';

      const reportData = {
        student_id: selectedStudent,
        teacher_id: teacherId,
        week_number: weekNum,
        report_date: new Date().toISOString().split('T')[0],
        teacher_name: teacherName,
        teacher_comments: teacherComment,
        weekly_p_count: weekSummary?.p_count || 0,
        weekly_l_count: weekSummary?.l_count || 0,
        weekly_vl_count: weekSummary?.vl_count || 0,
        weekly_a_count: weekSummary?.a_count || 0,
        weekly_assessment: weekSummary?.wa,
      };

      const { error } = await supabase
        .from("student_weekly_reports")
        .insert(reportData);

      if (error) throw error;

      toast.success('Weekly report sent successfully!');
      setIsModalOpen(false);
      setSelectedStudent("");
      setSelectedWeek("");
      setTeacherComment("");
      setWeekSummary(null);
      loadData();
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error('Failed to send report');
    }
    setSending(false);
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
      <div className="container max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/teacher/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Weekly Reports</h1>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Send Weekly Report</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Month Selection */}
                <div className="space-y-2">
                  <Label>Month</Label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>

                {/* Student Selection */}
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Week Selection */}
                <div className="space-y-2">
                  <Label>Select Week</Label>
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a week..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Week 1</SelectItem>
                      <SelectItem value="2">Week 2</SelectItem>
                      <SelectItem value="3">Week 3</SelectItem>
                      <SelectItem value="4">Week 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Week Summary (auto-filled) */}
                {weekSummary && (
                  <Card className="p-4 bg-muted/50">
                    <h4 className="font-semibold mb-3">Week Summary (Auto-filled)</h4>
                    <div className="grid grid-cols-5 gap-2 text-center text-sm">
                      <div className="p-2 rounded bg-success/20">
                        <div className="text-xs text-muted-foreground">Present</div>
                        <div className="font-bold text-success">{weekSummary.p_count}</div>
                      </div>
                      <div className="p-2 rounded bg-accent/20">
                        <div className="text-xs text-muted-foreground">Late</div>
                        <div className="font-bold text-accent">{weekSummary.l_count}</div>
                      </div>
                      <div className="p-2 rounded bg-secondary/20">
                        <div className="text-xs text-muted-foreground">Very Late</div>
                        <div className="font-bold text-secondary">{weekSummary.vl_count}</div>
                      </div>
                      <div className="p-2 rounded bg-destructive/20">
                        <div className="text-xs text-muted-foreground">Absent</div>
                        <div className="font-bold text-destructive">{weekSummary.a_count}</div>
                      </div>
                      <div className="p-2 rounded bg-primary/20">
                        <div className="text-xs text-muted-foreground">WA Grade</div>
                        <div className="font-bold text-primary">{weekSummary.wa ?? '-'}</div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Teacher Comment */}
                <div className="space-y-2">
                  <Label>Teacher Comment / Improvement Notes</Label>
                  <Textarea
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    placeholder="What should the student improve? Any notes for the week..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleSendReport} 
                  disabled={sending || !selectedStudent || !selectedWeek}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Weekly Report'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sent Reports List */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recently Sent Reports</h2>
          
          {sentReports.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No reports sent yet</p>
          ) : (
            <div className="space-y-3">
              {sentReports.map(report => (
                <div 
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{report.student_name}</p>
                      <p className="text-sm text-muted-foreground">Week {report.week_number}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(report.created_at), 'MMM dd, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TeacherWeeklyReports;
