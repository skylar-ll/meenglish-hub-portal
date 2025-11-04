import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";

const TermsAndConditions = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [agreed, setAgreed] = useState(false);
  const [termsContent, setTermsContent] = useState({ en: "", ar: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("terms_and_conditions")
        .select("content_en, content_ar")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setTermsContent({ en: data.content_en, ar: data.content_ar });
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
      toast.error("Failed to load terms and conditions");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!agreed) {
      toast.error(
        language === "ar"
          ? "يجب الموافقة على الشروط والأحكام للمتابعة"
          : "You must agree to the Terms & Conditions to continue"
      );
      return;
    }

    const storedData = sessionStorage.getItem("studentRegistration");
    if (!storedData) {
      toast.error("Registration data not found");
      navigate("/student/signup");
      return;
    }

    const registrationData = JSON.parse(storedData);
    registrationData.agreedToTerms = true;
    sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));

    navigate("/student/billing");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-3xl mx-auto py-8">
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/payment-selection")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.back')}
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {language === "ar" ? "الشروط والأحكام" : "Terms and Conditions"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {language === "ar"
              ? "يرجى قراءة الشروط والأحكام والموافقة عليها"
              : "Please read and agree to the Terms & Conditions"}
          </p>
        </div>

        <Card className="p-8 animate-slide-up">
          {loading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <div className="space-y-6">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/20">
                <div className="space-y-4 text-sm leading-relaxed" dir={language === "ar" ? "rtl" : "ltr"}>
                  {language === "ar" ? (
                    <div className="whitespace-pre-wrap">{termsContent.ar}</div>
                  ) : (
                    <div className="whitespace-pre-wrap">{termsContent.en}</div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex items-start space-x-3 space-x-reverse" dir={language === "ar" ? "rtl" : "ltr"}>
                <Checkbox
                  id="terms"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                  className="mt-1"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  {language === "ar"
                    ? "أوافق على الشروط والأحكام"
                    : "I agree to the Terms & Conditions"}
                </Label>
              </div>

              <Button
                onClick={handleNext}
                disabled={!agreed}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity md:hidden"
                size="lg"
              >
                {t('student.next')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </Card>

        <FloatingNavigationButton
          onNext={handleNext}
          onBack={() => navigate("/student/payment-selection")}
          nextLabel={t('student.next')}
          backLabel={t('student.back')}
          disabled={!agreed}
          showBack={true}
          showNext={true}
        />
      </div>
    </div>
  );
};

export default TermsAndConditions;
