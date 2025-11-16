import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { useBranchFiltering } from "@/hooks/useBranchFiltering";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    if (selectedCourses.length === 0 && selectedLevels.length === 0) {
      toast.error("Please select at least one option (course or level)");
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
              {/* Branch Information Banner - Only show if courses are being filtered */}
              {branchId && filteredOptions.allowedCourses.length > 0 && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span>📍</span>
                    Courses available in your branch:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filteredOptions.allowedCourses.map((course, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full"
                      >
                        {course}
                      </span>
                    ))}
                  </div>
                  {filteredOptions.allowedTimings.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Available timings: {filteredOptions.allowedTimings.join(', ')}
                    </p>
                  )}
                </div>
              )}
              {/* English Program - Levels (from classes and form_configurations) */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">English Program (Select your starting level)</Label>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {englishLevelOptions.map((level) => {
                    const extractLevelKey = (val: string): string | null => {
                      if (!val) return null;
                      const m = val.toLowerCase().match(/level[\s\-_]?(\d{1,2})/i);
                      return m ? `level-${m[1]}` : null;
                    };
                    const normalize = (str: string) =>
                      (str || "")
                        .toLowerCase()
                        .trim()
                        .replace(/[\s\-_]/g, "")
                        .replace(/[أإآا]/g, "ا")
                        .replace(/[ىي]/g, "ي");

                    const key = extractLevelKey(level.config_key) || extractLevelKey(level.config_value);
                    const isAvailable = branchId
                      ? (key
                          ? filteredOptions.allowedLevelKeys.includes(key)
                          : filteredOptions.allowedLevels.some((al) => {
                              const a = normalize(al);
                              const b = normalize(level.config_value);
                              return a.includes(b) || b.includes(a);
                            }))
                      : true;

                    const item = (
                      <div
                        key={level.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          isAvailable ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => isAvailable && toggleLevel(level.config_value)}
                      >
                        <Checkbox
                          id={`lvl-${level.id}`}
                          checked={selectedLevels.includes(level.config_value)}
                          onCheckedChange={() => isAvailable && toggleLevel(level.config_value)}
                          disabled={!isAvailable}
                        />
                        <label htmlFor={`lvl-${level.id}`} className={`text-sm flex-1 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                          {level.config_value}
                        </label>
                      </div>
                    );

                    if (!isAvailable) {
                      return (
                        <TooltipProvider key={level.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>{item}</TooltipTrigger>
                            <TooltipContent>
                              <p>This level is not available for your selected branch.</p>
                              <p className="text-xs text-muted-foreground">هذا المستوى غير متاح في هذا الفرع.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }

                    return item;
                  })}
                </div>
                {branchId && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Available timings for your branch: {filteredOptions.allowedTimings.join(', ') || '—'}
                    </p>
                  </div>
                )}
                {selectedLevels.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">Selected: {selectedLevels.length} level(s)</p>
                  </div>
                )}
              </div>

              {/* Courses */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Your Courses (You can select multiple)</Label>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {Object.keys(coursesByCategory).map(category => {
                    const coursesInCategory = coursesByCategory[category];
                    return (
                      <div key={category} className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">{category}</h3>
                        {coursesInCategory.map((course) => {
                          // More flexible matching: normalize and compare
                          const normalizeForMatch = (str: string) => 
                            str.toLowerCase()
                              .trim()
                              .replace(/[\s\-_]/g, '') // Remove spaces, hyphens, underscores
                              .replace(/[أإآا]/g, 'ا') // Normalize Arabic alef variants
                              .replace(/[ىي]/g, 'ي');  // Normalize Arabic ya variants
                          
                          const isAvailable = branchId 
                            ? filteredOptions.allowedCourses.some(allowedCourse => {
                                const normalizedAllowed = normalizeForMatch(allowedCourse);
                                const normalizedCourse = normalizeForMatch(course.value);
                                
                                // Check if either contains the other (flexible matching)
                                const matches = normalizedAllowed.includes(normalizedCourse) || 
                                               normalizedCourse.includes(normalizedAllowed);
                                
                                if (branchId && course.value) {
                                  console.log(`🔍 Matching "${course.value}":`, {
                                    allowedCourse,
                                    normalizedCourse,
                                    normalizedAllowed,
                                    matches
                                  });
                                }
                                
                                return matches;
                              })
                            : true;
                          
                          const courseItem = (
                            <div 
                              key={course.value} 
                              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                                isAvailable ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                              }`}
                              onClick={() => {
                                if (isAvailable) {
                                  toggleCourse(course.value);
                                } else {
                                  toast.error("❌ This option isn't available for your selected branch. / هذا الخيار غير متاح في هذا الفرع.");
                                }
                              }}
                            >
                              <Checkbox
                                id={course.value}
                                checked={selectedCourses.includes(course.value)}
                                onCheckedChange={() => isAvailable && toggleCourse(course.value)}
                                disabled={!isAvailable}
                              />
                              <label
                                htmlFor={course.value}
                                className={`text-sm flex-1 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                              >
                                {course.label}
                              </label>
                            </div>
                          );

                          if (!isAvailable) {
                            return (
                              <TooltipProvider key={course.value}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {courseItem}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>This option is not available for your selected branch.</p>
                                    <p className="text-xs text-muted-foreground">هذا الخيار غير متاح في هذا الفرع.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }

                          return courseItem;
                        })}
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
