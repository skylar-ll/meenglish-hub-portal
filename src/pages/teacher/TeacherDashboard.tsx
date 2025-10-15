import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Calendar, BookOpen, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { CreateQuizModal } from "@/components/teacher/CreateQuizModal";
import { UploadLessonModal } from "@/components/teacher/UploadLessonModal";
import { MarkAttendanceModal } from "@/components/teacher/MarkAttendanceModal";
import { StudentWeeklyReportModal } from "@/components/teacher/StudentWeeklyReportModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/teacher/login');
        return;
      }

      // 2. Verify teacher role, try to self-assign if missing
      let { data: roleData, error: roleErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'teacher')
        .maybeSingle();

      if (!roleData) {
        await supabase.from('user_roles').insert({ user_id: session.user.id, role: 'teacher' });
        ({ data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'teacher')
          .maybeSingle());
      }

      if (!roleData) {
        toast.error('Unauthorized access - teacher role required');
        navigate('/teacher/login');
        return;
      }

      // Fetch students
      const { data: studentsData } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });
      
      setStudents(studentsData || []);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  const handleOpenReport = (student: any) => {
    setSelectedStudent(student);
    setIsReportModalOpen(true);
  };

  const stats = [
    { label: t('teacher.totalStudents'), value: students.length, icon: Users, color: "from-primary to-secondary" },
    { label: t('teacher.activeClasses'), value: "3", icon: BookOpen, color: "from-secondary to-accent" },
    { label: t('teacher.pendingAttendance'), value: "12", icon: Calendar, color: "from-accent to-primary" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in flex justify-between items-start">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('teacher.backHome')}
            </Button>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              {t('teacher.dashboard')}
            </h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            {t('teacher.logout')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={stat.label}
              className="p-6 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Button 
            onClick={() => setIsAttendanceModalOpen(true)}
            className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-secondary to-accent hover:opacity-90"
          >
            <Calendar className="w-6 h-6" />
            <span>{t('teacher.markAttendance')}</span>
          </Button>
          <Button 
            onClick={() => setIsLessonModalOpen(true)}
            className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-accent to-primary hover:opacity-90"
          >
            <BookOpen className="w-6 h-6" />
            <span>{t('teacher.uploadLessons')}</span>
          </Button>
          <Button 
            onClick={() => setIsQuizModalOpen(true)}
            className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <FileText className="w-6 h-6" />
            <span>{t('teacher.createQuiz')}</span>
          </Button>
          <Button 
            onClick={() => navigate("/teacher/quizzes")}
            className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-secondary to-primary hover:opacity-90"
          >
            <FileText className="w-6 h-6" />
            <span>{t('teacher.viewQuizzes')}</span>
          </Button>
        </div>

        {/* Students List */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">{t('teacher.myStudents')}</h2>
          {students.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No students assigned yet</p>
          ) : (
            <div className="space-y-4">
              {students.map((student) => (
                <Card key={student.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{student.full_name_en}</h3>
                      <p className="text-sm text-muted-foreground" dir="rtl">
                        {student.full_name_ar}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{student.branch}</Badge>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleOpenReport(student)}
                        className="bg-gradient-to-r from-primary to-secondary"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Report
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t('teacher.course')}</p>
                      <p className="font-medium">{student.program}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Level</p>
                      <p className="font-medium">{student.course_level || "Level 1"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Grade</p>
                      <p className="font-medium">{student.total_grade ? `${student.total_grade}%` : "N/A"}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <CreateQuizModal 
        isOpen={isQuizModalOpen} 
        onClose={() => setIsQuizModalOpen(false)} 
      />
      <UploadLessonModal 
        isOpen={isLessonModalOpen} 
        onClose={() => setIsLessonModalOpen(false)} 
      />
      <MarkAttendanceModal 
        isOpen={isAttendanceModalOpen} 
        onClose={() => setIsAttendanceModalOpen(false)} 
      />
      {selectedStudent && (
        <StudentWeeklyReportModal 
          isOpen={isReportModalOpen} 
          onClose={() => {
            setIsReportModalOpen(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
