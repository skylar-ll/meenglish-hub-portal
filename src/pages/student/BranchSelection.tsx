import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const BranchSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [selectedBranch, setSelectedBranch] = useState("");
  const password = location.state?.password;

  const branches = [
    {
      value: "online",
      labelKey: "branch.online",
      descriptionKey: "branch.onlineDesc",
    },
    {
      value: "dammam",
      labelKey: "branch.dammam",
      descriptionKey: "branch.dammamDesc",
    },
    {
      value: "dhahran",
      labelKey: "branch.dhahran",
      descriptionKey: "branch.dhahranDesc",
    },
    {
      value: "khobar",
      labelKey: "branch.khobar",
      descriptionKey: "branch.khobarDesc",
    },
  ];

  const handleNext = () => {
    if (!selectedBranch) {
      toast.error(t('student.selectBranchError'));
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    const branchData = {
      ...registration,
      branch: selectedBranch,
    };
    sessionStorage.setItem("studentRegistration", JSON.stringify(branchData));
    navigate("/student/payment", { state: { password } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        {/* Header */}
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
            {t('student.branchSelection')}
          </h1>
        </div>

        {/* Branch Selection Form */}
        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <Label>{t('student.selectBranch')}</Label>
            <RadioGroup value={selectedBranch} onValueChange={setSelectedBranch}>
              <div className="space-y-4">
                {branches.map((branch) => (
                  <Card
                    key={branch.value}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedBranch === branch.value
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedBranch(branch.value)}
                  >
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value={branch.value} id={branch.value} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-primary" />
                          <Label
                            htmlFor={branch.value}
                            className="text-base font-semibold cursor-pointer"
                          >
                            {t(branch.labelKey)}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t(branch.descriptionKey)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>

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

export default BranchSelection;
