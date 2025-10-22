import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";

const TimingSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [selectedTiming, setSelectedTiming] = useState("");
  const password = location.state?.password;
  const { timings, loading } = useFormConfigurations();

  const handleNext = () => {
    if (!selectedTiming) {
      toast.error("Please select a timing");
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    const timingData = {
      ...registration,
      timing: selectedTiming,
    };
    sessionStorage.setItem("studentRegistration", JSON.stringify(timingData));
    navigate("/student/duration-selection", { state: { password } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        {/* Header */}
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
            Choose your preferred class schedule
          </p>
        </div>

        {/* Timing Selection Form */}
        <Card className="p-8 animate-slide-up">
          {loading ? (
            <div className="text-center py-8">Loading timings...</div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Available Timings</Label>
                <div className="grid gap-3">
                  {timings.map((timing) => (
                    <Card
                      key={timing.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        selectedTiming === timing.value
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setSelectedTiming(timing.value)}
                    >
                      <p className="font-medium">{timing.label}</p>
                    </Card>
                  ))}
                </div>
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
          )}
        </Card>
      </div>
    </div>
  );
};

export default TimingSelection;
