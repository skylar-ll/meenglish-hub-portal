import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const CourseSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const allCourses = [
    { value: "level-1", label: "Level 1 (Pre1) - مستوى اول", category: "English Program" },
    { value: "level-2", label: "Level 2 (Pre2) - مستوى ثاني", category: "English Program" },
    { value: "level-3", label: "Level 3 (Intro A) - مستوى ثالث", category: "English Program" },
    { value: "level-4", label: "Level 4 (Intro B) - مستوى رابع", category: "English Program" },
    { value: "level-5", label: "Level 5 (1A) - مستوى خامس", category: "English Program" },
    { value: "level-6", label: "Level 6 (1B) - مستوى سادس", category: "English Program" },
    { value: "level-7", label: "Level 7 (2A) - مستوى سابع", category: "English Program" },
    { value: "level-8", label: "Level 8 (2B) - مستوى ثامن", category: "English Program" },
    { value: "level-9", label: "Level 9 (3A) - مستوى تاسع", category: "English Program" },
    { value: "level-10", label: "Level 10 (3B) - مستوى عاشر", category: "English Program" },
    { value: "level-11", label: "Level 11 (IELTS 1 - STEP 1) - مستوى-11", category: "English Program" },
    { value: "level-12", label: "Level 12 (IELTS 2 - STEP 2) - مستوى-12", category: "English Program" },
    { value: "speaking", label: "Speaking Class", category: "Speaking Program" },
    { value: "private", label: "1:1 Class - Private Class - كلاس فردي", category: "Private Class" },
    { value: "french", label: "French Language - لغة فرنسية", category: "Other Languages" },
    { value: "chinese", label: "Chinese Language - لغة صينية", category: "Other Languages" },
    { value: "spanish", label: "Spanish Language - لغة اسبانية", category: "Other Languages" },
    { value: "italian", label: "Italian Language - لغة ايطالية", category: "Other Languages" },
    { value: "arabic", label: "Arabic for Non-Arabic Speakers - عربي لغير الناطقين بها", category: "Other Languages" },
  ];

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
    navigate("/student/branch-selection");
  };

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
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Select Your Courses (You can select multiple)</Label>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {["English Program", "Speaking Program", "Private Class", "Other Languages"].map(category => {
                  const coursesInCategory = allCourses.filter(c => c.category === category);
                  return (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">{category}</h3>
                      {coursesInCategory.map((course) => (
                        <div key={course.value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
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
        </Card>
      </div>
    </div>
  );
};

export default CourseSelection;
