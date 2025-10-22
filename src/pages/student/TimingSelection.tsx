import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface TimingOption {
  id: string;
  config_key: string;
  config_value: string;
  display_order: number;
}

const TimingSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [timingOptions, setTimingOptions] = useState<TimingOption[]>([]);
  const [selectedTiming, setSelectedTiming] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimingOptions();
  }, []);

  const fetchTimingOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('form_configurations')
        .select('*')
        .eq('config_type', 'timing')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      setTimingOptions(data || []);
    } catch (error: any) {
      toast.error("Failed to load timing options");
      console.error(error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/teacher-selection")}
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

        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Available Time Slots
            </Label>
            
            <div className="grid gap-4">
              {timingOptions.map((timing) => (
                <Card
                  key={timing.id}
                  className={`p-6 cursor-pointer transition-all ${
                    selectedTiming === timing.config_value
                      ? "border-primary border-2 bg-primary/5 shadow-lg"
                      : "hover:bg-muted/50 hover:shadow-md"
                  }`}
                  onClick={() => setSelectedTiming(timing.config_value)}
                >
                  <p className="font-medium text-lg text-center">{timing.config_value}</p>
                </Card>
              ))}
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
        </Card>
      </div>
    </div>
  );
};

export default TimingSelection;
