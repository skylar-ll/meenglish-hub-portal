import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";

const CourseSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const password = location.state?.password;
  const { courses, loading } = useFormConfigurations();

  const toggleCourse = (courseValue: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseValue)
        ? prev.filter(c => c !== courseValue)
        : [...prev, courseValue]
    );
  };

  const handleNext = () => {
    if (selectedCourses.length === 0) {
      toast.error("Please select at least one course");
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    const courseData = {
      ...registration,
      courses: selectedCourses,
    };
    sessionStorage.setItem("studentRegistration", JSON.stringify(courseData));
    navigate("/student/teacher-selection", { state: { password } });
  };

  // Group courses by category
  const coursesByCategory = courses.reduce((acc, course) => {
    if (!acc[course.category]) {
      acc[course.category] = [];
    }
    acc[course.category].push(course);
    return acc;
  }, {} as Record<string, Array<{ id: string; value: string; label: string; category: string; price: number }>>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/signup")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.back')}
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('student.courseSelection')}
          </h1>
        </div>

        {/* Course Selection Form */}
        <Card className="p-8 animate-slide-up">
          {loading ? (
            <div className="text-center py-8">Loading courses...</div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Your Courses (You can select multiple)</Label>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {Object.keys(coursesByCategory).map(category => {
                    const coursesInCategory = coursesByCategory[category];
                    return (
                      <div key={category} className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">{category}</h3>
                        {coursesInCategory.map((course) => (
                          <div key={course.value} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center space-x-3 flex-1">
                              <Checkbox
                                id={course.value}
                                checked={selectedCourses.includes(course.value)}
                                onCheckedChange={() => toggleCourse(course.value)}
                              />
                              <label
                                htmlFor={course.value}
                                className="text-sm flex-1 cursor-pointer"
                              >
                                {course.label}
                              </label>
                            </div>
                            <span className="text-sm font-semibold text-primary ml-4">${course.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {selectedCourses.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">Selected: {selectedCourses.length} course(s)</p>
                  </div>
                )}
              </div>

              <div className="pt-4 space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2">{t('student.courseInfo')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('student.courseInfoDesc')}
                  </p>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  {t('student.next')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CourseSelection;
