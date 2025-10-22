import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";

const CourseDurationSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { courseDurations, loading } = useFormConfigurations();
  const [selectedDuration, setSelectedDuration] = useState("");
  const [customDuration, setCustomDuration] = useState("");

  const handleNext = () => {
    if (!selectedDuration && !customDuration) {
      toast.error("Please select or enter a course duration");
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    const durationMonths = customDuration ? parseInt(customDuration) : parseInt(selectedDuration);
    
    const durationData = {
      ...registration,
      courseDurationMonths: durationMonths,
    };
    sessionStorage.setItem("studentRegistration", JSON.stringify(durationData));
    navigate("/student/branch-selection");
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
            Select Course Duration
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Choose how long you want to study
          </p>
        </div>

        {/* Duration Selection Form */}
        <Card className="p-8 animate-slide-up">
          {loading ? (
            <div className="text-center py-8">Loading duration options...</div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Duration</Label>
                <div className="grid gap-3">
                  {courseDurations.map((duration) => (
                    <Card
                      key={duration.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        selectedDuration === duration.value && !customDuration
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedDuration(duration.value);
                        setCustomDuration("");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{duration.label}</p>
                        <p className="text-lg font-bold text-primary">{(duration.price ?? 0).toLocaleString()} SAR</p>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="space-y-2 mt-6">
                  <Label htmlFor="customDuration">Or Enter Custom Duration (Months)</Label>
                  <Input
                    id="customDuration"
                    type="number"
                    min="1"
                    placeholder="Enter number of months"
                    value={customDuration}
                    onChange={(e) => {
                      setCustomDuration(e.target.value);
                      setSelectedDuration("");
                    }}
                  />
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

export default CourseDurationSelection;
