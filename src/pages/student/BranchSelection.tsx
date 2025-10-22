import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";

const BranchSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [selectedBranch, setSelectedBranch] = useState("");
  const { branches, loading } = useFormConfigurations();

  const password = location.state?.password;

  const handleNext = () => {
    if (!selectedBranch) {
      toast.error(t('student.selectBranchError'));
      return;
    }

    const storedData = sessionStorage.getItem("studentRegistration");
    if (!storedData) {
      toast.error("Registration data not found");
      navigate("/student/signup");
      return;
    }

    const registrationData = JSON.parse(storedData);
    registrationData.branch = selectedBranch;
    sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));

    navigate("/student/billing-form", { state: { password } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/duration-selection")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.back')}
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Branch
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Select your preferred branch location
          </p>
        </div>

        <Card className="p-8 animate-slide-up">
          {loading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <div className="space-y-6">
              <Label className="text-lg font-semibold">
                {t('student.selectBranch')}
              </Label>

              <div className="grid gap-4">
                {branches.map((branch) => (
                  <Card
                    key={branch.value}
                    className={`p-6 cursor-pointer transition-all ${
                      selectedBranch === branch.value
                        ? "border-primary border-2 bg-primary/5 shadow-lg"
                        : "hover:bg-muted/50 hover:shadow-md"
                    }`}
                    onClick={() => setSelectedBranch(branch.value)}
                  >
                    <p className="font-medium text-lg">{branch.label}</p>
                  </Card>
                ))}
              </div>

              <Button
                onClick={handleNext}
                disabled={!selectedBranch}
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

export default BranchSelection;
