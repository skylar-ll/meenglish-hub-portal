import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, BookOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const CoursePage = () => {
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [attendance, setAttendance] = useState<number[]>([]);

  useEffect(() => {
    const registration = sessionStorage.getItem("studentRegistration");
    if (!registration) {
      navigate("/student/signup");
      return;
    }
    setCourseData(JSON.parse(registration));
    
    // Simulate some progress
    setProgress(2);
    setAttendance([1, 2]);
  }, [navigate]);

  const markAttendance = (partNumber: number) => {
    if (attendance.includes(partNumber)) {
      toast.info("Attendance already marked for this part");
      return;
    }
    
    setAttendance([...attendance, partNumber]);
    setProgress(progress + 1);
    toast.success(`Attendance marked for Part ${partNumber}`);
  };

  const parts = Array.from({ length: 8 }, (_, i) => i + 1);
  const progressPercentage = (progress / 8) * 100;

  if (!courseData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            My Course
          </h1>
          <p className="text-xl text-muted-foreground" dir="rtl">
            دورتي
          </p>
        </div>

        {/* Student Info Card */}
        <Card className="p-6 mb-6 animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">{courseData.fullNameEn}</h2>
              <p className="text-lg text-muted-foreground" dir="rtl">
                {courseData.fullNameAr}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Branch</p>
              <p className="font-semibold capitalize">{courseData.branch}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Program</p>
              <p className="font-semibold capitalize">{courseData.program?.replace("-", " ")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Class Type</p>
              <p className="font-semibold capitalize">{courseData.classType}</p>
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

        {/* Course Parts */}
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold mb-4">Course Parts</h3>
          {parts.map((partNum) => {
            const isCompleted = attendance.includes(partNum);
            const isCurrent = partNum === progress + 1;
            
            return (
              <Card
                key={partNum}
                className={`p-6 transition-all ${
                  isCompleted
                    ? "bg-success/10 border-success/30"
                    : isCurrent
                    ? "bg-primary/5 border-primary/30"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isCompleted ? (
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-muted flex items-center justify-center font-semibold">
                        {partNum}
                      </div>
                    )}
                    <div>
                      <h4 className="text-lg font-semibold">Part {partNum}</h4>
                      <p className="text-sm text-muted-foreground">
                        {isCompleted ? "Completed" : isCurrent ? "Current" : "Upcoming"}
                      </p>
                    </div>
                  </div>

                  {!isCompleted && isCurrent && (
                    <Button
                      onClick={() => markAttendance(partNum)}
                      className="bg-gradient-to-r from-primary to-secondary"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Mark Attendance
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CoursePage;
