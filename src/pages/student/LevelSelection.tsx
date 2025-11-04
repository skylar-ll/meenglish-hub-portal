import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";
import { useBranchFiltering } from "@/hooks/useBranchFiltering";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LevelOption {
  id: string;
  config_key: string;
  config_value: string;
  display_order: number;
}

const LevelSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [levelOptions, setLevelOptions] = useState<LevelOption[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const { filteredOptions } = useBranchFiltering(branchId);

  useEffect(() => {
    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    setBranchId(registration.branch_id || null);
    fetchLevelOptions();
  }, []);

  const fetchLevelOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('form_configurations')
        .select('*')
        .eq('config_type', 'program')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      setLevelOptions(data || []);
    } catch (error: any) {
      toast.error("Failed to load level options");
      console.error(error);
    } finally {
      setLoading(false);
    }
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

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    registration.course_level = selectedLevels.join(", ");
    sessionStorage.setItem("studentRegistration", JSON.stringify(registration));

    navigate("/student/timing-selection");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 flex items-center justify-center">
        <p className="text-lg">{t('common.loading')}</p>
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
            Select Your Levels
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Choose the levels you want to study (You can select multiple)
          </p>
        </div>

        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Available Levels
            </Label>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {levelOptions.map((level) => {
                const matchesByKey = filteredOptions.allowedLevels.some(l =>
                  typeof l === 'string' && l.toLowerCase().includes(level.config_key.toLowerCase())
                );
                const matchesByValue = filteredOptions.allowedLevels.includes(level.config_value);
                const isAvailable = branchId ? (matchesByKey || matchesByValue) : true;
                const levelItem = (
                  <div 
                    key={level.id}
                    className={`flex items-center space-x-3 p-4 rounded-lg transition-colors ${
                      isAvailable ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                    } ${selectedLevels.includes(level.config_value) ? 'bg-primary/10 border-2 border-primary' : 'border border-border'}`}
                    onClick={() => {
                      if (isAvailable) {
                        toggleLevel(level.config_value);
                      } else {
                        toast.error("❌ This option isn't available for your selected branch. / هذا الخيار غير متاح في هذا الفرع.");
                      }
                    }}
                  >
                    <Checkbox
                      id={level.id}
                      checked={selectedLevels.includes(level.config_value)}
                      onCheckedChange={() => isAvailable && toggleLevel(level.config_value)}
                      disabled={!isAvailable}
                    />
                    <label
                      htmlFor={level.id}
                      className={`text-base font-medium flex-1 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      {level.config_value}
                    </label>
                  </div>
                );

                if (!isAvailable) {
                  return (
                    <TooltipProvider key={level.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {levelItem}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This option is not available for your selected branch.</p>
                          <p className="text-xs text-muted-foreground">هذا الخيار غير متاح في هذا الفرع.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return levelItem;
              })}
            </div>

            {selectedLevels.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium">Selected: {selectedLevels.length} level(s)</p>
              </div>
            )}

            <Button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity md:hidden"
              size="lg"
            >
              {t('student.next')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
        
        <FloatingNavigationButton
          onNext={handleNext}
          onBack={() => navigate("/student/course-selection")}
          nextLabel={t('student.next')}
          backLabel={t('student.back')}
          showBack={true}
          showNext={true}
        />
      </div>
    </div>
  );
};

export default LevelSelection;
