import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const StudentLogin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify student role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "student")
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        toast.error("Invalid student account");
        return;
      }

      // Fetch student data and store in sessionStorage
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (studentError || !studentData) {
        await supabase.auth.signOut();
        toast.error("Student profile not found");
        return;
      }

      // Store student data in sessionStorage for CoursePage
      const registrationData = {
        fullNameEn: studentData.full_name_en,
        fullNameAr: studentData.full_name_ar,
        email: studentData.email,
        program: studentData.program,
        classType: studentData.class_type,
        branch: studentData.branch,
        courseLevel: studentData.course_level,
      };
      sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));

      toast.success("Login successful!");
      navigate("/student/course");
    } catch (error: any) {
      toast.error(error.message || "Invalid email or password");
    } finally {
      setLoading(false);
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
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              size="lg"
            >
              {loading ? "Logging in..." : t('common.login')}
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
