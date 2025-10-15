import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, FileText, BookOpen, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TeacherDetail = () => {
  const navigate = useNavigate();
  const { teacherId } = useParams();
  const [teacher, setTeacher] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!teacherId) return;

      try {
        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .select("*")
          .eq("id", teacherId)
          .single();

        if (teacherError) throw teacherError;
        setTeacher(teacherData);

        const { data: schedulesData } = await supabase
          .from("teacher_schedules")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false });
        setSchedules(schedulesData || []);

        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false });
        setQuizzes(quizzesData || []);

        // Fetch student reports by this teacher
        const { data: reportsData } = await supabase
          .from("student_weekly_reports")
          .select(`
            *,
            student:students(
              id,
              full_name_en,
              full_name_ar,
              email,
              phone1,
              course_level
            )
          `)
          .eq("teacher_id", teacherId)
          .order("report_date", { ascending: false });
        setReports(reportsData || []);

        // Fetch students assigned to this teacher
        const { data: studentsData } = await supabase
          .from("students")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false });
        setStudents(studentsData || []);

        // Update teacher's student count
        const { count } = await supabase
          .from("students")
          .select("*", { count: 'exact', head: true })
          .eq("teacher_id", teacherId);
        
        setTeacher({ ...teacherData, student_count: count || 0 });

      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load teacher details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teacherId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!teacher) {
    return <div className="min-h-screen flex items-center justify-center">Teacher not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-6xl mx-auto py-8">
        <Button variant="ghost" onClick={() => navigate("/admin/dashboard")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{teacher.full_name}</h1>
          <p className="text-muted-foreground">{teacher.email}</p>
        </div>

        <Card className="p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{teacher.phone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Courses Assigned</p>
              <p className="font-medium">{teacher.courses_assigned || "None"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Student Count</p>
              <p className="font-medium">{teacher.student_count || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <Tabs defaultValue="schedule">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="reports">Student Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule">
              <h2 className="text-2xl font-bold mb-4">Teaching Schedule</h2>
              {schedules.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No schedule available</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>{schedule.course_name}</TableCell>
                        <TableCell>{schedule.level}</TableCell>
                        <TableCell>{schedule.day_of_week}</TableCell>
                        <TableCell>{schedule.time_slot}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="quizzes">
              <h2 className="text-2xl font-bold mb-4">Created Quizzes</h2>
              {quizzes.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No quizzes created yet</p>
              ) : (
                <div className="space-y-3">
                  {quizzes.map((quiz) => (
                    <Card key={quiz.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{quiz.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {quiz.total_points} points • {quiz.is_published ? "Published" : "Draft"}
                          </p>
                        </div>
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="lessons">
              <h2 className="text-2xl font-bold mb-4">Uploaded Lessons</h2>
              <p className="text-center py-8 text-muted-foreground">Lessons feature coming soon</p>
            </TabsContent>

            <TabsContent value="reports">
              <h2 className="text-2xl font-bold mb-4">Student Reports</h2>
              {reports.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No reports submitted yet</p>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <Card key={report.id} className="p-6 border-2">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {report.student?.full_name_en}
                          </h3>
                          <p className="text-sm text-muted-foreground" dir="rtl">
                            {report.student?.full_name_ar}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {report.student?.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">Week {report.week_number}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(report.report_date).toLocaleDateString('en-US', { 
                              month: 'short', day: 'numeric', year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Course</p>
                          <p className="font-medium">{report.course_name || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Level</p>
                          <p className="font-medium">{report.level || "N/A"}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-semibold mb-2">Skills Ratings:</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span>Vocabulary:</span>
                            <span className="font-medium">{report.vocabulary_rating}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Grammar:</span>
                            <span className="font-medium">{report.grammar_rating}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Reading:</span>
                            <span className="font-medium">{report.reading_rating}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Writing:</span>
                            <span className="font-medium">{report.writing_rating}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Speaking:</span>
                            <span className="font-medium">{report.speaking_rating}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Attendance:</span>
                            <span className="font-medium">{report.attendance_rating}/5</span>
                          </div>
                        </div>
                      </div>

                      {report.teacher_comments && (
                        <div className="border-t pt-4">
                          <p className="text-sm font-semibold mb-2">Comments:</p>
                          <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded">
                            {report.teacher_comments}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDetail;
