import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
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
  });

  const [branches, setBranches] = useState<Array<{ id: string; name_en: string; name_ar: string }>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Auto-translate Arabic name to English
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
      
      // Validate with zod schema
      const validatedData = studentSignupSchema.parse(dataToValidate);

      // Create user account immediately to avoid passing password through navigation
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
        // Check if user already exists
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

      // Assign student role immediately
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "student",
        });

      if (roleError) {
        // Only fail if it's not a duplicate role error
        if (!roleError.message.includes("duplicate") && !roleError.message.includes("unique")) {
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
      const { password, ...dataWithoutPassword } = validatedData;
      sessionStorage.setItem("studentRegistration", JSON.stringify({
        ...dataWithoutPassword,
        branch: formData.branch,
        branch_id: selectedBranch.id, // Save branch_id for filtering
        userId: authData.user.id, // Store user ID for later use
      }));
      
      toast.success("Account created successfully! Please complete your registration.");
      
      // Navigate to course selection (skip separate branch step)
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
