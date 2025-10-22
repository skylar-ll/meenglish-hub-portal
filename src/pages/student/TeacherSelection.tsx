import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface Teacher {
  id: string;
  full_name: string;
  courses_assigned: string;
}

interface CourseTeachers {
  course: string;
  teachers: Teacher[];
}

const TeacherSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [courseTeachers, setCourseTeachers] = useState<CourseTeachers[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const password = location.state?.password;

  useEffect(() => {
    fetchTeachersForCourses();
  }, []);

  const fetchTeachersForCourses = async () => {
    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    const selectedCourses = registration.courses || [];

    if (selectedCourses.length === 0) {
      navigate("/student/course-selection");
      return;
    }

    try {
      // Fetch all teachers
      const { data: teachersData, error } = await supabase
        .from('teachers')
        .select('id, full_name, courses_assigned')
        .not('courses_assigned', 'is', null);

      if (error) throw error;

      const coursesNeedingSelection: CourseTeachers[] = [];

      // For each course, find teachers who teach it
      selectedCourses.forEach((course: string) => {
        const teachersForCourse = (teachersData || []).filter((teacher: Teacher) => {
          const teacherCourses = teacher.courses_assigned?.toLowerCase().split(',').map(c => c.trim()) || [];
          const courseLower = course.toLowerCase();
          return teacherCourses.some(tc => tc.includes(courseLower) || courseLower.includes(tc));
        });

        // Only add if multiple teachers teach this course
        if (teachersForCourse.length > 1) {
          coursesNeedingSelection.push({
            course,
            teachers: teachersForCourse
          });
        } else if (teachersForCourse.length === 1) {
          // Auto-select if only one teacher
          setSelectedTeachers(prev => ({ ...prev, [course]: teachersForCourse[0].id }));
        }
      });

      setCourseTeachers(coursesNeedingSelection);
    } catch (error: any) {
      toast.error("Failed to load teachers");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeacher = (course: string, teacherId: string) => {
    setSelectedTeachers(prev => ({ ...prev, [course]: teacherId }));
  };

  const handleNext = () => {
    // Check if all courses with multiple teachers have a selection
    const missingSelections = courseTeachers.filter(
      ct => !selectedTeachers[ct.course]
    );

    if (missingSelections.length > 0) {
      toast.error("Please select a teacher for all courses");
      return;
    }

    // Store teacher selections
    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    registration.teacherSelections = selectedTeachers;
    sessionStorage.setItem("studentRegistration", JSON.stringify(registration));

    navigate("/student/timing-selection", { state: { password } });
  };

  useEffect(() => {
    // If no courses need teacher selection, auto-skip to timing
    if (!loading && courseTeachers.length === 0) {
      const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
      registration.teacherSelections = selectedTeachers;
      sessionStorage.setItem("studentRegistration", JSON.stringify(registration));
      navigate("/student/timing-selection", { state: { password } });
    }
  }, [loading, courseTeachers.length, navigate, password, selectedTeachers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 flex items-center justify-center">
        <p className="text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  // If no courses need teacher selection, the useEffect will handle navigation
  if (courseTeachers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 flex items-center justify-center">
        <p className="text-lg">Redirecting to timing selection...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/course-selection")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.back')}
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Select Your Teachers
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Multiple teachers are available for some of your courses. Please choose your preferred teacher.
          </p>
        </div>

        <Card className="p-8 animate-slide-up">
          <div className="space-y-8">
            {courseTeachers.map((courseTeacher) => (
              <div key={courseTeacher.course} className="space-y-4">
                <Label className="text-lg font-semibold">{courseTeacher.course}</Label>
                <div className="grid gap-4">
                  {courseTeacher.teachers.map((teacher) => (
                    <Card
                      key={teacher.id}
                      className={`p-6 cursor-pointer transition-all ${
                        selectedTeachers[courseTeacher.course] === teacher.id
                          ? "border-primary border-2 bg-primary/5 shadow-lg"
                          : "hover:bg-muted/50 hover:shadow-md"
                      }`}
                      onClick={() => handleSelectTeacher(courseTeacher.course, teacher.id)}
                    >
                      <p className="font-medium text-lg">{teacher.full_name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Teaches: {teacher.courses_assigned}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            <Button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              size="lg"
            >
              {t('student.next')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherSelection;
