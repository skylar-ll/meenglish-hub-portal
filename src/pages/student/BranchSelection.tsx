import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";

interface Branch {
  id: string;
  name_en: string;
  name_ar: string;
  is_online: boolean;
}

const BranchSelection = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name_en");

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

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
    registrationData.branch_id = selectedBranch;
    sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));

    navigate("/student/duration-selection");
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
            {language === "ar" ? "الفرع" : "Branch"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {language === "ar" ? "اختر فرعك المفضل" : "Select your preferred branch location"}
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
                    key={branch.id}
                    className={`p-6 cursor-pointer transition-all ${
                      selectedBranch === branch.id
                        ? "border-primary border-2 bg-primary/5 shadow-lg"
                        : "hover:bg-muted/50 hover:shadow-md"
                    }`}
                    onClick={() => setSelectedBranch(branch.id)}
                  >
                    <p className="font-medium text-lg">
                      {language === "ar" ? branch.name_ar : branch.name_en}
                    </p>
                  </Card>
                ))}
              </div>

              {/* Hide inline button on mobile when floating button shows */}
              <Button
                onClick={handleNext}
                disabled={!selectedBranch}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity md:hidden"
                size="lg"
              >
                {t('student.next')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </Card>
        
        {/* Floating Navigation Button */}
        <FloatingNavigationButton
          onNext={handleNext}
          onBack={() => navigate("/student/signup")}
          nextLabel={t('student.next')}
          backLabel={t('student.back')}
          disabled={!selectedBranch}
          showBack={true}
          showNext={true}
        />
      </div>
    </div>
  );
};

export default BranchSelection;
