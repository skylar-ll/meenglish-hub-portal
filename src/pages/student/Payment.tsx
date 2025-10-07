import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Smartphone, DollarSign, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState("");

  const paymentMethods = [
    {
      value: "tamara",
      label: "Tamara",
      labelAr: "تمارا",
      icon: Smartphone,
      description: "Split into installments",
    },
    {
      value: "taby",
      label: "Tabby",
      labelAr: "تابي",
      icon: Smartphone,
      description: "Buy now, pay later",
    },
    {
      value: "cash",
      label: "Cash",
      labelAr: "نقداً",
      icon: DollarSign,
      description: "Pay in cash at branch",
    },
    {
      value: "transfer",
      label: "Bank Transfer",
      labelAr: "تحويل بنكي",
      icon: Building2,
      description: "Direct bank transfer",
    },
    {
      value: "card",
      label: "Credit/Debit Card",
      labelAr: "بطاقة ائتمان",
      icon: CreditCard,
      description: "Visa, Mastercard, Mada",
    },
  ];

  const handleConfirm = async () => {
    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    
    // Calculate next payment date (30 days from now)
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
    
    const finalData = {
      ...registration,
      paymentMethod: selectedMethod,
      registrationDate: new Date().toISOString(),
    };

    // Store final registration data
    sessionStorage.setItem("studentRegistration", JSON.stringify(finalData));
    
    // Save to database
    const { error } = await supabase
      .from('students')
      .insert({
        full_name_ar: registration.fullNameAr,
        full_name_en: registration.fullNameEn,
        phone1: registration.phone1,
        phone2: registration.phone2 || null,
        email: registration.email,
        national_id: registration.id,
        branch: registration.branch,
        program: registration.program,
        class_type: registration.classType,
        course_level: registration.courseLevel,
        payment_method: selectedMethod,
        subscription_status: 'active',
        next_payment_date: nextPaymentDate.toISOString().split('T')[0]
      });
    
    if (error) {
      console.error("Error saving student data:", error);
      toast.error("Registration failed. Please try again.");
      return;
    }
    
    toast.success("Registration completed successfully!");
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
            Back
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Payment Method
          </h1>
          <p className="text-xl text-muted-foreground" dir="rtl">
            طريقة الدفع
          </p>
        </div>

        {/* Payment Selection Form */}
        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <Label>Select Payment Method</Label>
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
                            {method.label}
                          </Label>
                          <span className="text-sm text-muted-foreground" dir="rtl">
                            ({method.labelAr})
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {method.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>

            <div className="pt-4 space-y-4">
              <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                <h3 className="font-semibold mb-2 text-success">Payment Terms</h3>
                <p className="text-sm text-muted-foreground">
                  Payment confirmation will be processed within 24 hours. You will receive access to your course materials once payment is verified.
                </p>
              </div>

              <Button
                onClick={handleConfirm}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                size="lg"
              >
                Confirm & Subscribe
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
