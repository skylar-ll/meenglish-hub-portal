import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Smartphone, DollarSign, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const Payment = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState("");

  const paymentMethods = [
    {
      value: "tamara",
      labelKey: "payment.tamara",
      descKey: "payment.tamaraDesc",
      icon: Smartphone,
    },
    {
      value: "taby",
      labelKey: "payment.tabby",
      descKey: "payment.tabbyDesc",
      icon: Smartphone,
    },
    {
      value: "cash",
      labelKey: "payment.cash",
      descKey: "payment.cashDesc",
      icon: DollarSign,
    },
    {
      value: "transfer",
      labelKey: "payment.transfer",
      descKey: "payment.transferDesc",
      icon: Building2,
    },
    {
      value: "card",
      labelKey: "payment.card",
      descKey: "payment.cardDesc",
      icon: CreditCard,
    },
  ];

  const handleConfirm = () => {
    if (!selectedMethod) {
      toast.error(t('student.selectPaymentError'));
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    const finalData = {
      ...registration,
      paymentMethod: selectedMethod,
      registrationDate: new Date().toISOString(),
    };

    // Store final registration data
    sessionStorage.setItem("studentRegistration", JSON.stringify(finalData));
    
    toast.success(t('student.registrationSuccess'));
    navigate("/student/course-page");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/branch-selection")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.back')}
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('student.paymentMethod')}
          </h1>
        </div>

        {/* Payment Selection Form */}
        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <Label>{t('student.selectPayment')}</Label>
            <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <Card
                    key={method.value}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedMethod === method.value
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedMethod(method.value)}
                  >
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value={method.value} id={method.value} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <method.icon className="w-4 h-4 text-primary" />
                          <Label
                            htmlFor={method.value}
                            className="text-base font-semibold cursor-pointer"
                          >
                            {t(method.labelKey)}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t(method.descKey)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>

            <div className="pt-4 space-y-4">
              <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                <h3 className="font-semibold mb-2 text-success">{t('student.paymentTerms')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('student.paymentTermsDesc')}
                </p>
              </div>

              <Button
                onClick={handleConfirm}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                size="lg"
              >
                {t('student.confirmSubscribe')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
