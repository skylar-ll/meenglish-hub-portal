import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { PartialPaymentStep } from "@/components/billing/PartialPaymentStep";
import { supabase } from "@/integrations/supabase/client";
import { toZonedTime } from "date-fns-tz";
import { format, addDays } from "date-fns";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";

const PartialPaymentSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [partialPaymentAmount, setPartialPaymentAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<any>(null);
  const ksaTimezone = "Asia/Riyadh";

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const storedData = sessionStorage.getItem("studentRegistration");
      if (!storedData) {
        toast.error("Registration data not found");
        navigate("/student/signup");
        return;
      }

      const registrationData = JSON.parse(storedData);

      // Fetch course pricing
      const durationMonths = registrationData.courseDurationMonths || 1;
      const { data: pricing } = await supabase
        .from('course_pricing')
        .select('*')
        .eq('duration_months', durationMonths)
        .single();

      const totalFee = pricing?.price || (durationMonths * 500);
      const discountPercent = 10;
      const feeAfterDiscount = totalFee * (1 - discountPercent / 100);

      const now = new Date();
      const ksaDate = toZonedTime(now, ksaTimezone);
      const registrationDate = format(ksaDate, "yyyy-MM-dd");
      const courseStartDate = format(addDays(ksaDate, 1), "yyyy-MM-dd");
      const paymentDeadline = format(addDays(ksaDate, 30), "yyyy-MM-dd");

      setBillingData({
        totalFee,
        discountPercent,
        feeAfterDiscount,
        registrationDate,
        courseStartDate,
        paymentDeadline,
        durationMonths,
      });
    } catch (error) {
      console.error("Error loading billing data:", error);
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (partialPaymentAmount === 0) {
      toast.error("Please select a payment amount");
      return;
    }

    const storedData = sessionStorage.getItem("studentRegistration");
    if (!storedData) {
      toast.error("Registration data not found");
      navigate("/student/signup");
      return;
    }

    const registrationData = JSON.parse(storedData);
    registrationData.partialPaymentAmount = partialPaymentAmount;
    sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));

    navigate("/student/billing-form");
  };

  if (loading || !billingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
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
            onClick={() => navigate("/student/payment-selection")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.back')}
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Payment Amount
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Choose how much you want to pay now
          </p>
        </div>

        <Card className="p-8 animate-slide-up">
          <PartialPaymentStep
            totalFee={billingData.totalFee}
            discountPercentage={billingData.discountPercent}
            feeAfterDiscount={billingData.feeAfterDiscount}
            courseStartDate={billingData.courseStartDate}
            paymentDeadline={billingData.paymentDeadline}
            onAmountChange={setPartialPaymentAmount}
          />

          <div className="mt-6 hidden md:flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/student/payment-selection")}
              className="flex-1"
            >
              {t('student.back')}
            </Button>
            <Button
              onClick={handleNext}
              disabled={partialPaymentAmount === 0}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              size="lg"
            >
              {t('student.next')}
            </Button>
          </div>
        </Card>

        <FloatingNavigationButton
          onNext={handleNext}
          onBack={() => navigate("/student/payment-selection")}
          nextLabel={t('student.next')}
          backLabel={t('student.back')}
          disabled={partialPaymentAmount === 0}
          showBack={true}
          showNext={true}
        />
      </div>
    </div>
  );
};

export default PartialPaymentSelection;
