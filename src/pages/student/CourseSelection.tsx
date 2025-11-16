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
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";
import { MultiSelect } from "@/components/ui/multi-select";
import { supabase } from "@/integrations/supabase/client";

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
    if (selectedLevels.length === 0) {
      toast.error("Please select at least one level");
      return;
    }
    
    if (selectedCourses.length === 0) {
      toast.error("Please select at least one course");
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
  
  const filteredCourses = shouldFilterByBranch
    ? visibleCourses.filter((c) => filteredOptions.allowedCourses.includes(c.value))
    : visibleCourses; // Show all if no branch filtering available
  
  console.log("📋 Course filtering:", {
    branchId,
    shouldFilterByBranch,
    allowedCourses: filteredOptions.allowedCourses,
    totalVisible: visibleCourses.length,
    afterFilter: filteredCourses.length
  });
  
  const coursesByCategory = filteredCourses.reduce((acc, course) => {
    if (!acc[course.category]) {
      acc[course.category] = [];
    }
    acc[course.category].push(course);
    return acc;
  }, {} as Record<string, Array<{ id: string; value: string; label: string; category: string; price: number }>>);

  // English levels: filter based on branch selection
  const branchFilteredLevelOptions = branchId && filteredOptions.allowedLevels.length > 0
    ? levelOptions.filter((l) => filteredOptions.allowedLevels.includes(l.config_value))
    : levelOptions;
  
  const englishLevelOptions: LevelOption[] = branchFilteredLevelOptions.length
    ? branchFilteredLevelOptions
    : (filteredOptions.allowedLevels || []).map((v, i) => ({
        id: `fallback-${i}`,
        config_key: v,
        config_value: v,
        display_order: i,
      }));

  // Convert levels to multi-select options
  const levelMultiSelectOptions = englishLevelOptions.map(level => ({
    label: level.config_value,
    value: level.config_value
  }));

  // Convert courses to multi-select options grouped by category
  const courseMultiSelectOptions = filteredCourses.map(course => ({
    label: course.label,
    value: course.value
  }));

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
          {loading || branchLoading ? (
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
              {/* English Program - Levels Multi-Select */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">English Program (Select your starting level) *</Label>
                <MultiSelect
                  options={levelMultiSelectOptions}
                  selected={selectedLevels}
                  onChange={setSelectedLevels}
                  placeholder="Select levels..."
                />
                {branchId && filteredOptions.allowedTimings.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Available timings: {filteredOptions.allowedTimings.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Courses Multi-Select */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Courses (You can select multiple) *</Label>
                <MultiSelect
                  options={courseMultiSelectOptions}
                  selected={selectedCourses}
                  onChange={setSelectedCourses}
                  placeholder="Select courses..."
                />
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
