import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const StudentLogin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const provider = session.user.app_metadata?.provider;
        
        if (provider === 'google') {
          // Check if student exists with this email
          const { data: existingStudent } = await supabase
            .from("students")
            .select("*")
            .eq("email", session.user.email)
            .maybeSingle();

          if (existingStudent) {
            // Student exists - verify role and login
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "student")
              .maybeSingle();

            if (roleData) {
              // Set session data and redirect
              sessionStorage.removeItem("studentRegistration");
              const registrationData = {
                fullNameEn: existingStudent.full_name_en,
                fullNameAr: existingStudent.full_name_ar,
                email: existingStudent.email,
                program: existingStudent.program,
                classType: existingStudent.class_type,
                branch: existingStudent.branch,
                courseLevel: existingStudent.course_level,
                studentId: existingStudent.student_id,
                timing: existingStudent.timing,
                teacherId: existingStudent.teacher_id,
                registrationDate: existingStudent.registration_date,
                expirationDate: existingStudent.expiration_date,
              };
              sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));
              toast.success("Login successful!");
              navigate("/student/course");
              return;
            }
          }

          // Student doesn't exist - redirect to registration with prefilled data
          const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "";
          sessionStorage.setItem("googleOAuthData", JSON.stringify({
            fullNameAr: googleName,
            fullNameEn: googleName,
            email: "", // Leave empty for manual entry
            authProvider: "google",
            userId: session.user.id,
          }));
          toast.info("Please complete your registration");
          navigate("/student/signup");
        }
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Google login error:", error);
      toast.error(error.message || "Failed to login with Google");
      setGoogleLoading(false);
    }
  };

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

      // Verify student role - user must have 'student' role to login here
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "student")
        .maybeSingle();

      // User must have a student role to use this portal
      // Note: Users can have both student and teacher roles (e.g., staff taking courses)
      if (!roleData) {
        await supabase.auth.signOut();
        toast.error("This account does not have student access. Please use the teacher login.");
        return;
      }

      // Fetch student data from database (not sessionStorage)
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

      // Clear any old sessionStorage and set fresh data from DB
      sessionStorage.removeItem("studentRegistration");
      const registrationData = {
        fullNameEn: studentData.full_name_en,
        fullNameAr: studentData.full_name_ar,
        email: studentData.email,
        program: studentData.program,
        classType: studentData.class_type,
        branch: studentData.branch,
        courseLevel: studentData.course_level,
        studentId: studentData.student_id,
        timing: studentData.timing,
        teacherId: studentData.teacher_id,
        registrationDate: studentData.registration_date,
        expirationDate: studentData.expiration_date,
      };
      sessionStorage.setItem("studentRegistration", JSON.stringify(registrationData));

      toast.success("Login successful!");
      navigate("/student/course");
    } catch (error: any) {
      console.error("Login error:", error);
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
            {/* Google OAuth Button */}
            <Button
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              {googleLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('student.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('placeholder.studentEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('placeholder.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading || googleLoading}
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
