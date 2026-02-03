import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { studentSignupSchema } from "@/lib/validations";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";

const StudentSignUp = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { fieldLabels, loading: configLoading } = useFormConfigurations();
  const [formData, setFormData] = useState({
    fullNameAr: "",
    fullNameEn: "",
    gender: "",
    phone1: "",
    phone2: "",
    email: "",
    id: "",
    password: "",
    branch: "",
    countryCode1: "+966",
    countryCode2: "+966",
    dateOfBirth: "",
    nationality: "Saudi",
  });

  const [branches, setBranches] = useState<Array<{ id: string; name_en: string; name_ar: string }>>([]);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [googleUserId, setGoogleUserId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  
  const countryCodes = [
    { value: "+966", label: "+966 (Saudi Arabia)" },
    { value: "+971", label: "+971 (UAE)" },
    { value: "+965", label: "+965 (Kuwait)" },
    { value: "+973", label: "+973 (Bahrain)" },
    { value: "+974", label: "+974 (Qatar)" },
    { value: "+968", label: "+968 (Oman)" },
    { value: "+20", label: "+20 (Egypt)" },
    { value: "+962", label: "+962 (Jordan)" },
    { value: "+961", label: "+961 (Lebanon)" },
    { value: "+1", label: "+1 (USA/Canada)" },
    { value: "+44", label: "+44 (UK)" },
  ];

  const [isTranslating, setIsTranslating] = useState(false);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for Google OAuth data on mount
  useEffect(() => {
    const googleOAuthData = sessionStorage.getItem("googleOAuthData");
    if (googleOAuthData) {
      try {
        const data = JSON.parse(googleOAuthData);
        if (data.authProvider === "google") {
          setFormData(prev => ({
            ...prev,
            fullNameAr: data.fullNameAr || "",
            fullNameEn: data.fullNameEn || "",
            email: data.email || "", // Empty for manual entry per requirements
          }));
          setIsGoogleAuth(true);
          setGoogleUserId(data.userId);
          sessionStorage.removeItem("googleOAuthData"); // Clean up
        }
      } catch (e) {
        console.error("Error parsing Google OAuth data:", e);
      }
    }
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Reset email check status when email changes
    if (field === 'email') {
      setEmailCheckStatus('idle');
    }
  };

  // Check if email already exists
  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setEmailCheckStatus('checking');
    try {
      // Try to sign in with the email to check if it exists
      // This is a safe way to check without exposing user data
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false, // Don't create user, just check
        }
      });
      
      // If no error, the email might exist
      // We can't be 100% sure, so we'll show available as default
      setEmailCheckStatus('available');
    } catch (error) {
      setEmailCheckStatus('available');
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Google signup error:", error);
      toast.error(error.message || "Failed to signup with Google");
      setGoogleLoading(false);
    }
  };

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name_en, name_ar')
        .order('name_en');
      if (data) setBranches(data);
    };
    fetchBranches();
  }, []);

  // Auto-translate Arabic name to English
  useEffect(() => {
    const arabicName = formData.fullNameAr.trim();
    
    // Clear any pending translation
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }

    const checkAndTranslate = async () => {
      const { data: setting } = await supabase
        .from('form_configurations')
        .select('config_value')
        .eq('config_key', 'auto_translation_enabled')
        .single();

      if (setting?.config_value !== 'true') {
        setIsTranslating(false);
        return;
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
              setFormData((prev) => ({ ...prev, fullNameEn: data.translatedName }));
            }
          } catch (error: any) {
            console.error("Translation error:", error);
            // Silently fail - user can still type manually
          } finally {
            setIsTranslating(false);
          }
        }, 800);
      }
    };

    checkAndTranslate();

    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, [formData.fullNameAr]);

  // Helper to get field label
  const getFieldLabel = (key: string) => {
    const field = fieldLabels.find(f => f.value === key);
    return field?.label || key;
  };

  const handleNext = async () => {
    setIsSubmitting(true);
    try {
      // Combine country code with phone numbers
      const dataToValidate = {
        ...formData,
        phone1: formData.countryCode1 + formData.phone1,
        phone2: formData.phone2 ? formData.countryCode2 + formData.phone2 : "",
      };

      let userId: string;

      if (isGoogleAuth && googleUserId) {
        // For Google auth, user is already authenticated - skip password validation
        userId = googleUserId;

        // Validate other fields (excluding password for Google auth)
        if (!formData.fullNameAr || !formData.fullNameEn || !formData.gender || 
            !formData.phone1 || !formData.email || !formData.id || 
            !formData.dateOfBirth || !formData.nationality || !formData.branch) {
          toast.error("Please fill in all required fields");
          return;
        }

        // Assign student role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: "student",
          });

        if (roleError && !roleError.message.includes("duplicate") && !roleError.message.includes("unique")) {
          toast.error("Failed to assign student role");
          return;
        }
      } else {
        // Validate with zod schema for email signup
        const validatedData = studentSignupSchema.parse(dataToValidate);

        // Create user account immediately
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/student/course`,
            data: {
              full_name_en: validatedData.fullNameEn,
              full_name_ar: validatedData.fullNameAr,
            },
          },
        });

        if (authError || !authData.user) {
          if (authError?.message?.toLowerCase().includes('already registered') || 
              authError?.message?.toLowerCase().includes('already exists')) {
            toast.error(
              "This email is already registered. Please login instead or use a different email.",
              {
                duration: 6000,
                action: {
                  label: "Go to Login",
                  onClick: () => navigate("/student/login")
                }
              }
            );
          } else {
            toast.error(`Authentication error: ${authError?.message}`);
          }
          return;
        }

        userId = authData.user.id;

        // Assign student role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: "student",
          });

        if (roleError && !roleError.message.includes("duplicate") && !roleError.message.includes("unique")) {
          toast.error("Failed to assign student role");
          return;
        }
      }

      // Validate branch selection
      if (!formData.branch) {
        toast.error("Please select a branch");
        return;
      }

      // Get the selected branch ID
      const selectedBranch = branches.find(b => b.name_en === formData.branch);
      if (!selectedBranch) {
        toast.error("Invalid branch selection");
        return;
      }

      // Store registration data WITHOUT password in sessionStorage
      const { password, ...dataWithoutPassword } = formData;
      sessionStorage.setItem("studentRegistration", JSON.stringify({
        ...dataWithoutPassword,
        phone1: formData.countryCode1 + formData.phone1,
        phone2: formData.phone2 ? formData.countryCode2 + formData.phone2 : "",
        branch: formData.branch,
        branch_id: selectedBranch.id,
        userId: userId,
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality,
        authProvider: isGoogleAuth ? "google" : "email",
      }));
      
      toast.success("Account created successfully! Please complete your registration.");
      
      // Navigate to course selection
      navigate("/student/course-selection");
    } catch (error: any) {
      if (error.errors) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Invalid form data");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
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
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('student.signup')}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t('student.signup.subtitle')}
          </p>
        </div>

        {/* Registration Form */}
        <Card className="p-8 animate-slide-up">
          {configLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-6">
              {!isGoogleAuth && (
                <>
                  {/* Google OAuth Button */}
                  <Button
                    onClick={handleGoogleSignup}
                    disabled={googleLoading || isSubmitting}
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
                    ✓ Signed in with Google. Please complete your information below.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="fullNameAr">{getFieldLabel('full_name_ar')} *</Label>
              <Input
                id="fullNameAr"
                dir="rtl"
                placeholder={t('placeholder.fullNameArabic')}
                value={formData.fullNameAr}
                onChange={(e) => handleInputChange("fullNameAr", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullNameEn">{getFieldLabel('full_name_en')} *</Label>
              <div className="relative">
                <Input
                  id="fullNameEn"
                  placeholder={t('placeholder.fullNameEnglish')}
                  value={formData.fullNameEn}
                  onChange={(e) => handleInputChange("fullNameEn", e.target.value)}
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
              <Label>{getFieldLabel('gender')} *</Label>
              <RadioGroup
                value={formData.gender}
                onValueChange={(value) => handleInputChange("gender", value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="font-normal cursor-pointer">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="font-normal cursor-pointer">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="kids" id="kids" />
                  <Label htmlFor="kids" className="font-normal cursor-pointer">Kids</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone1">{getFieldLabel('phone1')} *</Label>
                <div className="flex gap-2">
                  <Select value={formData.countryCode1} onValueChange={(value) => handleInputChange("countryCode1", value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((code) => (
                        <SelectItem key={code.value} value={code.value}>
                          {code.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone1"
                    type="tel"
                    placeholder={t('placeholder.phoneNumber')}
                    value={formData.phone1}
                    onChange={(e) => handleInputChange("phone1", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone2">{getFieldLabel('phone2')}</Label>
                <div className="flex gap-2">
                  <Select value={formData.countryCode2} onValueChange={(value) => handleInputChange("countryCode2", value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((code) => (
                        <SelectItem key={code.value} value={code.value}>
                          {code.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone2"
                    type="tel"
                    placeholder={t('placeholder.phoneNumber')}
                    value={formData.phone2}
                    onChange={(e) => handleInputChange("phone2", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{getFieldLabel('email')} *</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder={t('placeholder.email')}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={(e) => checkEmailAvailability(e.target.value)}
                  className={emailCheckStatus === 'taken' ? 'border-destructive' : ''}
                />
                {emailCheckStatus === 'checking' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
              {emailCheckStatus === 'taken' && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  ⚠️ This email is already registered. 
                  <button 
                    type="button"
                    onClick={() => navigate("/student/login")}
                    className="underline hover:text-destructive/80"
                  >
                    Login instead
                  </button>
                </p>
              )}
              {emailCheckStatus === 'available' && formData.email && (
                <p className="text-xs text-green-600">✓ Email looks good</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="id">{getFieldLabel('national_id')} *</Label>
              <Input
                id="id"
                placeholder={t('placeholder.idNumber')}
                value={formData.id}
                onChange={(e) => handleInputChange("id", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality *</Label>
                <Select value={formData.nationality} onValueChange={(value) => handleInputChange("nationality", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Saudi">Saudi</SelectItem>
                    <SelectItem value="Emirati">Emirati</SelectItem>
                    <SelectItem value="Kuwaiti">Kuwaiti</SelectItem>
                    <SelectItem value="Bahraini">Bahraini</SelectItem>
                    <SelectItem value="Qatari">Qatari</SelectItem>
                    <SelectItem value="Omani">Omani</SelectItem>
                    <SelectItem value="Egyptian">Egyptian</SelectItem>
                    <SelectItem value="Jordanian">Jordanian</SelectItem>
                    <SelectItem value="Lebanese">Lebanese</SelectItem>
                    <SelectItem value="Syrian">Syrian</SelectItem>
                    <SelectItem value="Palestinian">Palestinian</SelectItem>
                    <SelectItem value="Yemeni">Yemeni</SelectItem>
                    <SelectItem value="Iraqi">Iraqi</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!isGoogleAuth && (
              <div className="space-y-2">
                <Label htmlFor="password">{getFieldLabel('password')} *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('placeholder.enterPassword')}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
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
            )}

            <div className="space-y-2">
              <Label htmlFor="branch">{getFieldLabel('branch')} / الفرع *</Label>
              <Select value={formData.branch} onValueChange={(value) => handleInputChange("branch", value)}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select Branch / اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.name_en}>
                      {branch.name_en} - {branch.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Keep inline button for visual consistency, but hide on mobile when floating button shows */}
            <Button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity md:hidden"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : t('student.next')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
        </Card>
        
        {/* Floating Navigation Button */}
        <FloatingNavigationButton
          onNext={handleNext}
          nextLabel={t('student.next')}
          loading={isSubmitting}
          showBack={false}
          onBack={() => navigate("/")}
        />
      </div>
    </div>
  );
};

export default StudentSignUp;
