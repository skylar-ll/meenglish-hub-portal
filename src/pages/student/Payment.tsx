import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState("");
  const { paymentMethods, loading } = useFormConfigurations();
  const password = location.state?.password;

  const handleConfirm = async () => {
    if (!selectedMethod) {
      toast.error(t('student.selectPaymentError'));
      return;
    }

    if (!password) {
      toast.error("Session expired. Please start registration again.");
      navigate("/student/signup");
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    
    try {
      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registration.email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name_en: registration.fullNameEn,
            full_name_ar: registration.fullNameAr,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Assign student role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: "student" });

      if (roleError) throw roleError;

      // Update profile with additional data
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone1: registration.phone1,
          phone2: registration.phone2 || null,
          national_id: registration.id,
          program: registration.courses ? registration.courses.join(', ') : '',
          class_type: registration.courses ? registration.courses.join(', ') : '',
          branch: registration.branch,
          payment_method: selectedMethod,
          subscription_status: 'active',
          next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      // Also save to students table for backward compatibility
      const studentData: any = {
        full_name_ar: registration.fullNameAr,
        full_name_en: registration.fullNameEn,
        phone1: registration.phone1,
        phone2: registration.phone2 || null,
        email: registration.email,
        national_id: registration.id,
        program: registration.courses ? registration.courses.join(', ') : '',
        class_type: registration.courses ? registration.courses.join(', ') : '',
        branch: registration.branch,
        payment_method: selectedMethod,
        subscription_status: 'active',
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
      
      await supabase.from("students").insert(studentData);

      // Persist registration data for CoursePage
      const registrationData = {
        fullNameEn: registration.fullNameEn,
        fullNameAr: registration.fullNameAr,
        email: registration.email,
        program: registration.courses ? registration.courses.join(', ') : '',
        classType: registration.courses ? registration.courses.join(', ') : '',
        branch: registration.branch,
        courseLevel: registration.courseLevel || null,
      };
      sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));
      
      toast.success(t('student.registrationSuccess'));
      navigate("/student/course");
    } catch (error: any) {
      // Error logged server-side only in production
      toast.error(error.message || "An error occurred. Please try again.");
    }
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
          {loading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : (
            <div className="space-y-6">
              <Label>{t('student.selectPayment')}</Label>
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
          )}
        </Card>
      </div>
    </div>
  );
};

export default Payment;
