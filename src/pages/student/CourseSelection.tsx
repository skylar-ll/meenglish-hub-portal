import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { useBranchFiltering } from "@/hooks/useBranchFiltering";
import { useTeacherCourseMapping } from "@/hooks/useTeacherCourseMapping";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

interface LevelOption {
  id: string;
  config_key: string;
  config_value: string;
  display_order: number;
}

const CourseSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [levelOptions, setLevelOptions] = useState<LevelOption[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const { courses, loading } = useFormConfigurations();
  const { filteredOptions, loading: branchLoading } = useBranchFiltering(branchId);
  const { getTeacherForLevel, getTeacherForCourse, loading: teacherLoading } = useTeacherCourseMapping(branchId);
  
  console.log("🔍 CourseSelection - Branch filtering results:", {
    branchId,
    allowedCourses: filteredOptions.allowedCourses,
    allowedLevels: filteredOptions.allowedLevels,
  });

  useEffect(() => {
    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    console.log("📦 CourseSelection - Registration data:", registration);
    console.log("🏢 CourseSelection - Branch ID:", registration.branch_id);
    setBranchId(registration.branch_id || null);
  }, []);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const { data, error } = await supabase
          .from('form_configurations')
          .select('*')
          .eq('config_type', 'level')
          .eq('is_active', true)
          .order('display_order');
        if (error) throw error;
        setLevelOptions((data || []) as LevelOption[]);
      } catch (e) {
        console.error('Failed to load levels', e);
      }
    };
    fetchLevels();
  }, []);

  const toggleCourse = (courseValue: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseValue)
        ? prev.filter(c => c !== courseValue)
        : [...prev, courseValue]
    );
  };

  const toggleLevel = (levelValue: string) => {
    setSelectedLevels(prev =>
      prev.includes(levelValue)
        ? prev.filter(l => l !== levelValue)
        : [...prev, levelValue]
    );
  };

  const handleNext = () => {
    if (selectedLevels.length === 0 && selectedCourses.length === 0) {
      toast.error("Please select at least one level or course");
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    const updated = {
      ...registration,
      courses: selectedCourses,
      course_level: selectedLevels.join(", "),
    };
    sessionStorage.setItem("studentRegistration", JSON.stringify(updated));
    navigate("/student/timing-selection");
  };

  // Group courses by category, excluding any entries that look like levels (e.g., level-1)
  const levelLike = (val: string) => /^level[\s\-_]?\d+/i.test(val);
  const visibleCourses = courses.filter((c) => !levelLike(c.value));
  
  // Only filter by branch if branch filtering returned specific courses
  // Otherwise show all courses (backward compatible behavior)
  const shouldFilterByBranch = branchId && filteredOptions.allowedCourses.length > 0;
  
  const filteredCourses = visibleCourses; // Show all courses; availability handled per-item
  
  console.log("📋 Course filtering:", {
    branchId,
    shouldFilterByBranch,
    allowedCourses: filteredOptions.allowedCourses,
    totalVisible: visibleCourses.length,
    afterFilter: filteredCourses.length
  });
  
  const coursesByCategory = visibleCourses.reduce((acc, course) => {
    if (!acc[course.category]) {
      acc[course.category] = [];
    }
    acc[course.category].push(course);
    return acc;
  }, {} as Record<string, Array<{ id: string; value: string; label: string; category: string; price: number }>>);

  // Levels: always show level-1..level-12; disable those not available for branch
  const DEFAULT_LEVELS = Array.from({ length: 12 }, (_, i) => `level-${i + 1}`);
  const levelMap = new Map(levelOptions.map(l => [l.config_value.toLowerCase(), l]));
  const displayLevels: LevelOption[] = DEFAULT_LEVELS.map((val, i) => {
    const found = levelMap.get(val.toLowerCase());
    return found ?? ({ id: `default-${i}`, config_key: val, config_value: val, display_order: i } as LevelOption);
  });

  // Determine availability per item using flexible matching
  const hasFilteredOptions = branchId && (filteredOptions.allowedLevels.length > 0 || filteredOptions.allowedCourses.length > 0);
  const normalize = (s: string) => s.toLowerCase().trim();
  
  console.log("🎯 CourseSelection - Filtering debug:", {
    hasFilteredOptions,
    allowedLevels: filteredOptions.allowedLevels,
    allowedCourses: filteredOptions.allowedCourses,
  });
  
  // Match levels flexibly - check if any allowed level contains the level identifier
  const isLevelAvailable = (levelValue: string) => {
    if (!hasFilteredOptions) return true;
    const levelId = normalize(levelValue);
    
    // Check if any allowed level matches or contains this level identifier
    return filteredOptions.allowedLevels.some(allowedLevel => {
      const normalized = normalize(allowedLevel);
      // Match if exact match OR if the allowed level contains the level identifier
      return normalized === levelId || normalized.includes(levelId) || levelId.includes(normalized);
    });
  };
  
  const isCourseAvailable = (courseValue: string, courseLabel?: string) => {
    if (!hasFilteredOptions) return true;
    const allowedCoursesSet = new Set(filteredOptions.allowedCourses.map(normalize));
    return allowedCoursesSet.has(normalize(courseValue)) || (courseLabel ? allowedCoursesSet.has(normalize(courseLabel)) : false);
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
          {loading || branchLoading || teacherLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">
                {branchLoading ? "Loading available courses for your branch..." : "Scanning available classes for your branch..."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {branchLoading ? "جاري تحميل الدورات المتاحة لفرعك..." : "جاري فحص الفصول المتاحة لفرعك..."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* English Program - Levels */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">English Program (Select your starting level) *</Label>
                <div className="space-y-3">
                  {displayLevels.map((level) => {
                    const available = isLevelAvailable(level.config_value);
                    const teacherName = getTeacherForLevel(level.config_value);
                    return (
                      <div key={level.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={level.id}
                          checked={selectedLevels.includes(level.config_value)}
                          disabled={!available}
                          onCheckedChange={() => toggleLevel(level.config_value)}
                          className={!available ? "opacity-50 cursor-not-allowed" : ""}
                        />
                        <Label
                          htmlFor={level.id}
                          className={`text-base cursor-pointer flex items-center gap-2 ${!available ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span>{level.config_value}</span>
                          {teacherName && available && (
                            <span className="text-sm text-primary font-medium">– {teacherName}</span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                {branchId && filteredOptions.allowedTimings.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Available timings for your branch: {filteredOptions.allowedTimings.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Courses */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Your Courses (Optional)</Label>
                {Object.entries(coursesByCategory).map(([category, coursesInCategory]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="font-semibold text-muted-foreground">{category}</h3>
                    {coursesInCategory.map((course) => {
                      const available = isCourseAvailable(course.value, course.label);
                      const teacherName = getTeacherForCourse(course.value) || getTeacherForCourse(course.label);
                      return (
                        <div key={course.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={course.id}
                            checked={selectedCourses.includes(course.value)}
                            disabled={!available}
                            onCheckedChange={() => toggleCourse(course.value)}
                            className={!available ? "opacity-50 cursor-not-allowed" : ""}
                          />
                          <Label
                            htmlFor={course.id}
                            className={`text-base cursor-pointer flex items-center gap-2 ${!available ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <span>{course.label}</span>
                            {teacherName && available && (
                              <span className="text-sm text-primary font-medium">– {teacherName}</span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2">{t('student.courseInfo')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('student.courseInfoDesc')}
                  </p>
                </div>

                {/* Hide inline button on mobile when floating button shows */}
                <Button
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity md:hidden"
                  size="lg"
                >
                  {t('student.next')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </Card>
        
        {/* Floating Navigation Button */}
        <FloatingNavigationButton
          onNext={handleNext}
          onBack={() => navigate("/student/signup")}
          nextLabel={t('student.next')}
          backLabel={t('student.back')}
          showBack={true}
          showNext={true}
        />
      </div>
    </div>
  );
};

export default CourseSelection;
