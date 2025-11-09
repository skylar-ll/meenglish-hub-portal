import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { studentSignupSchema } from "@/lib/validations";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { useBranchFiltering } from "@/hooks/useBranchFiltering";
import { InlineEditableField } from "./InlineEditableField";
import { AddNewFieldButton } from "./AddNewFieldButton";
import { BillingFormStep } from "./shared/BillingFormStep";
import { generateBillingPDF } from "@/components/billing/BillingPDFGenerator";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { FloatingNavigationButton } from "../shared/FloatingNavigationButton";
import { PartialPaymentStep } from "@/components/billing/PartialPaymentStep";
import { autoEnrollStudent } from "@/utils/autoEnrollment";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AddPreviousStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
}

export const AddPreviousStudentModal = ({ open, onOpenChange, onStudentAdded }: AddPreviousStudentModalProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [autoTranslationEnabled, setAutoTranslationEnabled] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<number>(0);
  const [nextPaymentDate, setNextPaymentDate] = useState<Date | undefined>();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [levelOptions, setLevelOptions] = useState<Array<{ id: string; config_key: string; config_value: string; display_order: number }>>([]);
  const { courses, branches, paymentMethods, fieldLabels, courseDurations, timings, loading: configLoading, refetch } = useFormConfigurations();
  const { filteredOptions } = useBranchFiltering(selectedBranchId);
  
  const [isTranslating, setIsTranslating] = useState(false);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchAutoTranslationSetting = async () => {
      const { data } = await supabase
        .from('form_configurations')
        .select('config_value')
        .eq('config_key', 'auto_translation_enabled')
        .single();
      
      setAutoTranslationEnabled(data?.config_value === 'true');
    };
    
    const fetchLevels = async () => {
      try {
        const { data, error } = await supabase
          .from('form_configurations')
          .select('*')
          .eq('config_type', 'level')
          .eq('is_active', true)
          .order('display_order');
        if (error) throw error;
        setLevelOptions(data || []);
      } catch (e) {
        console.error('Failed to load levels', e);
      }
    };
    
    if (open) {
      fetchAutoTranslationSetting();
      fetchLevels();
    }
  }, [open]);

  const [formData, setFormData] = useState({
    fullNameAr: "",
    fullNameEn: "",
    gender: "",
    phone1: "",
    phone2: "",
    email: "",
    id: "",
    password: "",
    courses: [] as string[],
    selectedLevels: [] as string[],
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
    
    if (field === 'branch') {
      const branch = branches.find(b => b.value === value);
      setSelectedBranchId(branch?.id || null);
      setFormData(prev => ({ ...prev, timing: "" }));
    }
  };

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

  const toggleLevel = (levelValue: string) => {
    setFormData(prev => ({
      ...prev,
      selectedLevels: prev.selectedLevels.includes(levelValue)
        ? prev.selectedLevels.filter(l => l !== levelValue)
        : [...prev.selectedLevels, levelValue]
    }));
  };

  const handleNext = () => {
    if (step < 8) {
      setStep(step + 1);
    }
  };

  const handleSignatureSave = (dataUrl: string) => {
    setSignature(dataUrl);
  };

  const handleSubmit = async () => {
    if (!formData.fullNameAr || !formData.fullNameEn || !formData.gender || !formData.phone1 || !formData.email || !formData.id || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (formData.courses.length === 0 && formData.selectedLevels.length === 0) {
      toast.error("Please select at least one course or level");
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

    const pricing = courseDurations.find(d => d.value === formData.courseDuration);
    const durationMonths = formData.customDuration 
      ? parseInt(formData.customDuration) 
      : parseInt(formData.courseDuration);
    const totalFee = pricing?.price || (durationMonths * 500);
    const discountPercent = 10;
    const feeAfterDiscount = totalFee * (1 - discountPercent / 100);
    const remainingBalance = feeAfterDiscount - partialPaymentAmount;

    if (remainingBalance > 0 && !nextPaymentDate) {
      toast.error("Please select when you plan to pay the remaining balance");
      return;
    }

    try {
      setLoading(true);

      const validatedData = studentSignupSchema.parse({
        fullNameAr: formData.fullNameAr,
        fullNameEn: formData.fullNameEn,
        gender: formData.gender,
        phone1: formData.countryCode1 + formData.phone1,
        phone2: formData.phone2 ? formData.countryCode2 + formData.phone2 : "",
        email: formData.email,
        id: formData.id,
        password: formData.password,
      });

      const { data: existingUsers } = await supabase
        .from('students')
        .select('email')
        .eq('email', validatedData.email);

      if (existingUsers && existingUsers.length > 0) {
        toast.error(`A student with email "${validatedData.email}" already exists. Please use a different email.`);
        return;
      }

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

      const signatureBlob = await fetch(signature).then(r => r.blob());
      const signatureFileName = `${authData.user.id}/signature_${Date.now()}.png`;
      
      const { error: signatureError } = await supabase.storage
        .from('signatures')
        .upload(signatureFileName, signatureBlob);

      if (signatureError) throw signatureError;

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

      let actualBranchId = null;
      let actualStartDate = format(addDays(ksaDate, 1), "yyyy-MM-dd");
      
      if (formData.branch) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('id')
          .eq('name_en', formData.branch)
          .single();
        
        if (branchData) {
          actualBranchId = branchData.id;
          
          const { data: matchingClasses } = await supabase
            .from('classes')
            .select('start_date')
            .eq('branch_id', branchData.id)
            .eq('timing', formData.timing)
            .eq('status', 'active');
          
          if (matchingClasses && matchingClasses.length > 0) {
            const withDates = matchingClasses.filter(c => c.start_date);
            if (withDates.length > 0) {
              withDates.sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
              actualStartDate = withDates[0].start_date;
            }
          }
        }
      }

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .insert({
          id: authData.user.id,
          full_name_ar: validatedData.fullNameAr,
          full_name_en: validatedData.fullNameEn,
          gender: validatedData.gender,
          phone1: validatedData.phone1,
          phone2: validatedData.phone2 || null,
          email: validatedData.email,
          national_id: validatedData.id,
          branch_id: actualBranchId,
          branch: formData.branch,
          program: [...formData.courses, ...formData.selectedLevels].join(', '),
          class_type: [...formData.courses, ...formData.selectedLevels].join(', '),
          course_level: formData.selectedLevels.join(', ') || null,
          timing: formData.timing,
          payment_method: formData.paymentMethod,
          subscription_status: "active",
          course_duration_months: durationMonths,
          registration_date: format(ksaDate, "yyyy-MM-dd"),
          next_payment_date: nextPaymentDate ? format(nextPaymentDate, "yyyy-MM-dd") : null,
        })
        .select()
        .single();

      if (studentError || !studentData) {
        toast.error("Failed to create student record");
        return;
      }

      if (assignedTeacherIds.size > 0) {
        const teacherAssignments = Array.from(assignedTeacherIds).map(teacherId => ({
          student_id: studentData.id,
          teacher_id: teacherId
        }));

        await supabase.from("student_teachers").insert(teacherAssignments);
      }

      try {
        const result = await autoEnrollStudent({
          id: studentData.id,
          branch_id: actualBranchId || undefined,
          program: formData.courses[0] || undefined,
          courses: [...formData.courses, ...formData.selectedLevels],
          course_level: formData.selectedLevels.join(', '),
          timing: formData.timing,
        });
        
        if (result?.count) {
          console.log(`✅ Auto-enrolled in ${result.count} class(es)`);
        }
      } catch (enrollErr) {
        console.error('❌ Auto-enrollment failed:', enrollErr);
      }

      const billingRecord = {
        student_id: authData.user.id,
        student_name_en: validatedData.fullNameEn,
        student_name_ar: validatedData.fullNameAr,
        phone: validatedData.phone1,
        course_package: [...formData.courses, ...formData.selectedLevels].join(', '),
        registration_date: format(ksaDate, "yyyy-MM-dd"),
        course_start_date: actualStartDate,
        time_slot: formData.timing,
        level_count: durationMonths,
        total_fee: totalFee,
        discount_percentage: discountPercent,
        fee_after_discount: feeAfterDiscount,
        amount_paid: partialPaymentAmount,
        amount_remaining: feeAfterDiscount - partialPaymentAmount,
        signature_url: signatureFileName,
        language: 'en',
        first_payment: partialPaymentAmount,
        second_payment: feeAfterDiscount - partialPaymentAmount,
        payment_deadline: nextPaymentDate ? format(nextPaymentDate, "yyyy-MM-dd") : null,
      };

      const { data: billing, error: billingError } = await supabase
        .from('billing')
        .insert(billingRecord)
        .select()
        .single();

      if (billingError) throw billingError;

      try {
        const pdfBlob = await generateBillingPDF({
          student_id: authData.user.id,
          student_name_en: validatedData.fullNameEn,
          student_name_ar: validatedData.fullNameAr,
          phone: validatedData.phone1,
          course_package: [...formData.courses, ...formData.selectedLevels].join(', '),
          time_slot: formData.timing,
          registration_date: billingRecord.registration_date,
          course_start_date: billingRecord.course_start_date,
          level_count: durationMonths,
          total_fee: totalFee,
          discount_percentage: discountPercent,
          fee_after_discount: feeAfterDiscount,
          amount_paid: partialPaymentAmount,
          amount_remaining: feeAfterDiscount - partialPaymentAmount,
          first_payment: partialPaymentAmount,
          second_payment: feeAfterDiscount - partialPaymentAmount,
          signature_url: signatureFileName,
        });

        const pdfPath = `${authData.user.id}/billing_${billing.id}.pdf`;
        await supabase.storage
          .from('billing-pdfs')
          .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });

        await supabase
          .from('billing')
          .update({ signed_pdf_url: pdfPath })
          .eq('id', billing.id);
      } catch (pdfErr) {
        console.error('PDF error:', pdfErr);
      }

      await supabase
        .from("profiles")
        .update({
          full_name_en: validatedData.fullNameEn,
          full_name_ar: validatedData.fullNameAr,
          phone1: validatedData.phone1,
          phone2: validatedData.phone2 || null,
          national_id: validatedData.id,
          branch: formData.branch,
          program: [...formData.courses, ...formData.selectedLevels].join(', '),
          class_type: [...formData.courses, ...formData.selectedLevels].join(', '),
          payment_method: formData.paymentMethod,
        })
        .eq("id", authData.user.id);

      toast.success("Previous student created successfully!");
      
      setFormData({
        fullNameAr: "",
        fullNameEn: "",
        gender: "",
        phone1: "",
        phone2: "",
        email: "",
        id: "",
        password: "",
        courses: [],
        selectedLevels: [],
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
      setPartialPaymentAmount(0);
      setSelectedBranchId(null);
      
      onStudentAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.errors?.[0]?.message || "Failed to create student");
    } finally {
      setLoading(false);
    }
  };

  const levelLike = (val: string) => /^level[\s\-_]?\d+/i.test(val);
  const visibleCourses = courses.filter((c) => !levelLike(c.value));
  const coursesByCategory = visibleCourses.reduce((acc, course) => {
    if (!acc[course.category]) acc[course.category] = [];
    acc[course.category].push(course);
    return acc;
  }, {} as Record<string, Array<{ id: string; value: string; label: string; category: string; price: number }>>);

  const englishLevelOptions = levelOptions.length
    ? levelOptions
    : (filteredOptions.allowedLevels || []).map((v, i) => ({
        id: `fallback-${i}`,
        config_key: v,
        config_value: v,
        display_order: i,
      }));

  const extractLevelKey = (val: string): string | null => {
    if (!val) return null;
    const m = val.toLowerCase().match(/level[\s\-_]?(\d{1,2})/i);
    return m ? `level-${m[1]}` : null;
  };

  const normalize = (str: string) =>
    (str || "")
      .toLowerCase()
      .trim()
      .replace(/[\s\-_]/g, "")
      .replace(/[أإآا]/g, "ا")
      .replace(/[ىي]/g, "ي");

  const getFieldLabel = (key: string) => fieldLabels.find(f => f.value === key) || { id: '', label: key, value: key };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add Previous Student - Step {step} of 8</DialogTitle>
            <Button variant={isEditMode ? "default" : "outline"} size="sm" onClick={() => setIsEditMode(!isEditMode)}>
              {isEditMode ? "Done Editing" : "Edit Form"}
            </Button>
          </div>
        </DialogHeader>

        {configLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {isEditMode && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-translate-prev">Auto-Translation</Label>
                    <p className="text-sm text-muted-foreground">Automatically translate Arabic names</p>
                  </div>
                  <Switch
                    id="auto-translate-prev"
                    checked={autoTranslationEnabled}
                    onCheckedChange={async (enabled) => {
                      await supabase.from('form_configurations').update({ config_value: enabled ? 'true' : 'false' }).eq('config_key', 'auto_translation_enabled');
                      setAutoTranslationEnabled(enabled);
                      toast.success(`Auto-translation ${enabled ? 'enabled' : 'disabled'}`);
                    }}
                  />
                </div>
              </Card>
            )}

            {/* Step 1: Personal Information - Same as AddStudentModal */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label><InlineEditableField id={getFieldLabel("full_name_ar").id} value={getFieldLabel("full_name_ar").label} configType="field_label" configKey="full_name_ar" isEditMode={isEditMode} onUpdate={refetch} isLabel={true} /> *</Label>
                    <Input value={formData.fullNameAr} onChange={(e) => handleInputChange("fullNameAr", e.target.value)} placeholder="الاسم" dir="rtl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <InlineEditableField id={getFieldLabel("full_name_en").id} value={getFieldLabel("full_name_en").label} configType="field_label" configKey="full_name_en" isEditMode={isEditMode} onUpdate={refetch} isLabel={true} />
                      {isTranslating && <Loader2 className="w-3 h-3 animate-spin" />} *
                    </Label>
                    <Input value={formData.fullNameEn} onChange={(e) => handleInputChange("fullNameEn", e.target.value)} placeholder="Name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <RadioGroup value={formData.gender} onValueChange={(v) => handleInputChange("gender", v)}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male-prev" />
                        <Label htmlFor="male-prev" className="cursor-pointer font-normal">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female-prev" />
                        <Label htmlFor="female-prev" className="cursor-pointer font-normal">Female</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="kids" id="kids-prev" />
                        <Label htmlFor="kids-prev" className="cursor-pointer font-normal">Kids</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone 1 *</Label>
                    <div className="flex gap-2">
                      <Select value={formData.countryCode1} onValueChange={(v) => handleInputChange("countryCode1", v)}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{countryCodes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={formData.phone1} onChange={(e) => handleInputChange("phone1", e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone 2 (Optional)</Label>
                    <div className="flex gap-2">
                      <Select value={formData.countryCode2} onValueChange={(v) => handleInputChange("countryCode2", v)}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{countryCodes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={formData.phone2} onChange={(e) => handleInputChange("phone2", e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>National ID *</Label>
                  <Input value={formData.id} onChange={(e) => handleInputChange("id", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input type="password" value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)} />
                </div>
                <Button onClick={handleNext} className="w-full">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            )}

            {/* Remaining steps 2-8 are identical to AddStudentModal - Using condensed version for brevity */}
            {step === 2 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Branch *</Label>
                <div className="grid gap-3">
                  {branches.map((b) => (
                    <Card key={b.value} className={`p-4 cursor-pointer ${formData.branch === b.value ? "border-primary bg-primary/5" : ""}`} onClick={() => handleInputChange("branch", b.value)}><p>{b.label}</p></Card>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                {selectedBranchId && (<div className="p-3 bg-muted/50 rounded-lg"><p className="text-sm">✓ Classes filtered for: <strong>{formData.branch}</strong></p></div>)}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">English Program</Label>
                  {englishLevelOptions.map((level) => {
                    const key = extractLevelKey(level.config_key) || extractLevelKey(level.config_value);
                    const isAvailable = selectedBranchId ? (key ? filteredOptions.allowedLevelKeys.includes(key) : filteredOptions.allowedLevels.some((al) => normalize(al).includes(normalize(level.config_value)))) : true;
                    return (
                      <div key={level.id} className={`flex items-center space-x-3 p-3 rounded-lg ${isAvailable ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`} onClick={() => isAvailable && toggleLevel(level.config_value)}>
                        <Checkbox checked={formData.selectedLevels.includes(level.config_value)} disabled={!isAvailable} />
                        <label className="text-sm flex-1">{level.config_value}</label>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Other Courses</Label>
                  {Object.entries(coursesByCategory).map(([category, cats]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-sm mb-2">{category}</h3>
                      {cats.map((c) => {
                        const isAvailable = selectedBranchId ? filteredOptions.allowedCourses.some(ac => normalize(ac).includes(normalize(c.value)) || normalize(c.value).includes(normalize(ac))) : true;
                        return (
                          <div key={c.value} className={`flex items-center space-x-3 p-3 rounded-lg ${isAvailable ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`} onClick={() => isAvailable && toggleCourse(c.value)}>
                            <Checkbox checked={formData.courses.includes(c.value)} disabled={!isAvailable} />
                            <label className="text-sm flex-1">{c.label}</label>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <Label>Timing *</Label>
                {timings.map((t) => {
                  const isAvailable = selectedBranchId ? filteredOptions.allowedTimings.includes(t.value) : true;
                  return (
                    <Card key={t.value} className={`p-4 ${isAvailable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${formData.timing === t.value ? "border-primary bg-primary/5" : ""}`} onClick={() => isAvailable && handleInputChange("timing", t.value)}><p>{t.label}</p></Card>
                  );
                })}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <Label>Duration *</Label>
                {courseDurations.map((d) => (
                  <Card key={d.value} className={`p-4 cursor-pointer ${formData.courseDuration === d.value ? "border-primary bg-primary/5" : ""}`} onClick={() => {handleInputChange("courseDuration", d.value); handleInputChange("customDuration", "");}}>
                    <div className="flex justify-between"><p>{d.label}</p><p>{d.price} SAR</p></div>
                  </Card>
                ))}
                <div className="space-y-2">
                  <Label>Custom Duration</Label>
                  <Input type="number" value={formData.customDuration} onChange={(e) => {handleInputChange("customDuration", e.target.value); handleInputChange("courseDuration", "");}} placeholder="Months" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <Label>Payment Method *</Label>
                {paymentMethods.map((m) => (
                  <Card key={m.value} className={`p-4 cursor-pointer ${formData.paymentMethod === m.value ? "border-primary bg-primary/5" : ""}`} onClick={() => handleInputChange("paymentMethod", m.value)}><p>{m.label}</p></Card>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(5)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Partial Payment</Label>
                <PartialPaymentStep
                  totalFee={(() => {
                    const durationMonths = formData.customDuration ? parseInt(formData.customDuration) : parseInt(formData.courseDuration || "1");
                    const pricing = courseDurations.find(d => d.value === formData.courseDuration);
                    return pricing?.price || (durationMonths * 500);
                  })()}
                  feeAfterDiscount={(() => {
                    const durationMonths = formData.customDuration ? parseInt(formData.customDuration) : parseInt(formData.courseDuration || "1");
                    const pricing = courseDurations.find(d => d.value === formData.courseDuration);
                    const totalFee = pricing?.price || (durationMonths * 500);
                    return totalFee * 0.9;
                  })()}
                  discountPercentage={10}
                  courseStartDate={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                  paymentDeadline={format(addDays(addDays(new Date(), 1), 30), "yyyy-MM-dd")}
                  onAmountChange={setPartialPaymentAmount}
                  onNextPaymentDateChange={setNextPaymentDate}
                  initialPayment={partialPaymentAmount}
                  initialNextPaymentDate={nextPaymentDate}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(6)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1" disabled={partialPaymentAmount === 0}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <BillingFormStep formData={formData} onSignatureSave={handleSignatureSave} signature={signature} courseDurations={courseDurations} partialPaymentAmount={partialPaymentAmount} />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(7)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-secondary" disabled={loading || !signature}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Student"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      
      {open && !configLoading && (
        <FloatingNavigationButton
          onNext={step === 8 ? handleSubmit : handleNext}
          onBack={step > 1 ? () => setStep(step - 1) : undefined}
          nextLabel={step === 8 ? "Create Student" : "Next"}
          backLabel="Back"
          loading={loading}
          disabled={(step === 7 && partialPaymentAmount === 0) || (step === 8 && !signature)}
          showBack={step > 1}
          showNext={true}
        />
      )}
    </Dialog>
  );
};

export default AddPreviousStudentModal;
