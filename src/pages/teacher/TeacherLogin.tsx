import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const TeacherLogin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast.error(t('teacher.loginError'));
      return;
    }

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: teacher } = await supabase
        .from("teachers")
        .select("*")
        .eq("email", loginEmail)
        .eq("password_hash", loginPassword)
        .maybeSingle();

      if (!teacher) {
        toast.error("Invalid email or password");
        return;
      }

      sessionStorage.setItem("teacherSession", JSON.stringify(teacher));
      toast.success(t('teacher.loginSuccess'));
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
    }
  };

  const handleSignup = async () => {
    if (!signupName || !signupEmail || !signupPassword) {
      toast.error(t('student.fillRequired'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Check if teacher already exists
      const { data: existingTeacher } = await supabase
        .from("teachers")
        .select("email")
        .eq("email", signupEmail)
        .maybeSingle();

      if (existingTeacher) {
        toast.error("This email is already registered. Please login instead.");
        return;
      }

      // Create new teacher account
      const { error } = await supabase
        .from("teachers")
        .insert({
          full_name: signupName,
          email: signupEmail,
          password_hash: signupPassword,
          student_count: 0
        } as any);

      if (error) {
        toast.error("Failed to create account. Please try again.");
        return;
      }

      toast.success("Account created successfully! Please login.");
      // Switch to login tab
      const loginTab = document.querySelector('[value="login"]') as HTMLElement;
      loginTab?.click();
    } catch (error) {
      console.error("Error during signup:", error);
      toast.error("An error occurred. Please try again.");
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
            {t('teacher.backHome')}
          </Button>
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
            <UserCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
            {t('teacher.login')}
          </h1>
        </div>

        {/* Login/Signup Tabs */}
        <Card className="p-6 animate-slide-up">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{t('common.login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('common.signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('teacher.email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="teacher@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('teacher.password')}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90"
                  size="lg"
                >
                  {t('common.login')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('student.fullNameEn')}</Label>
                  <Input
                    id="signup-name"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('teacher.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="teacher@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('teacher.password')}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleSignup}
                  className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90"
                  size="lg"
                >
                  {t('common.signup')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default TeacherLogin;
