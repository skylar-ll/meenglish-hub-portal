import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, AlertCircle } from "lucide-react";
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
  const [selectedTiming, setSelectedTiming] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [allowedTimings, setAllowedTimings] = useState<string[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);

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
      const selectedLevel = registration.course_level;
      const selectedCourses = registration.courses_selected || [];

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

      // Filter classes that match student's selection
      const matchingClasses = classes.filter((cls: ClassData) => {
        // Must match branch if branch is selected
        if (branchId && cls.branch_id !== branchId) {
          return false;
        }

        // Check if class has matching levels or courses
        const classLevels = cls.levels || [];
        const classCourses = cls.courses || [];

        // Normalize for comparison
        const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Check level match
        let levelMatch = false;
        if (selectedLevel) {
          levelMatch = classLevels.some(level => 
            normalizeStr(level).includes(normalizeStr(selectedLevel)) ||
            normalizeStr(selectedLevel).includes(normalizeStr(level))
          );
        }

        // Check course match
        let courseMatch = false;
        if (selectedCourses && selectedCourses.length > 0) {
          courseMatch = selectedCourses.some((course: string) =>
            classCourses.some(classCourse =>
              normalizeStr(classCourse).includes(normalizeStr(course)) ||
              normalizeStr(course).includes(normalizeStr(classCourse))
            )
          );
        }

        // Match if either level or course matches (since courses are optional)
        return levelMatch || courseMatch;
      });

      // Extract unique timings from matching classes
      const timings = [...new Set(matchingClasses.map(cls => cls.timing))];
      setAllowedTimings(timings);

      // If currently selected timing is no longer allowed, clear it
      if (selectedTiming && !timings.includes(selectedTiming)) {
        setSelectedTiming("");
      }
    } catch (error) {
      console.error("Error fetching allowed timings:", error);
      setAllowedTimings([]);
    }
  };

  const isTimingAllowed = (timingValue: string): boolean => {
    if (allowedTimings.length === 0) {
      // If no matching classes found, show warning but don't block
      return false;
    }
    
    // Normalize for comparison
    const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9:.-]/g, '');
    
    return allowedTimings.some(allowed => 
      normalizeStr(allowed) === normalizeStr(timingValue) ||
      normalizeStr(allowed).includes(normalizeStr(timingValue)) ||
      normalizeStr(timingValue).includes(normalizeStr(allowed))
    );
  };

  const handleNext = () => {
    if (!selectedTiming) {
      toast.error("Please select a timing");
      return;
    }

    // Store timing selection
    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    registration.timing = selectedTiming;
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
            Choose your preferred class time
          </p>
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

        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Available Time Slots
            </Label>
            
            <div className="grid gap-4">
              {timingOptions.map((timing) => {
                const isAllowed = isTimingAllowed(timing.config_value);
                const timingCard = (
                  <Card
                    key={timing.id}
                    className={`p-6 transition-all ${
                      selectedTiming === timing.config_value
                        ? "border-primary border-2 bg-primary/5 shadow-lg"
                        : isAllowed 
                          ? "hover:bg-muted/50 hover:shadow-md cursor-pointer"
                          : "opacity-50 cursor-not-allowed bg-muted/20"
                    }`}
                    onClick={() => {
                      if (isAllowed) {
                        setSelectedTiming(timing.config_value);
                      } else {
                        toast.error("❌ This timing is not available for your selected class/branch. / هذا التوقيت غير متاح للفصل أو الفرع المحدد.");
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-lg text-center flex-1">{timing.config_value}</p>
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

            {/* Hide inline button on mobile when floating button shows */}
            <Button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity md:hidden"
              size="lg"
              disabled={!selectedTiming}
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
