import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const StudentLogin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("email", email)
        .eq("password_hash", password)
        .maybeSingle();

      if (!student) {
        toast.error("Invalid email or password");
        return;
      }

      // Store student data in session
      sessionStorage.setItem("studentRegistration", JSON.stringify({
        fullNameAr: student.full_name_ar,
        fullNameEn: student.full_name_en,
        phone1: student.phone1,
        phone2: student.phone2,
        email: student.email,
        id: student.national_id,
        courses: student.class_type?.split(', ') || [],
        branch: student.branch,
        paymentMethod: student.payment_method,
        program: student.program,
        classType: student.class_type,
        courseLevel: student.course_level || student.program?.split(',')[0] || "level-1"
      }));

      toast.success("Login successful!");
      navigate("/student/course");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-md mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.backHome')}
          </Button>
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <UserCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('common.login')}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to access your course
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-6 animate-slide-up">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('student.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              size="lg"
            >
              {t('common.login')}
            </Button>

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                New student?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => navigate("/student/signup")}
                >
                  Complete your registration
                </Button>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentLogin;
