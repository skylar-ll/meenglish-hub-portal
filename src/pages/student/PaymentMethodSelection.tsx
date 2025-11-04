import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";

const PaymentMethodSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState("");
  const { paymentMethods, loading } = useFormConfigurations();

  const handleNext = () => {
    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }

    const storedData = sessionStorage.getItem("studentRegistration");
    if (!storedData) {
      toast.error("Registration data not found");
      navigate("/student/signup");
      return;
    }

    const registrationData = JSON.parse(storedData);
    registrationData.paymentMethod = selectedMethod;
    sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));

    navigate("/student/terms");
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
            Payment Method
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Select your preferred payment method
          </p>
        </div>

        <Card className="p-8 animate-slide-up">
          {loading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <div className="space-y-6">
              <Label className="text-lg font-semibold">
                Select Payment Method
              </Label>

              <div className="grid gap-4">
                {paymentMethods.map((method) => (
                  <Card
                    key={method.value}
                    className={`p-6 cursor-pointer transition-all ${
                      selectedMethod === method.value
                        ? "border-primary border-2 bg-primary/5 shadow-lg"
                        : "hover:bg-muted/50 hover:shadow-md"
                    }`}
                    onClick={() => setSelectedMethod(method.value)}
                  >
                    <p className="font-medium text-lg">{method.label}</p>
                  </Card>
                ))}
              </div>

              <Button
                onClick={handleNext}
                disabled={!selectedMethod}
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

export default PaymentMethodSelection;
