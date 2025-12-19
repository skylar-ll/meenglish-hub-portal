import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Calendar, BookOpen, FileText, LogOut, ShieldAlert, ClipboardList, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { CreateQuizModal } from "@/components/teacher/CreateQuizModal";
import { UploadLessonModal } from "@/components/teacher/UploadLessonModal";
import { MarkAttendanceModal } from "@/components/teacher/MarkAttendanceModal";
import { StudentWeeklyReportModal } from "@/components/teacher/StudentWeeklyReportModal";
import { ClassCard } from "@/components/teacher/ClassCard";
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
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState<string>("");
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedTeacherName, setImpersonatedTeacherName] = useState("");

  useEffect(() => {
    // Check if admin is impersonating
    const impersonating = localStorage.getItem('impersonating_teacher');
    const teacherNameStored = localStorage.getItem('teacher_name');
    
    if (impersonating === 'true') {
      setIsImpersonating(true);
      setImpersonatedTeacherName(teacherNameStored || '');
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/teacher/login');
        return;
      }

      // Verify user has teacher role (optional check - RLS will enforce access)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'teacher')
        .maybeSingle();

      if (!roleData) {
        // User doesn't have teacher role yet - they may have just signed up
        console.log('Teacher role not found - may need to refresh');
      }

      // Fetch teacher record to get teacher's name and courses
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("id, full_name, email, courses_assigned")
        .eq("id", session.user.id)
        .maybeSingle();

      if (teacherData) {
        setTeacherName(teacherData.full_name);

        // Fetch classes assigned to this teacher using teacher_id
        const { data: classesData } = await supabase
          .from("classes")
          .select("id, class_name, timing, courses, levels")
          .eq("teacher_id", teacherData.id);

        console.log("Teacher ID:", teacherData.id);
        console.log("Classes found:", classesData);

        if (classesData) {
          // For each class, get enrollments
          const formatted = [];
          for (const cls of classesData) {
            const { data: enrolls } = await supabase
              .from("enrollments")
              .select("student_id")
              .eq("class_id", cls.id);
            
            const studentIds = (enrolls || []).map((e: any) => e.student_id);
            let studentsList: any[] = [];
            if (studentIds.length > 0) {
            const { data: studentRows } = await supabase
              .from("students")
              .select("id, full_name_en")
              .in("id", studentIds);
            studentsList = (studentRows || []).map((s: any) => ({ id: s.id, full_name_en: s.full_name_en }));
            }
            
            formatted.push({
              ...cls,
              students: studentsList,
            });
          }
          setClasses(formatted);
        }

        // Get students in teacher's classes (same as before)
        const classIds = (classesData || []).map((c: any) => c.id);
        if (classIds.length === 0) {
          setStudents([]);
        } else {
          // 2) Get enrollments
          const { data: enrolls } = await supabase
            .from("enrollments")
            .select("student_id, class_id")
            .in("class_id", classIds);
          
          const studentIds = Array.from(new Set((enrolls || []).map((e: any) => e.student_id)));
          if (studentIds.length === 0) {
            setStudents([]);
          } else {
            // 3) Load students table (teachers can view students via RLS)
            const { data: studentsData } = await supabase
              .from("students")
              .select("id, full_name_en, full_name_ar, branch, program, class_type, course_level, total_course_fee, amount_paid, amount_remaining, discount_percentage, email")
              .in("id", studentIds);
            
            // Build a map of student->enrolled courses/levels
            const studentEnrollMap = new Map<string, { courses: string[], levels: string[] }>();
            enrolls?.forEach((enr: any) => {
              const cls = classesData?.find((c: any) => c.id === enr.class_id);
              if (cls) {
                const existing = studentEnrollMap.get(enr.student_id) || { courses: [], levels: [] };
                if (cls.courses) existing.courses.push(...cls.courses);
                if (cls.levels) existing.levels.push(...cls.levels);
                studentEnrollMap.set(enr.student_id, existing);
              }
            });
            
            const formattedStudents = (studentsData || []).map((s: any) => {
              const enr = studentEnrollMap.get(s.id) || { courses: [], levels: [] };
              return {
                id: s.id,
                full_name_en: s.full_name_en,
                full_name_ar: s.full_name_ar,
                branch: s.branch,
                program: s.program,
                class_type: s.class_type,
                course_level: s.course_level,
                total_grade: s.total_grade,
                email: s.email,
                enrolled_courses: Array.from(new Set(enr.courses)),
                enrolled_levels: Array.from(new Set(enr.levels)),
              };
            });
            setStudents(formattedStudents);
          }
        }
      } else {
        // If no teacher record, use email as name
        setTeacherName(session.user.email?.split('@')[0] || "Teacher");
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    // Check if admin is impersonating
    const impersonating = localStorage.getItem('impersonating_teacher');
    
    if (impersonating === 'true') {
      await handleReturnToAdmin();
    } else {
      await supabase.auth.signOut();
      navigate("/");
    }
  };

  const handleReturnToAdmin = async () => {
    try {
      const adminSessionStr = localStorage.getItem('admin_session');
      
      if (!adminSessionStr) {
        toast.error("Admin session not found");
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }

      const adminSession = JSON.parse(adminSessionStr);

      // Sign out current teacher session
      await supabase.auth.signOut();

      // Sign in with admin session
      const { error } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token
      });

      if (error) {
        console.error('Error restoring admin session:', error);
        toast.error("Failed to return to admin account");
        navigate("/admin/login");
        return;
      }

      // Clear impersonation flags
      localStorage.removeItem('admin_session');
      localStorage.removeItem('impersonating_teacher');
      localStorage.removeItem('teacher_name');

      toast.success("Returned to admin account");
      navigate("/admin/dashboard");
    } catch (error) {
      console.error('Error returning to admin:', error);
      toast.error("An error occurred");
      navigate("/admin/login");
    }
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
    { label: t('teacher.activeClasses'), value: classes.length, icon: BookOpen, color: "from-secondary to-accent" },
    { label: t('teacher.pendingAttendance'), value: "12", icon: Calendar, color: "from-accent to-primary" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      {/* Admin Impersonation Banner */}
      {isImpersonating && (
        <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-900 dark:text-amber-100">
              <strong>Admin Mode:</strong> You are viewing {impersonatedTeacherName}'s account
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleReturnToAdmin}
              className="ml-4 border-amber-600 text-amber-600 hover:bg-amber-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Admin Dashboard
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
              {teacherName ? `${teacherName}'s Dashboard` : t('teacher.dashboard')}
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
            onClick={() => navigate("/teacher/attendance-sheet")}
            className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90"
          >
            <ClipboardList className="w-6 h-6" />
            <span>Attendance & Grading Sheet</span>
          </Button>
          <Button 
            onClick={() => navigate("/teacher/weekly-reports")}
            className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90"
          >
            <Send className="w-6 h-6" />
            <span>Send Weekly Reports</span>
          </Button>
          <Button 
            onClick={() => navigate("/teacher/daily-schedule")}
            className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
          >
            <Calendar className="w-6 h-6" />
            <span>Daily Schedule</span>
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
          <Button 
            onClick={() => navigate("/teacher/students")}
            className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Users className="w-6 h-6" />
            <span>View All Students</span>
          </Button>
        </div>

        {/* My Classes Section - Always visible */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">My Classes</h2>
          {classes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No classes assigned yet. Contact admin to assign you to a class.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {classes.map((classItem) => (
                <ClassCard
                  key={classItem.id}
                  className={classItem.class_name}
                  timing={classItem.timing}
                  courses={classItem.courses}
                  levels={classItem.levels}
                  students={classItem.students}
                />
              ))}
            </div>
          )}
        </Card>

        {/* My Students Section */}
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
                      <p className="text-muted-foreground">Courses</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {student.enrolled_courses && student.enrolled_courses.length > 0 ? (
                          student.enrolled_courses.map((course: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {course}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Levels</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {student.enrolled_levels && student.enrolled_levels.length > 0 ? (
                          student.enrolled_levels.map((level: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {level}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        )}
                      </div>
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
