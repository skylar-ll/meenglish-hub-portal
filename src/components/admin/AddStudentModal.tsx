import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { studentSignupSchema } from "@/lib/validations";
import { ArrowRight, ArrowLeft, Pencil, Check, X, Loader2 } from "lucide-react";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { EditFormConfigModal } from "./EditFormConfigModal";
import { InlineEditableField } from "./InlineEditableField";
import { AddNewFieldButton } from "./AddNewFieldButton";
import { BillingFormStep } from "./shared/BillingFormStep";
import { generateBillingPDF } from "@/components/billing/BillingPDFGenerator";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { FloatingNavigationButton } from "../shared/FloatingNavigationButton";

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
}

export const AddStudentModal = ({ open, onOpenChange, onStudentAdded }: AddStudentModalProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [autoTranslationEnabled, setAutoTranslationEnabled] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const { courses, branches, paymentMethods, fieldLabels, courseDurations, timings, loading: configLoading, refetch } = useFormConfigurations();
  
  // Fetch auto-translation setting
  useEffect(() => {
    const fetchAutoTranslationSetting = async () => {
      const { data } = await supabase
        .from('form_configurations')
        .select('config_value')
        .eq('config_key', 'auto_translation_enabled')
        .single();
      
      setAutoTranslationEnabled(data?.config_value === 'true');
    };
    
    if (open) {
      fetchAutoTranslationSetting();
    }
  }, [open]);
  const [priceEditing, setPriceEditing] = useState<Record<string, boolean>>({});
  const [priceValues, setPriceValues] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startEditPrice = (id: string, current: number | null | undefined) => {
    setPriceValues((prev) => ({ ...prev, [id]: String(current ?? 0) }));
    setPriceEditing((prev) => ({ ...prev, [id]: true }));
  };

  const cancelEditPrice = (id: string) => {
    setPriceEditing((prev) => ({ ...prev, [id]: false }));
  };

  const savePrice = async (id: string) => {
    const raw = priceValues[id];
    const numeric = parseFloat(raw);
    if (isNaN(numeric)) {
      toast.error("Enter a valid price");
      return;
    }
    const { error } = await supabase
      .from("form_configurations")
      .update({ price: numeric })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update price");
      return;
    }
    toast.success("Price updated");
    setPriceEditing((prev) => ({ ...prev, [id]: false }));
    refetch();
  };
  
  const [formData, setFormData] = useState({
    fullNameAr: "",
    fullNameEn: "",
    phone1: "",
    phone2: "",
    email: "",
    id: "",
    password: "",
    courses: [] as string[],
    timing: "",
    branch: "",
    paymentMethod: "",
    courseDuration: "",
    customDuration: "",
    customDurationUnit: "months",
    countryCode1: "+966",
    countryCode2: "+966",
  });

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-translate Arabic name to English with debouncing
  useEffect(() => {
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

      if (formData.fullNameAr.trim() && !formData.fullNameEn) {
        setIsTranslating(true);
        
        translationTimeoutRef.current = setTimeout(async () => {
          try {
            const { data, error } = await supabase.functions.invoke('translate-name', {
              body: { arabicName: formData.fullNameAr }
            });

            if (error) throw error;

            if (data?.translatedName) {
              setFormData(prev => ({ ...prev, fullNameEn: data.translatedName }));
            }
          } catch (error) {
            console.error('Translation error:', error);
          } finally {
            setIsTranslating(false);
          }
        }, 800);
      } else if (!formData.fullNameAr.trim()) {
        setIsTranslating(false);
      }
    };

    checkAndTranslate();

    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, [formData.fullNameAr]);

  const toggleCourse = (courseValue: string) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.includes(courseValue)
        ? prev.courses.filter(c => c !== courseValue)
        : [...prev.courses, courseValue]
    }));
  };

  const handleNext = () => {
    // Allow free navigation between steps without validation
    if (step < 7) {
      setStep(step + 1);
    }
  };

  const handleSignatureSave = (dataUrl: string) => {
    setSignature(dataUrl);
  };

  const handleSubmit = async () => {
    // Validate all required fields before submission
    if (!formData.fullNameAr || !formData.fullNameEn || !formData.phone1 || !formData.email || !formData.id || !formData.password) {
      toast.error("Please fill in all required fields in Personal Information");
      return;
    }
    
    if (formData.courses.length === 0) {
      toast.error("Please select at least one course");
      return;
    }
    
    if (!formData.timing) {
      toast.error("Please select a timing");
      return;
    }
    
    if (!formData.branch) {
      toast.error("Please select a branch");
      return;
    }
    
    if (!formData.courseDuration && !formData.customDuration) {
      toast.error("Please select or enter a course duration");
      return;
    }
    
    if (!formData.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (!signature) {
      toast.error("Please sign the billing form");
      return;
    }

    try {
      setLoading(true);

      // Validate form data
      const validatedData = studentSignupSchema.parse({
        fullNameAr: formData.fullNameAr,
        fullNameEn: formData.fullNameEn,
        phone1: formData.countryCode1 + formData.phone1,
        phone2: formData.phone2 ? formData.countryCode2 + formData.phone2 : "",
        email: formData.email,
        id: formData.id,
        password: formData.password,
      });

      // Check if email already exists
      const { data: existingUsers } = await supabase
        .from('students')
        .select('email')
        .eq('email', validatedData.email);

      if (existingUsers && existingUsers.length > 0) {
        toast.error(`A student with email "${validatedData.email}" already exists. Please use a different email.`);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name_en: validatedData.fullNameEn,
            full_name_ar: validatedData.fullNameAr,
          },
        },
      });

      if (authError || !authData.user) {
        toast.error(`Authentication error: ${authError?.message}`);
        return;
      }

      // Assign student role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "student",
        });

      if (roleError) {
        toast.error("Failed to assign student role");
        return;
      }

      const ksaTimezone = "Asia/Riyadh";
      const now = new Date();
      const ksaDate = toZonedTime(now, ksaTimezone);

      // Upload signature to storage
      const signatureBlob = await fetch(signature).then(r => r.blob());
      const signatureFileName = `${authData.user.id}/signature_${Date.now()}.png`;
      
      const { data: signatureUpload, error: signatureError } = await supabase.storage
        .from('signatures')
        .upload(signatureFileName, signatureBlob);

      if (signatureError) throw signatureError;

      // Create student record
      const durationMonths = formData.customDuration 
        ? parseInt(formData.customDuration) 
        : parseInt(formData.courseDuration);

      // Calculate billing details
      const pricing = courseDurations.find(d => d.value === formData.courseDuration);
      const totalFee = pricing?.price || (durationMonths * 500);
      const discountPercent = 10;
      const feeAfterDiscount = totalFee * (1 - discountPercent / 100);

      // Determine which teachers to assign based on courses
      const assignedTeacherIds = new Set<string>();
      
      const { data: teachersData } = await supabase.from('teachers').select('id, full_name');
      const teachers = teachersData || [];
      const leoId = teachers.find(t => t.full_name.toLowerCase().includes('leo'))?.id;
      const lillyId = teachers.find(t => t.full_name.toLowerCase().includes('lilly'))?.id;
      const dorianId = teachers.find(t => t.full_name.toLowerCase().includes('dorian'))?.id;
      const ayshaId = teachers.find(t => t.full_name.toLowerCase().includes('aysha'))?.id;

      formData.courses.forEach(course => {
        const lowerCourse = course.toLowerCase();
        const courseNum = parseInt(course.match(/\d+/)?.[0] || "0");
        
        if ((courseNum >= 1 && courseNum <= 4) && leoId) assignedTeacherIds.add(leoId);
        if (((courseNum >= 5 && courseNum <= 9) || lowerCourse.includes('spanish') || lowerCourse.includes('italian')) && lillyId) assignedTeacherIds.add(lillyId);
        if (((courseNum >= 10 && courseNum <= 12) || lowerCourse.includes('arabic') || lowerCourse.includes('french') || lowerCourse.includes('chinese')) && dorianId) assignedTeacherIds.add(dorianId);
        if (((courseNum >= 10 && courseNum <= 12) || lowerCourse.includes('speaking')) && ayshaId) assignedTeacherIds.add(ayshaId);
      });

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .insert({
          id: authData.user.id,
          full_name_ar: validatedData.fullNameAr,
          full_name_en: validatedData.fullNameEn,
          phone1: validatedData.phone1,
          phone2: validatedData.phone2 || null,
          email: validatedData.email,
          national_id: validatedData.id,
          branch: formData.branch,
          program: formData.courses.join(', '),
          class_type: formData.courses.join(', '),
          payment_method: formData.paymentMethod,
          subscription_status: "active",
          course_duration_months: durationMonths,
        })
        .select()
        .single();

      if (studentError || !studentData) {
        toast.error("Failed to create student record");
        return;
      }

      // Insert teacher assignments
      if (assignedTeacherIds.size > 0) {
        const teacherAssignments = Array.from(assignedTeacherIds).map(teacherId => ({
          student_id: studentData.id,
          teacher_id: teacherId
        }));

        await supabase.from("student_teachers").insert(teacherAssignments);
      }

      // Create billing record
      const billingRecord = {
        student_id: authData.user.id,
        student_name_en: validatedData.fullNameEn,
        student_name_ar: validatedData.fullNameAr,
        phone: validatedData.phone1,
        course_package: formData.courses.join(', '),
        registration_date: format(ksaDate, "yyyy-MM-dd"),
        course_start_date: format(addDays(ksaDate, 1), "yyyy-MM-dd"),
        time_slot: formData.timing,
        level_count: durationMonths,
        total_fee: totalFee,
        discount_percentage: discountPercent,
        fee_after_discount: feeAfterDiscount,
        amount_paid: 0,
        amount_remaining: feeAfterDiscount,
        signature_url: signatureFileName,
        language: 'en',
        first_payment: feeAfterDiscount * 0.5,
        second_payment: feeAfterDiscount * 0.5,
      };

      const { data: billing, error: billingError } = await supabase
        .from('billing')
        .insert(billingRecord)
        .select()
        .single();

      if (billingError) throw billingError;

      // Generate and upload signed PDF
      try {
        const pdfBlob = await generateBillingPDF({
          student_id: authData.user.id,
          student_name_en: validatedData.fullNameEn,
          student_name_ar: validatedData.fullNameAr,
          phone: validatedData.phone1,
          course_package: formData.courses.join(', '),
          time_slot: formData.timing,
          registration_date: billingRecord.registration_date,
          course_start_date: billingRecord.course_start_date,
          level_count: durationMonths,
          total_fee: totalFee,
          discount_percentage: discountPercent,
          fee_after_discount: feeAfterDiscount,
          amount_paid: 0,
          amount_remaining: feeAfterDiscount,
          first_payment: feeAfterDiscount * 0.5,
          second_payment: feeAfterDiscount * 0.5,
          signature_url: signatureFileName,
        });

        const pdfPath = `${authData.user.id}/billing_${billing.id}.pdf`;
        const { error: pdfUploadError } = await supabase.storage
          .from('billing-pdfs')
          .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        
        if (pdfUploadError) throw pdfUploadError;

        // Save PDF path to billing record
        await supabase
          .from('billing')
          .update({ signed_pdf_url: pdfPath })
          .eq('id', billing.id);
      } catch (pdfErr) {
        console.error('PDF generation/upload failed:', pdfErr);
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({
          full_name_en: validatedData.fullNameEn,
          full_name_ar: validatedData.fullNameAr,
          phone1: validatedData.phone1,
          phone2: validatedData.phone2 || null,
          national_id: validatedData.id,
          branch: formData.branch,
          program: formData.courses.join(', '),
          class_type: formData.courses.join(', '),
          payment_method: formData.paymentMethod,
        })
        .eq("id", authData.user.id);

      toast.success("Student account created successfully!");
      
      // Reset form
      setFormData({
        fullNameAr: "",
        fullNameEn: "",
        phone1: "",
        phone2: "",
        email: "",
        id: "",
        password: "",
        courses: [],
        timing: "",
        branch: "",
        paymentMethod: "",
        courseDuration: "",
        customDuration: "",
        customDurationUnit: "months",
        countryCode1: "+966",
        countryCode2: "+966",
      });
      setStep(1);
      setSignature(null);
      
      onStudentAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating student:", error);
      if (error.errors) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to create student account");
      }
    } finally {
      setLoading(false);
    }
  };

  // Group courses by category
  const coursesByCategory = courses.reduce((acc, course) => {
    if (!acc[course.category]) {
      acc[course.category] = [];
    }
    acc[course.category].push(course);
    return acc;
  }, {} as Record<string, Array<{ id: string; value: string; label: string; category: string; price: number }>>);

  // Helper to get field label
  const getFieldLabel = (key: string) => {
    const field = fieldLabels.find(f => f.value === key);
    return field || { id: '', label: key, value: key };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Add New Student - Step {step} of 7</DialogTitle>
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? "Done Editing" : "Edit Form"}
              </Button>
            </div>
          </DialogHeader>

        {configLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Auto-Translation Toggle - Only shown in edit mode */}
            {isEditMode && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-translate-toggle" className="text-base font-semibold">
                      Auto-Translation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically translate Arabic names to English in Add New Student and Add Previous Student forms
                    </p>
                  </div>
                  <Switch
                    id="auto-translate-toggle"
                    checked={autoTranslationEnabled}
                    onCheckedChange={async (enabled) => {
                      try {
                        const { error } = await supabase
                          .from('form_configurations')
                          .update({ config_value: enabled ? 'true' : 'false' })
                          .eq('config_key', 'auto_translation_enabled');
                        
                        if (error) throw error;
                        
                        setAutoTranslationEnabled(enabled);
                        toast.success(`Auto-translation ${enabled ? 'enabled' : 'disabled'}`);
                      } catch (error: any) {
                        toast.error(`Failed to update: ${error.message}`);
                      }
                    }}
                  />
                </div>
              </Card>
            )}

            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullNameAr">
                    <InlineEditableField
                      id={getFieldLabel('full_name_ar').id}
                      value={getFieldLabel('full_name_ar').label}
                      configType="field_label"
                      configKey="full_name_ar"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <Input
                    id="fullNameAr"
                    dir="rtl"
                    placeholder="الاسم الكامل"
                    value={formData.fullNameAr}
                    onChange={(e) => handleInputChange("fullNameAr", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullNameEn">
                    <InlineEditableField
                      id={getFieldLabel('full_name_en').id}
                      value={getFieldLabel('full_name_en').label}
                      configType="field_label"
                      configKey="full_name_en"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="fullNameEn"
                      placeholder="Full Name"
                      value={formData.fullNameEn}
                      onChange={(e) => handleInputChange("fullNameEn", e.target.value)}
                    />
                    {isTranslating && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Translating from Arabic...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone1">
                      <InlineEditableField
                        id={getFieldLabel('phone1').id}
                        value={getFieldLabel('phone1').label}
                        configType="field_label"
                        configKey="phone1"
                        isEditMode={isEditMode}
                        onUpdate={refetch}
                        isLabel={true}
                      />
                      {" *"}
                    </Label>
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
                        placeholder="XXX XXX XXX"
                        value={formData.phone1}
                        onChange={(e) => handleInputChange("phone1", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone2">
                      <InlineEditableField
                        id={getFieldLabel('phone2').id}
                        value={getFieldLabel('phone2').label}
                        configType="field_label"
                        configKey="phone2"
                        isEditMode={isEditMode}
                        onUpdate={refetch}
                        isLabel={true}
                      />
                    </Label>
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
                        placeholder="XXX XXX XXX"
                        value={formData.phone2}
                        onChange={(e) => handleInputChange("phone2", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <InlineEditableField
                      id={getFieldLabel('email').id}
                      value={getFieldLabel('email').label}
                      configType="field_label"
                      configKey="email"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id">
                    <InlineEditableField
                      id={getFieldLabel('national_id').id}
                      value={getFieldLabel('national_id').label}
                      configType="field_label"
                      configKey="national_id"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <Input
                    id="id"
                    placeholder="ID Number"
                    value={formData.id}
                    onChange={(e) => handleInputChange("id", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    <InlineEditableField
                      id={getFieldLabel('password').id}
                      value={getFieldLabel('password').label}
                      configType="field_label"
                      configKey="password"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password (min 8 characters)"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                  />
                </div>

                <Button onClick={handleNext} className="w-full">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Course Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Courses (Multiple selection allowed)</Label>

                {Object.keys(coursesByCategory).map((category) => {
                  const categoryCourses = coursesByCategory[category];
                  return (
                  <div key={category} className="space-y-3">
                    <h3 className="font-semibold text-primary">{category}</h3>
                    <div className="space-y-2">
                      {categoryCourses.map((course) => (
                        <div key={course.value} className="flex items-center p-2 rounded hover:bg-muted/50">
                          <div className="flex items-center space-x-2 flex-1">
                            <Checkbox
                              id={`course-${course.value}`}
                              checked={formData.courses.includes(course.value)}
                              onCheckedChange={() => toggleCourse(course.value)}
                            />
                            <div className="flex-1">
                              <InlineEditableField
                                id={course.id}
                                value={course.label}
                                configType="course"
                                configKey={course.value}
                                isEditMode={isEditMode}
                                onUpdate={refetch}
                                onDelete={refetch}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {isEditMode && (
                      <AddNewFieldButton
                        configType="course"
                        categoryName={category}
                        onAdd={refetch}
                      />
                    )}
                  </div>
                  );
                })}

                {formData.courses.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">Selected: {formData.courses.length} courses</p>
                  </div>
                )}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              </div>
            )}

            {/* Step 3: Timing Selection */}
            {step === 3 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Timing</Label>
                <div className="grid gap-3">
                  {timings.map((timing) => (
                    <Card
                      key={timing.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.timing === timing.value
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => handleInputChange("timing", timing.value)}
                    >
                      <p className="font-medium">
                        <InlineEditableField
                          id={timing.id}
                          value={timing.label}
                          configType="timing"
                          configKey={timing.value}
                          isEditMode={isEditMode}
                          onUpdate={refetch}
                          onDelete={refetch}
                        />
                      </p>
                    </Card>
                  ))}
                </div>
                
                {isEditMode && (
                  <AddNewFieldButton
                    configType="timing"
                    onAdd={refetch}
                  />
                )}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              </div>
            )}

            {/* Step 4: Branch Selection */}
            {step === 4 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Branch</Label>
                <div className="grid gap-3">
                  {branches.map((branch) => (
                    <Card
                      key={branch.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.branch === branch.value
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => handleInputChange("branch", branch.value)}
                    >
                      <p className="font-medium">
                        <InlineEditableField
                          id={branch.id}
                          value={branch.label}
                          configType="branch"
                          configKey={branch.value}
                          isEditMode={isEditMode}
                          onUpdate={refetch}
                          onDelete={refetch}
                        />
                      </p>
                    </Card>
                  ))}
                </div>
                
                {isEditMode && (
                  <AddNewFieldButton
                    configType="branch"
                    onAdd={refetch}
                  />
                )}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              </div>
            )}

            {/* Step 5: Course Duration */}
            {step === 5 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Course Duration</Label>
                <div className="grid gap-3">
                  {courseDurations.map((duration) => (
                    <Card
                      key={duration.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.courseDuration === duration.value && !formData.customDuration
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => {
                        handleInputChange("courseDuration", duration.value);
                        handleInputChange("customDuration", "");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          <InlineEditableField
                            id={duration.id}
                            value={duration.label}
                            configType="course_duration"
                            configKey={duration.value}
                            isEditMode={isEditMode}
                            onUpdate={refetch}
                            onDelete={refetch}
                          />
                        </p>
                        <div className="flex items-center gap-2">
                          {priceEditing[duration.id] ? (
                            <>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={priceValues[duration.id] ?? String(duration.price ?? 0)}
                                onChange={(e) => setPriceValues((prev) => ({ ...prev, [duration.id]: e.target.value }))}
                                className="h-8 w-24 text-right"
                              />
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); savePrice(duration.id); }}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); cancelEditPrice(duration.id); }}>
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-semibold text-primary">${(duration.price ?? 0).toFixed(2)}</span>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); startEditPrice(duration.id, duration.price); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {isEditMode && (
                  <AddNewFieldButton
                    configType="course_duration"
                    onAdd={refetch}
                  />
                )}

                <div className="space-y-2">
                  <Label>Or Enter Custom Duration</Label>
                  <div className="flex gap-2">
                    <Input
                      id="customDuration"
                      type="number"
                      min="1"
                      placeholder="Enter number"
                      className="flex-1"
                      value={formData.customDuration}
                      onChange={(e) => {
                        handleInputChange("customDuration", e.target.value);
                        handleInputChange("courseDuration", "");
                      }}
                    />
                    <Select
                      value={formData.customDurationUnit}
                      onValueChange={(value) => handleInputChange("customDurationUnit", value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>


                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Payment Method */}
            {step === 6 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Payment Method</Label>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => (
                    <Card
                      key={method.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.paymentMethod === method.value
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => handleInputChange("paymentMethod", method.value)}
                    >
                      <p className="font-medium">
                        <InlineEditableField
                          id={method.id}
                          value={method.label}
                          configType="payment_method"
                          configKey={method.value}
                          isEditMode={isEditMode}
                          onUpdate={refetch}
                          onDelete={refetch}
                        />
                      </p>
                    </Card>
                  ))}
                </div>

                {isEditMode && (
                  <AddNewFieldButton
                    configType="payment_method"
                    onAdd={refetch}
                  />
                )}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(5)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              </div>
            )}

            {/* Step 7: Billing Form with Signature */}
            {step === 7 && (
              <div className="space-y-4">
                <BillingFormStep
                  formData={formData}
                  onSignatureSave={handleSignatureSave}
                  signature={signature}
                  courseDurations={courseDurations}
                />

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(6)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-secondary" disabled={loading}>
                    {loading ? "Creating..." : "Create Student"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      
      {/* Floating Navigation Button */}
      {open && !configLoading && (
        <FloatingNavigationButton
          onNext={step === 7 ? handleSubmit : handleNext}
          onBack={step > 1 ? () => setStep(step - 1) : undefined}
          nextLabel={step === 7 ? "Create Student" : "Next"}
          backLabel="Back"
          loading={loading}
          showBack={step > 1}
          showNext={true}
        />
      )}
    </Dialog>
    </>
  );
};
