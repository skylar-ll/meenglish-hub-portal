import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, BookOpen, Calendar, CreditCard, UserCheck, FileText, NotebookPen, Award, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logo from "@/assets/logo-new.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { MyClasses } from "@/components/student/MyClasses";
import { CourseCurriculum } from "@/components/student/CourseCurriculum";

const CoursePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [courseData, setCourseData] = useState<any>(null);
  const [videoProgress, setVideoProgress] = useState({ watched: 0, total: 0 });
  const [dailyAttendance, setDailyAttendance] = useState<number[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  const fetchVideoProgress = async (studentId: string) => {
    try {
      // Get enrolled class IDs
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId);

      if (!enrollments || enrollments.length === 0) {
        setVideoProgress({ watched: 0, total: 0 });
        return;
      }

      const classIds = enrollments.map(e => e.class_id);

      // Get total lessons count
      const { count: totalCount } = await supabase
        .from("teacher_videos")
        .select("id", { count: "exact", head: true })
        .in("class_id", classIds);

      // Get watched count
      const { count: watchedCount } = await supabase
        .from("student_video_progress")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId);

      console.log("Progress update:", { watched: watchedCount, total: totalCount });
      setVideoProgress({
        watched: watchedCount || 0,
        total: totalCount || 0
      });
    } catch (error) {
      console.error("Error fetching video progress:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      
      if (!email) {
        navigate("/student/login");
        return;
      }

      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("email", email)
        .maybeSingle();
        
      if (!student) {
        navigate("/student/signup");
        return;
      }

      // Check membership expiration from database
      if (student.expiration_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(student.expiration_date);
        expDate.setHours(0, 0, 0, 0);
        if (today > expDate) {
          navigate("/student/membership-expired");
          return;
        }
      }
      
      const registrationData = {
        fullNameEn: student.full_name_en,
        fullNameAr: student.full_name_ar,
        email: student.email,
        program: student.program,
        classType: student.class_type,
        branch: student.branch,
        courseLevel: student.course_level,
        studentId: student.student_id,
        expirationDate: student.expiration_date,
      };
      sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));
      setCourseData(registrationData);
      setCurrentStudentId(student.id);

      // Fetch actual video progress
      await fetchVideoProgress(student.id);
    };
    load();

    // Subscribe to video progress changes
    const progressChannel = supabase
      .channel('video-progress-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_video_progress' },
        async () => {
          if (currentStudentId) {
            await fetchVideoProgress(currentStudentId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(progressChannel);
    };
  }, [navigate, currentStudentId]);

  // Callback for CourseCurriculum to notify progress change
  const handleProgressChange = async () => {
    if (currentStudentId) {
      await fetchVideoProgress(currentStudentId);
    }
  };

  const progressPercentage = videoProgress.total > 0 
    ? (videoProgress.watched / videoProgress.total) * 100 
    : 0;

  if (!courseData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Top Logo Bar */}
      <div className="bg-card/50 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <img 
            src={logo} 
            alt="Modern Education Center" 
            className="h-12 object-contain"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('student.home')}
            </Button>
            <Button
              variant="default"
              onClick={() => navigate("/student/attendance")}
              size="sm"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Mark Attendance
            </Button>
            <Button
              variant="default"
              onClick={() => navigate("/student/grades")}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-indigo-600"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              My Grades
            </Button>
            <Button
              variant="default"
              onClick={() => navigate("/student/certificates")}
              size="sm"
              className="bg-gradient-to-r from-success to-emerald-600"
            >
              <Award className="w-4 h-4 mr-2" />
              Certificates
            </Button>
            <Button
              variant="default"
              onClick={() => navigate("/student/quizzes")}
              size="sm"
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t('student.myQuizzes')}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/student/notes")}
              size="sm"
            >
              <NotebookPen className="w-4 h-4 mr-2" />
              {t('student.notes')}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/student/weekly-reports")}
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Weekly Reports
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/student/payments")}
              size="sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Payments
            </Button>
            <Button
              variant="default"
              onClick={() => navigate("/student/performance")}
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-orange-600"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Report
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('student.myCourse')}
          </h1>
        </div>

        {/* Student Info Card */}
        <Card className="p-6 mb-6 animate-slide-up bg-gradient-to-br from-card to-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">{courseData.fullNameEn}</h2>
              <p className="text-sm text-primary font-medium mb-2">Student ID: {courseData.studentId || "N/A"}</p>
              <p className="text-lg text-muted-foreground mb-4" dir="rtl">
                {courseData.fullNameAr}
              </p>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-muted-foreground text-xs">{t('student.courseLevel')}</p>
                    <p className="font-medium">{courseData.courseLevel || "Level 1"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-secondary" />
                  <div>
                    <p className="text-muted-foreground text-xs">{t('student.program')}</p>
                    <p className="font-medium capitalize">{courseData.program?.replace("-", " ")}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-muted-foreground text-xs">{t('student.classTypeLabel')}</p>
                    <p className="font-medium capitalize">{courseData.classType}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">{t('student.subscriptionStatus')}</p>
                  <Badge className="bg-success text-success-foreground mt-1">{t('student.active')}</Badge>
                </div>
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">{t('student.branchLocation')}</p>
                <p className="font-medium capitalize">{courseData.branch}</p>
              </div>
              
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground">{t('student.nextPayment')}</p>
                </div>
                <p className="font-medium">February 15, 2025</p>
                <p className="text-sm text-muted-foreground">2,400 SAR</p>
              </div>
              
              <div className="p-3 bg-accent/5 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-accent" />
                  <p className="text-xs text-muted-foreground">{t('student.dailyAttendance')}</p>
                </div>
                <p className="font-medium text-lg">{dailyAttendance.length} / 8 {t('student.days')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('student.completePart')}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* My Classes Card */}
        <Card className="p-6 mb-6 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <MyClasses />
        </Card>

        {/* Progress Card */}
        <Card className="p-6 mb-6 animate-slide-up" style={{ animationDelay: "75ms" }}>
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold">{t('student.courseProgress')}</h3>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Lessons Completed</span>
              <span className="text-sm font-medium">{videoProgress.watched} / {videoProgress.total}</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          <p className="text-sm text-muted-foreground">
            {videoProgress.total === 0 
              ? "No lessons available yet."
              : videoProgress.watched === videoProgress.total 
                ? t('student.congratulations')
                : `${t('student.keepGoing')} ${videoProgress.total - videoProgress.watched} lessons remaining.`}
          </p>
        </Card>

        {/* Course - Videos & Lessons */}
        <Card className="p-6 mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CourseCurriculum onProgressChange={handleProgressChange} />
        </Card>
      </div>
    </div>
  );
};

export default CoursePage;
