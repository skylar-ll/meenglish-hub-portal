import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TeacherDetail = () => {
  const navigate = useNavigate();
  const { teacherId } = useParams();
  const [teacher, setTeacher] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
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
          .eq("teacher_id", teacherId);
        setSchedules(schedulesData || []);

        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("teacher_id", teacherId);
        setQuizzes(quizzesData || []);

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
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
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
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDetail;
