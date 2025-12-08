import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimingOption {
  id: string;
  config_key: string;
  config_value: string;
  display_order: number;
}

interface ClassData {
  id: string;
  timing: string;
  branch_id: string | null;
  levels: string[] | null;
  courses: string[] | null;
}

const TimingSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [timingOptions, setTimingOptions] = useState<TimingOption[]>([]);
  const [selectedTimings, setSelectedTimings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowedTimings, setAllowedTimings] = useState<string[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [hasMultipleSelections, setHasMultipleSelections] = useState(false);

  useEffect(() => {
    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    setBranchId(registration.branch_id || null);
    fetchData(registration);
  }, []);

  const fetchData = async (registration: any) => {
    try {
      // Fetch all timing options for display
      const { data: timings, error: timingsError } = await supabase
        .from('form_configurations')
        .select('*')
        .eq('config_type', 'timing')
        .eq('is_active', true)
        .order('display_order');

      if (timingsError) throw timingsError;
      setTimingOptions(timings || []);

      // Fetch classes from admin to determine allowed timings
      await fetchAllowedTimings(registration);
    } catch (error: any) {
      toast.error("Failed to load timing options");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllowedTimings = async (registration: any) => {
    try {
      const branchId = registration.branch_id;
      // course_level can be comma-separated string of multiple levels
      const courseLevelRaw = registration.course_level || "";
      // courses is an array of selected courses
      const selectedCourses = registration.courses || registration.courses_selected || [];

      // Parse course_level - split by comma to handle multiple selections
      const selectedLevels: string[] = courseLevelRaw
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      // Check if user has multiple levels/courses selected
      const totalSelections = selectedLevels.length + (selectedCourses?.length || 0);
      setHasMultipleSelections(totalSelections > 1);

      console.log("🎯 TimingSelection - Parsed selections:", {
        branchId,
        selectedLevels,
        selectedCourses,
        totalSelections,
        raw: { course_level: courseLevelRaw, courses: registration.courses }
      });

      // Fetch all active classes
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, timing, branch_id, levels, courses')
        .eq('status', 'active');

      if (error) throw error;

      if (!classes || classes.length === 0) {
        setAllowedTimings([]);
        return;
      }

      // Normalize for comparison
      const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Extract just the level key (e.g., "level1", "level2") for matching
      const extractLevelKey = (val: string): string | null => {
        if (!val) return null;
        const m = val.toLowerCase().match(/level[\s\-_]?(\d{1,2})/i);
        return m ? `level${m[1]}` : null;
      };

      // Filter classes that match student's selection
      const matchingClasses = classes.filter((cls: ClassData) => {
        // Must match branch if branch is selected
        if (branchId && cls.branch_id !== branchId) {
          return false;
        }

        const classLevels = cls.levels || [];
        const classCourses = cls.courses || [];

        // Check if ANY of the selected levels match this class
        let levelMatch = false;
        for (const selectedLevel of selectedLevels) {
          const selectedLevelKey = extractLevelKey(selectedLevel);
          
          if (selectedLevelKey) {
            // It's a level format - match by level key
            const matches = classLevels.some(level => {
              const classLevelKey = extractLevelKey(level);
              return classLevelKey === selectedLevelKey;
            });
            if (matches) {
              levelMatch = true;
              break;
            }
          } else {
            // It's a course like "Speaking class" or "1:1 class" - check in courses
            const matches = classCourses.some(classCourse =>
              normalizeStr(classCourse).includes(normalizeStr(selectedLevel)) ||
              normalizeStr(selectedLevel).includes(normalizeStr(classCourse))
            );
            if (matches) {
              levelMatch = true;
              break;
            }
          }
        }

        // Check if ANY of the selected courses match this class
        let courseMatch = false;
        if (selectedCourses && selectedCourses.length > 0) {
          courseMatch = selectedCourses.some((course: string) =>
            classCourses.some(classCourse =>
              normalizeStr(classCourse).includes(normalizeStr(course)) ||
              normalizeStr(course).includes(normalizeStr(classCourse))
            )
          );
        }

        // Match if either level or course matches
        return levelMatch || courseMatch;
      });

      console.log("🎯 TimingSelection - Matching classes:", matchingClasses.map(c => ({ timing: c.timing, levels: c.levels, courses: c.courses })));

      // Extract unique timings from matching classes
      const timings = [...new Set(matchingClasses.map(cls => cls.timing))];
      setAllowedTimings(timings);

      console.log("🎯 TimingSelection - Allowed timings:", timings);

      // Clear any selected timings that are no longer allowed
      setSelectedTimings(prev => prev.filter(t => 
        timings.some(allowed => normalizeTimingForComparison(allowed) === normalizeTimingForComparison(t))
      ));
    } catch (error) {
      console.error("Error fetching allowed timings:", error);
      setAllowedTimings([]);
    }
  };

  const normalizeTimingForComparison = (s: string) => s.toLowerCase().replace(/[^a-z0-9:.-]/g, '');

  const isTimingAllowed = (timingValue: string): boolean => {
    if (allowedTimings.length === 0) {
      return false;
    }
    
    return allowedTimings.some(allowed => 
      normalizeTimingForComparison(allowed) === normalizeTimingForComparison(timingValue) ||
      normalizeTimingForComparison(allowed).includes(normalizeTimingForComparison(timingValue)) ||
      normalizeTimingForComparison(timingValue).includes(normalizeTimingForComparison(allowed))
    );
  };

  const isTimingSelected = (timingValue: string): boolean => {
    return selectedTimings.some(selected => 
      normalizeTimingForComparison(selected) === normalizeTimingForComparison(timingValue)
    );
  };

  const handleTimingClick = (timingValue: string) => {
    if (!isTimingAllowed(timingValue)) {
      toast.error("❌ This timing is not available for your selected class/branch. / هذا التوقيت غير متاح للفصل أو الفرع المحدد.");
      return;
    }

    if (hasMultipleSelections && allowedTimings.length > 1) {
      // Multi-select mode: toggle selection
      setSelectedTimings(prev => {
        if (isTimingSelected(timingValue)) {
          return prev.filter(t => normalizeTimingForComparison(t) !== normalizeTimingForComparison(timingValue));
        } else {
          return [...prev, timingValue];
        }
      });
    } else {
      // Single-select mode
      setSelectedTimings([timingValue]);
    }
  };

  const handleNext = () => {
    if (selectedTimings.length === 0) {
      toast.error("Please select at least one timing");
      return;
    }

    // Store timing selection (as comma-separated string for multiple)
    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    registration.timing = selectedTimings.join(", ");
    registration.selectedTimings = selectedTimings;
    sessionStorage.setItem("studentRegistration", JSON.stringify(registration));

    navigate("/student/duration-selection");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 flex items-center justify-center">
        <p className="text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  const hasNoMatchingClasses = allowedTimings.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/level-selection")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.back')}
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Select Your Timing
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {hasMultipleSelections && allowedTimings.length > 1 
              ? "You can select multiple time slots for your different levels/courses"
              : "Choose your preferred class time"}
          </p>
          {hasMultipleSelections && allowedTimings.length > 1 && (
            <p className="text-xs text-primary mt-1">
              ✨ Multiple selection enabled - tap to select/deselect
            </p>
          )}
        </div>

        {hasNoMatchingClasses && (
          <Card className="p-4 mb-4 border-destructive/50 bg-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">
                No classes are currently available for your selected level/course and branch. 
                Please contact administration or go back and select different options.
              </p>
            </div>
          </Card>
        )}

        {selectedTimings.length > 0 && (
          <Card className="p-3 mb-4 border-primary/30 bg-primary/5">
            <p className="text-sm text-primary font-medium">
              Selected: {selectedTimings.join(" | ")}
            </p>
          </Card>
        )}

        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Available Time Slots
              {allowedTimings.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({allowedTimings.length} available)
                </span>
              )}
            </Label>
            
            <div className="grid gap-4">
              {timingOptions.map((timing) => {
                const isAllowed = isTimingAllowed(timing.config_value);
                const isSelected = isTimingSelected(timing.config_value);
                
                const timingCard = (
                  <Card
                    key={timing.id}
                    className={`p-6 transition-all ${
                      isSelected
                        ? "border-primary border-2 bg-primary/10 shadow-lg ring-2 ring-primary/20"
                        : isAllowed 
                          ? "hover:bg-muted/50 hover:shadow-md cursor-pointer border-muted"
                          : "opacity-50 cursor-not-allowed bg-muted/20 border-muted/30"
                    }`}
                    onClick={() => handleTimingClick(timing.config_value)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-lg flex-1">{timing.config_value}</p>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                      {!isAllowed && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          Not Available
                        </span>
                      )}
                    </div>
                  </Card>
                );

                if (!isAllowed) {
                  return (
                    <TooltipProvider key={timing.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {timingCard}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This timing is not available for your selected class.</p>
                          <p className="text-xs text-muted-foreground">هذا التوقيت غير متاح للفصل المحدد.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return timingCard;
              })}
            </div>

            {/* Mobile button */}
            <Button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity md:hidden"
              size="lg"
              disabled={selectedTimings.length === 0}
            >
              {t('student.next')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
        
        {/* Floating Navigation Button */}
        <FloatingNavigationButton
          onNext={handleNext}
          onBack={() => navigate("/student/level-selection")}
          nextLabel={t('student.next')}
          backLabel={t('student.back')}
          showBack={true}
          showNext={true}
        />
      </div>
    </div>
  );
};

export default TimingSelection;
