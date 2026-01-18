import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, UserCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
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

  // Check if already logged in as a teacher (not admin)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is an admin - if so, don't redirect (they might be viewing the page)
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        // If user is admin, don't auto-redirect - let them stay on this page
        if (adminRole) {
          return;
        }

        // Check if user has teacher role
        const { data: teacherRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "teacher")
          .maybeSingle();

        // Only redirect to dashboard if they're a teacher (not admin)
        if (teacherRole) {
          navigate("/teacher/dashboard");
        }
      }
    };
    checkSession();
  }, [navigate]);

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

      // Ensure teacher role exists for this user (idempotent)
      await supabase
        .from("user_roles")
        .upsert({ user_id: data.user.id, role: "teacher" }, { onConflict: "user_id,role", ignoreDuplicates: true });

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
    // Validate BEFORE any async operations
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

    // Check courses selection
    if (selectedCourses.length === 0) {
      toast.error("Please select at least one course you will teach");
      return;
    }

    setLoading(true);
    try {
      // Create auth user
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

      // Assign teacher role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: "teacher" });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        throw new Error("Failed to assign teacher role: " + roleError.message);
      }

      // Prepare courses string
      const coursesString = selectedCourses.join(", ");
      console.log("Saving courses:", coursesString); // Debug log

      // Save teacher information to teachers table
      const { error: teacherError, data: teacherData } = await supabase
        .from("teachers")
        .insert({
          id: authData.user.id,
          full_name: signupNameEn,
          email: signupEmail,
          student_count: 0,
          courses_assigned: coursesString,
        })
        .select();

      if (teacherError) {
        console.error("Teacher record error:", teacherError);
        throw new Error("Failed to create teacher record: " + teacherError.message);
      }

      console.log("Teacher record created:", teacherData); // Debug log

      toast.success(`Account created! Assigned courses: ${coursesString}`);
      
      // Check for active session and redirect
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setTimeout(() => navigate("/teacher/dashboard"), 1500);
      } else {
        // Fallback: show login tab if auto-login not enabled
        setActiveTab("login");
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
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90"
                  size="lg"
                >
                  {loading ? "Logging in..." : t('common.login')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
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
                  />
                </div>

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
                  disabled={loading}
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
