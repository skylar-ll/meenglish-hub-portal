import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, BookOpen, Calendar, CreditCard, UserCheck, FileText, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logo from "@/assets/logo-new.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

// Course curriculum data
const courseLessons = [
  {
    part: 1,
    titleKey: "course.part1.title",
    lessons: [
      { id: 1, nameKey: "course.lesson1" },
      { id: 2, nameKey: "course.lesson2" },
      { id: 3, nameKey: "course.lesson3" },
      { id: 4, nameKey: "course.lesson4" },
    ]
  },
  {
    part: 2,
    titleKey: "course.part2.title",
    lessons: [
      { id: 5, nameKey: "course.lesson5" },
      { id: 6, nameKey: "course.lesson6" },
      { id: 7, nameKey: "course.lesson7" },
      { id: 8, nameKey: "course.lesson8" },
    ]
  },
  {
    part: 3,
    titleKey: "course.part3.title",
    lessons: [
      { id: 9, nameKey: "course.lesson9" },
      { id: 10, nameKey: "course.lesson10" },
      { id: 11, nameKey: "course.lesson11" },
      { id: 12, nameKey: "course.lesson12" },
    ]
  },
  {
    part: 4,
    titleKey: "course.part4.title",
    lessons: [
      { id: 13, nameKey: "course.lesson13" },
      { id: 14, nameKey: "course.lesson14" },
      { id: 15, nameKey: "course.lesson15" },
      { id: 16, nameKey: "course.lesson16" },
    ]
  },
  {
    part: 5,
    titleKey: "course.part5.title",
    lessons: [
      { id: 17, nameKey: "course.lesson17" },
      { id: 18, nameKey: "course.lesson18" },
      { id: 19, nameKey: "course.lesson19" },
      { id: 20, nameKey: "course.lesson20" },
    ]
  },
  {
    part: 6,
    titleKey: "course.part6.title",
    lessons: [
      { id: 21, nameKey: "course.lesson21" },
      { id: 22, nameKey: "course.lesson22" },
      { id: 23, nameKey: "course.lesson23" },
      { id: 24, nameKey: "course.lesson24" },
    ]
  },
  {
    part: 7,
    titleKey: "course.part7.title",
    lessons: [
      { id: 25, nameKey: "course.lesson25" },
      { id: 26, nameKey: "course.lesson26" },
      { id: 27, nameKey: "course.lesson27" },
      { id: 28, nameKey: "course.lesson28" },
    ]
  },
  {
    part: 8,
    titleKey: "course.part8.title",
    lessons: [
      { id: 29, nameKey: "course.lesson29" },
      { id: 30, nameKey: "course.lesson30" },
      { id: 31, nameKey: "course.lesson31" },
      { id: 32, nameKey: "course.lesson32" },
    ]
  },
];

const CoursePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [courseData, setCourseData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [attendedLessons, setAttendedLessons] = useState<number[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<number[]>([]);
  const [expandedPart, setExpandedPart] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const registration = sessionStorage.getItem("studentRegistration");
      if (registration) {
        setCourseData(JSON.parse(registration));
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email;
        if (email) {
          const { data: student } = await supabase
            .from("students")
            .select("*")
            .eq("email", email)
            .maybeSingle();
          if (student) {
            const registrationData = {
              fullNameEn: student.full_name_en,
              fullNameAr: student.full_name_ar,
              email: student.email,
              program: student.program,
              classType: student.class_type,
              branch: student.branch,
              courseLevel: student.course_level,
            };
            sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));
            setCourseData(registrationData);
          } else {
            navigate("/student/signup");
            return;
          }
        } else {
          navigate("/student/login");
          return;
        }
      }

      // Simulate some progress - attended first 8 lessons (2 parts)
      setProgress(2);
      setAttendedLessons([1, 2, 3, 4, 5, 6, 7, 8]);
    };
    load();
  }, [navigate]);

  const markLessonAttendance = (lessonId: number, partNumber: number) => {
    if (attendedLessons.includes(lessonId)) {
      toast.info(t('student.attendanceAlready'));
      return;
    }
    
    const newAttendedLessons = [...attendedLessons, lessonId];
    setAttendedLessons(newAttendedLessons);
    
    // Check if all lessons in the part are completed
    const partLessons = courseLessons[partNumber - 1].lessons;
    const allLessonsCompleted = partLessons.every(lesson => 
      newAttendedLessons.includes(lesson.id)
    );
    
    if (allLessonsCompleted && partNumber === progress + 1) {
      setProgress(progress + 1);
      if (!dailyAttendance.includes(partNumber)) {
        setDailyAttendance([...dailyAttendance, partNumber]);
        toast.success(`🎉 ${t('student.part')} ${partNumber} ${t('student.partCompleted')}`);
      } else {
        toast.success(`🎉 ${t('student.part')} ${partNumber} ${t('student.completed')}!`);
      }
    } else {
      toast.success(t('student.attendanceMarked'));
    }
  };

  const progressPercentage = (progress / 8) * 100;

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
          <div className="flex items-center gap-2">
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
              onClick={() => navigate("/student/reports")}
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Weekly Reports
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

        {/* Progress Card */}
        <Card className="p-6 mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold">{t('student.courseProgress')}</h3>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">{t('student.completedParts')}</span>
              <span className="text-sm font-medium">{progress} / 8</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          <p className="text-sm text-muted-foreground">
            {progress === 8 
              ? t('student.congratulations')
              : `${t('student.keepGoing')} ${8 - progress} ${t('student.partsRemaining')}.`}
          </p>
        </Card>

        {/* Course Parts & Lessons */}
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold mb-4">{t('student.curriculum')}</h3>
          {courseLessons.map((part) => {
            const partLessons = part.lessons;
            const completedLessonsInPart = partLessons.filter(lesson => 
              attendedLessons.includes(lesson.id)
            ).length;
            const isPartCompleted = partLessons.every(lesson => 
              attendedLessons.includes(lesson.id)
            );
            const isPartCurrent = part.part === progress + 1;
            const isPartLocked = part.part > progress + 1;
            const isExpanded = expandedPart === part.part;
            
            return (
              <Card
                key={part.part}
                className={`transition-all ${
                  isPartCompleted
                    ? "bg-success/10 border-success/30"
                    : isPartCurrent
                    ? "bg-primary/5 border-primary/30"
                    : isPartLocked
                    ? "opacity-60"
                    : "hover:bg-muted/50"
                }`}
              >
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedPart(isExpanded ? null : part.part)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {isPartCompleted ? (
                        <CheckCircle2 className="w-10 h-10 text-success" />
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {part.part}
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold">{t(part.titleKey)}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={isPartCompleted ? "default" : isPartCurrent ? "secondary" : "outline"} className="text-xs">
                            {isPartCompleted ? t('student.completed') : isPartCurrent ? t('student.inProgress') : isPartLocked ? t('student.locked') : t('student.available')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {completedLessonsInPart} / {partLessons.length} {t('student.lessons')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      {isExpanded ? "−" : "+"}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-2 border-t pt-4">
                    {partLessons.map((lesson) => {
                      const isLessonCompleted = attendedLessons.includes(lesson.id);
                      const canAttend = !isPartLocked && !isLessonCompleted;
                      
                      return (
                        <div
                          key={lesson.id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            isLessonCompleted 
                              ? "bg-success/5 border-success/20" 
                              : "bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isLessonCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{t(lesson.nameKey)}</p>
                            </div>
                          </div>
                          {canAttend && isPartCurrent && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markLessonAttendance(lesson.id, part.part);
                              }}
                              className="bg-gradient-to-r from-primary to-secondary"
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              {t('student.attend')}
                            </Button>
                          )}
                          {isLessonCompleted && (
                            <span className="text-xs text-success font-medium">{t('student.completedCheck')}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
