import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, UserCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { teacherSignupSchema, loginSchema } from "@/lib/validations";

const TeacherLogin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("signup") === "true" ? "signup" : "login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupNameAr, setSignupNameAr] = useState("");
  const [signupNameEn, setSignupNameEn] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const availableCourses = [
    "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6",
    "Level 7", "Level 8", "Level 9", "Level 10", "Level 11", "Level 12",
    "Spanish", "Italian", "Arabic", "French", "Chinese", "Speaking Classes"
  ];

  const toggleCourse = (course: string) => {
    setSelectedCourses(prev => 
      prev.includes(course) 
        ? prev.filter(c => c !== course)
        : [...prev, course]
    );
  };

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const provider = session.user.app_metadata?.provider;
        
        if (provider === 'google') {
          // Check if teacher exists with this email
          const { data: existingTeacher } = await supabase
            .from("teachers")
            .select("*")
            .eq("email", session.user.email)
            .maybeSingle();

          if (existingTeacher) {
            // Teacher exists - verify role and login
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "teacher")
              .maybeSingle();

            if (roleData) {
              toast.success(t('teacher.loginSuccess'));
              navigate("/teacher/dashboard");
              return;
            }
          }

          // Teacher doesn't exist - switch to signup tab with prefilled data
          const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "";
          const googleEmail = session.user.email || "";
          
          setSignupNameAr(googleName);
          setSignupNameEn(googleName);
          setSignupEmail(googleEmail);
          setIsGoogleAuth(true);
          setActiveTab("signup");
          toast.info("Please select the courses you will teach to complete registration");
        }
      }
    };

    handleOAuthCallback();
  }, [navigate, t]);

  // Auto-translate Arabic name to English
  useEffect(() => {
    const arabicName = signupNameAr.trim();
    
    // Clear any pending translation
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }

    // Check if there's Arabic text (contains Arabic characters)
    const hasArabic = /[\u0600-\u06FF]/.test(arabicName);
    
    if (arabicName && hasArabic) {
      setIsTranslating(true);
      
      // Debounce translation by 800ms
      translationTimeoutRef.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('translate-name', {
            body: { arabicName }
          });

          if (error) throw error;

          if (data?.translatedName) {
            setSignupNameEn(data.translatedName);
          }
        } catch (error: any) {
          console.error("Translation error:", error);
          // Silently fail - user can still type manually
        } finally {
          setIsTranslating(false);
        }
      }, 800);
    }

    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, [signupNameAr]);

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
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (error: any) {
      toast.error(error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      // Clear any stale impersonation flags before logging in
      localStorage.removeItem('impersonating_teacher');
      localStorage.removeItem('teacher_name');
      localStorage.removeItem('admin_session');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      // Verify teacher role (and make sure this isn't a student account)
      const { data: teacherRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "teacher")
        .maybeSingle();

      const { data: studentRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "student")
        .maybeSingle();

      if (!teacherRole || studentRole) {
        await supabase.auth.signOut();
        toast.error("Invalid teacher account");
        return;
      }

      toast.success(t('teacher.loginSuccess'));
      navigate("/teacher/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    // For Google auth, skip password validation
    if (!isGoogleAuth) {
      try {
        teacherSignupSchema.parse({
          fullName: signupNameEn,
          email: signupEmail,
          password: signupPassword,
        });
      } catch (error: any) {
        toast.error(error.errors[0].message);
        return;
      }
    } else {
      // For Google auth, just validate name
      if (!signupNameEn.trim()) {
        toast.error("Please enter your name");
        return;
      }
    }

    // Check courses selection
    if (selectedCourses.length === 0) {
      toast.error("Please select at least one course you will teach");
      return;
    }

    setLoading(true);
    try {
      let userId: string;

      if (isGoogleAuth) {
        // For Google auth, user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          toast.error("Session expired. Please try again.");
          setIsGoogleAuth(false);
          return;
        }
        userId = session.user.id;
      } else {
        // Create auth user for email signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: signupEmail,
          password: signupPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name_en: signupNameEn,
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user");
        userId = authData.user.id;
      }

      // Assign teacher role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "teacher" });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        if (!roleError.message.includes("duplicate") && !roleError.message.includes("unique")) {
          throw new Error("Failed to assign teacher role: " + roleError.message);
        }
      }

      // Prepare courses string
      const coursesString = selectedCourses.join(", ");

      // Save teacher information to teachers table
      const { error: teacherError } = await supabase
        .from("teachers")
        .insert({
          id: userId,
          full_name: signupNameEn,
          email: signupEmail,
          student_count: 0,
          courses_assigned: coursesString,
        });

      if (teacherError) {
        console.error("Teacher record error:", teacherError);
        throw new Error("Failed to create teacher record: " + teacherError.message);
      }

      toast.success(`Account created! Assigned courses: ${coursesString}`);
      
      // Check for active session and redirect
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setTimeout(() => navigate("/teacher/dashboard"), 1500);
      } else {
        // Fallback: show login tab if auto-login not enabled
        setActiveTab("login");
        setIsGoogleAuth(false);
        toast.info("Please log in with your new account");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to create account");
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{t('common.login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('common.signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
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
                  <Label htmlFor="login-email">{t('teacher.email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="teacher@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('teacher.password')}</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder={t('placeholder.password')}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleLogin}
                  disabled={loading || googleLoading}
                  className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90"
                  size="lg"
                >
                  {loading ? "Logging in..." : t('common.login')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
                {!isGoogleAuth && (
                  <>
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
                  </>
                )}

                {isGoogleAuth && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-green-800">
                      ✓ Signed in with Google. Just select your courses below to complete registration.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-name-ar">{t('student.fullNameAr')}</Label>
                  <Input
                    id="signup-name-ar"
                    dir="rtl"
                    placeholder={t('placeholder.fullNameArabic')}
                    value={signupNameAr}
                    onChange={(e) => setSignupNameAr(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name-en">{t('student.fullNameEn')}</Label>
                  <div className="relative">
                    <Input
                      id="signup-name-en"
                      placeholder={t('placeholder.teacherName')}
                      value={signupNameEn}
                      onChange={(e) => setSignupNameEn(e.target.value)}
                    />
                    {isTranslating && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                  {isTranslating && (
                    <p className="text-xs text-muted-foreground">{t('translation.translating')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('teacher.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="teacher@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={isGoogleAuth}
                  />
                </div>

                {!isGoogleAuth && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('teacher.password')}</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder={t('placeholder.password')}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Min 8 characters
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Courses You Will Teach</Label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-background">
                    <div className="grid grid-cols-2 gap-2">
                      {availableCourses.map((course) => (
                        <label
                          key={course}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCourses.includes(course)}
                            onChange={() => toggleCourse(course)}
                            className="w-4 h-4 rounded border-primary"
                          />
                          <span className="text-sm">{course}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select the courses you will teach ({selectedCourses.length} selected)
                  </p>
                </div>

                <Button
                  onClick={handleSignup}
                  disabled={loading || googleLoading}
                  className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90"
                  size="lg"
                >
                  {loading ? "Creating account..." : t('common.signup')}
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
