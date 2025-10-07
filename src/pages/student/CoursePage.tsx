import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, BookOpen, Calendar, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logo from "@/assets/logo.jpeg";

// Course curriculum data
const courseLessons = [
  {
    part: 1,
    title: "Introduction & Basics",
    titleAr: "المقدمة والأساسيات",
    lessons: [
      { id: 1, name: "Welcome & Course Overview", nameAr: "الترحيب ونظرة عامة" },
      { id: 2, name: "Alphabet & Pronunciation", nameAr: "الأبجدية والنطق" },
      { id: 3, name: "Basic Greetings", nameAr: "التحيات الأساسية" },
      { id: 4, name: "Numbers 1-100", nameAr: "الأرقام 1-100" },
    ]
  },
  {
    part: 2,
    title: "Grammar Fundamentals",
    titleAr: "أساسيات القواعد",
    lessons: [
      { id: 5, name: "Present Simple Tense", nameAr: "المضارع البسيط" },
      { id: 6, name: "Articles (a, an, the)", nameAr: "أدوات التعريف" },
      { id: 7, name: "Personal Pronouns", nameAr: "الضمائر الشخصية" },
      { id: 8, name: "Basic Sentence Structure", nameAr: "تركيب الجملة الأساسي" },
    ]
  },
  {
    part: 3,
    title: "Everyday Conversations",
    titleAr: "المحادثات اليومية",
    lessons: [
      { id: 9, name: "Shopping & Money", nameAr: "التسوق والمال" },
      { id: 10, name: "At the Restaurant", nameAr: "في المطعم" },
      { id: 11, name: "Asking for Directions", nameAr: "السؤال عن الاتجاهات" },
      { id: 12, name: "Making Plans", nameAr: "وضع الخطط" },
    ]
  },
  {
    part: 4,
    title: "Expanding Vocabulary",
    titleAr: "توسيع المفردات",
    lessons: [
      { id: 13, name: "Family & Relationships", nameAr: "العائلة والعلاقات" },
      { id: 14, name: "Hobbies & Interests", nameAr: "الهوايات والاهتمامات" },
      { id: 15, name: "Weather & Seasons", nameAr: "الطقس والفصول" },
      { id: 16, name: "Jobs & Professions", nameAr: "الوظائف والمهن" },
    ]
  },
  {
    part: 5,
    title: "Intermediate Grammar",
    titleAr: "القواعد المتوسطة",
    lessons: [
      { id: 17, name: "Past Simple Tense", nameAr: "الماضي البسيط" },
      { id: 18, name: "Future Forms", nameAr: "صيغ المستقبل" },
      { id: 19, name: "Comparative & Superlative", nameAr: "المقارنة والتفضيل" },
      { id: 20, name: "Modal Verbs", nameAr: "الأفعال المساعدة" },
    ]
  },
  {
    part: 6,
    title: "Communication Skills",
    titleAr: "مهارات التواصل",
    lessons: [
      { id: 21, name: "Email Writing", nameAr: "كتابة البريد الإلكتروني" },
      { id: 22, name: "Phone Conversations", nameAr: "المحادثات الهاتفية" },
      { id: 23, name: "Presentations Basics", nameAr: "أساسيات العروض التقديمية" },
      { id: 24, name: "Business Meetings", nameAr: "الاجتماعات التجارية" },
    ]
  },
  {
    part: 7,
    title: "Advanced Topics",
    titleAr: "المواضيع المتقدمة",
    lessons: [
      { id: 25, name: "Conditional Sentences", nameAr: "الجمل الشرطية" },
      { id: 26, name: "Passive Voice", nameAr: "المبني للمجهول" },
      { id: 27, name: "Reported Speech", nameAr: "الكلام المنقول" },
      { id: 28, name: "Phrasal Verbs", nameAr: "الأفعال المركبة" },
    ]
  },
  {
    part: 8,
    title: "Final Review & Assessment",
    titleAr: "المراجعة النهائية والتقييم",
    lessons: [
      { id: 29, name: "Comprehensive Review", nameAr: "مراجعة شاملة" },
      { id: 30, name: "Practice Test", nameAr: "اختبار تدريبي" },
      { id: 31, name: "Final Exam", nameAr: "الامتحان النهائي" },
      { id: 32, name: "Certificate Award", nameAr: "منح الشهادة" },
    ]
  },
];

const CoursePage = () => {
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [attendedLessons, setAttendedLessons] = useState<number[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<number[]>([]); // Track which parts have daily attendance marked
  const [expandedPart, setExpandedPart] = useState<number | null>(null);

  useEffect(() => {
    const registration = sessionStorage.getItem("studentRegistration");
    if (!registration) {
      navigate("/student/signup");
      return;
    }
    setCourseData(JSON.parse(registration));
    
    // Simulate some progress - attended first 8 lessons (2 parts)
    setProgress(2);
    setAttendedLessons([1, 2, 3, 4, 5, 6, 7, 8]);
  }, [navigate]);

  const markLessonAttendance = (lessonId: number, partNumber: number) => {
    if (attendedLessons.includes(lessonId)) {
      toast.info("Attendance already marked for this lesson");
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
      // Mark daily attendance for this part
      if (!dailyAttendance.includes(partNumber)) {
        setDailyAttendance([...dailyAttendance, partNumber]);
        toast.success(`🎉 Part ${partNumber} completed! Daily attendance marked.`);
      } else {
        toast.success(`🎉 Part ${partNumber} completed!`);
      }
    } else {
      toast.success("Lesson attendance marked");
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
            alt="M.E. English" 
            className="h-12 object-contain"
            style={{ filter: 'drop-shadow(0 0 0 transparent)' }}
          />
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            My Course
          </h1>
          <p className="text-xl text-muted-foreground" dir="rtl">
            دورتي
          </p>
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
                    <p className="text-muted-foreground text-xs">Course Level</p>
                    <p className="font-medium">{courseData.courseLevel || "Level 1"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-secondary" />
                  <div>
                    <p className="text-muted-foreground text-xs">Program</p>
                    <p className="font-medium capitalize">{courseData.program?.replace("-", " ")}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-muted-foreground text-xs">Class Type</p>
                    <p className="font-medium capitalize">{courseData.classType}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Subscription Status</p>
                  <Badge className="bg-success text-success-foreground mt-1">Active</Badge>
                </div>
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Branch Location</p>
                <p className="font-medium capitalize">{courseData.branch}</p>
              </div>
              
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Next Payment</p>
                </div>
                <p className="font-medium">February 15, 2025</p>
                <p className="text-sm text-muted-foreground">2,400 SAR</p>
              </div>
              
              <div className="p-3 bg-accent/5 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-accent" />
                  <p className="text-xs text-muted-foreground">Daily Attendance</p>
                </div>
                <p className="font-medium text-lg">{dailyAttendance.length} / 8 Days</p>
                <p className="text-xs text-muted-foreground mt-1">Complete a part to mark daily attendance</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Progress Card */}
        <Card className="p-6 mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold">Course Progress</h3>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Completed Parts</span>
              <span className="text-sm font-medium">{progress} / 8</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          <p className="text-sm text-muted-foreground">
            {progress === 8 
              ? "🎉 Congratulations! You've completed the course!"
              : `Keep going! ${8 - progress} parts remaining.`}
          </p>
        </Card>

        {/* Course Parts & Lessons */}
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold mb-4">Course Curriculum</h3>
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
                        <h4 className="text-lg font-semibold">{part.title}</h4>
                        <p className="text-sm text-muted-foreground" dir="rtl">
                          {part.titleAr}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={isPartCompleted ? "default" : isPartCurrent ? "secondary" : "outline"} className="text-xs">
                            {isPartCompleted ? "Completed" : isPartCurrent ? "In Progress" : isPartLocked ? "Locked" : "Available"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {completedLessonsInPart} / {partLessons.length} lessons
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
                              <p className="font-medium text-sm">{lesson.name}</p>
                              <p className="text-xs text-muted-foreground" dir="rtl">{lesson.nameAr}</p>
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
                              Attend
                            </Button>
                          )}
                          {isLessonCompleted && (
                            <span className="text-xs text-success font-medium">Completed ✓</span>
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
