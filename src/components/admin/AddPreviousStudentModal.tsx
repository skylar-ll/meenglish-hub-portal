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
import { ArrowRight, ArrowLeft, Loader2, X, Clock } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { computeAllowedTimingsForSelections, normalizeTimingForComparison } from "@/lib/timingAvailability";

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
  const { language } = useLanguage();
  const [termsEn, setTermsEn] = useState<string>("");
  const [termsAr, setTermsAr] = useState<string>("");
  const [termsAgreed, setTermsAgreed] = useState<boolean>(false);
  const [branchClasses, setBranchClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [classSearchTerm, setClassSearchTerm] = useState<string>("");
  const [selectedTimings, setSelectedTimings] = useState<string[]>([]);
  const [classCourseFilter, setClassCourseFilter] = useState<string>("all");
  const [computedAllowedTimings, setComputedAllowedTimings] = useState<string[]>([]);
  
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

    const fetchTerms = async () => {
      try {
        const { data } = await supabase
          .from('terms_and_conditions')
          .select('content_en, content_ar')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        setTermsEn(data?.content_en || "");
        setTermsAr(data?.content_ar || "");
      } catch (e) {
        console.error('Failed to load terms', e);
      }
    };
    
    if (open) {
      fetchAutoTranslationSetting();
      fetchLevels();
      fetchTerms();
    }
  }, [open]);

  // Load classes for selected branch
  const [loadingClasses, setLoadingClasses] = useState(false);
  useEffect(() => {
    const loadClasses = async () => {
      if (!selectedBranchId) { 
        setBranchClasses([]);
        setSelectedClassId(null);
        return;
      }
      setLoadingClasses(true);
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, class_name, timing, levels, courses, program, start_date')
          .eq('branch_id', selectedBranchId)
          .eq('status', 'active');
        if (error) throw error;
        console.log('Loaded classes for branch:', selectedBranchId, data);
        setBranchClasses(data || []);
      } catch (e) {
        console.error('Failed to load classes for branch', e);
        setBranchClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    loadClasses();
  }, [selectedBranchId, open]);

  // When class changes, prefill courses and levels from class
  useEffect(() => {
    const cls = branchClasses.find((c: any) => c.id === selectedClassId);
    if (cls) {
      const courses = Array.isArray(cls.courses) ? cls.courses.map((c: string) => c.trim()) : [];
      const levels = Array.isArray(cls.levels) ? cls.levels : [];
      setFormData(prev => ({ ...prev, courses, selectedLevels: levels }));
    }
  }, [selectedClassId, branchClasses]);

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

  // Compute allowed timings based on selected levels/courses
  useEffect(() => {
    if (!branchClasses.length) {
      setComputedAllowedTimings([]);
      return;
    }
    const allowed = computeAllowedTimingsForSelections(branchClasses, {
      selectedLevels: formData.selectedLevels,
      selectedCourses: formData.courses,
    });

    console.log("🎯 AddPreviousStudentModal - Computed allowed timings:", allowed);
    setComputedAllowedTimings(allowed);

    // Clear invalid timing selections
    setSelectedTimings((prev) =>
      prev.filter((t) =>
        allowed.some(
          (a: string) =>
            normalizeTimingForComparison(a) === normalizeTimingForComparison(t)
        )
      )
    );
  }, [branchClasses, formData.selectedLevels, formData.courses]);

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

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    if (field === 'branch') {
      (async () => {
        try {
          let branchId: string | null = null;

          if (value === 'online') {
            const { data: onlineRows } = await supabase
              .from('branches')
              .select('id')
              .eq('is_online', true)
              .limit(1);
            if (onlineRows && onlineRows.length > 0) {
              branchId = onlineRows[0].id;
            }
          }

          if (!branchId) {
            const likeVal = `%${value}%`;
            const { data: enRows } = await supabase
              .from('branches')
              .select('id')
              .ilike('name_en', likeVal)
              .limit(1);
            if (enRows && enRows.length > 0) {
              branchId = enRows[0].id;
            }
          }

          if (!branchId) {
            const likeVal2 = `%${value}%`;
            const { data: arRows } = await supabase
              .from('branches')
              .select('id')
              .ilike('name_ar', likeVal2)
              .limit(1);
            if (arRows && arRows.length > 0) {
              branchId = arRows[0].id;
            }
          }

          if (!branchId && value === 'dhahran') {
            const { data: altRows } = await supabase
              .from('branches')
              .select('id')
              .ilike('name_en', '%dahran%')
              .limit(1);
            if (altRows && altRows.length > 0) {
              branchId = altRows[0].id;
            }
          }

          setSelectedBranchId(branchId);
        } catch (e) {
          console.error('Failed to resolve branch id', e);
          setSelectedBranchId(null);
        }
      })();
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
    if (step < 7) {
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
    
    if (selectedTimings.length === 0) {
      toast.error("Please select at least one timing");
      return;
    }
    
    const timingString = selectedTimings.join(", ");
    
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
    const totalFee = pricing?.price || 0; // Use exact pricing, no fallback
    
    // Check for active offers
    const now = new Date();
    const { data: activeOffers } = await supabase
      .from('offers')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', now.toISOString().split('T')[0])
      .gte('end_date', now.toISOString().split('T')[0])
      .order('discount_percentage', { ascending: false })
      .limit(1);
    
    const activeOffer = activeOffers && activeOffers.length > 0 ? activeOffers[0] : null;
    const discountPercent = activeOffer ? Number(activeOffer.discount_percentage) : 0;
    const feeAfterDiscount = totalFee * (1 - discountPercent / 100);
    const remainingBalance = feeAfterDiscount - partialPaymentAmount;

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
      const registrationDate = format(ksaDate, "yyyy-MM-dd");
      
      // Auto-generate payment deadline: registration date + 1 month
      const autoDeadline = addDays(ksaDate, 30);
      const paymentDeadline = format(autoDeadline, "yyyy-MM-dd");

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
            .in('timing', selectedTimings)
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
          timing: timingString,
          payment_method: formData.paymentMethod,
          subscription_status: "active",
          course_duration_months: durationMonths,
          registration_date: registrationDate,
          next_payment_date: paymentDeadline, // Auto-generated deadline
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
          timing: timingString,
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
        registration_date: registrationDate,
        course_start_date: actualStartDate,
        time_slot: timingString,
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
        payment_deadline: paymentDeadline, // Auto-generated deadline
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
          time_slot: timingString,
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
      setSelectedTimings([]);
      
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
            <DialogTitle>Add Previous Student - Step {step} of 7</DialogTitle>
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
                {/* Branch selection - dropdown */}
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">Select Branch *</Label>
                  <Select value={formData.branch} onValueChange={(v) => handleInputChange("branch", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {branches.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditMode && (
                    <div className="pt-2">
                      <AddNewFieldButton configType="branch" onAdd={refetch} />
                    </div>
                  )}
                </div>
                <Button onClick={handleNext} className="w-full">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            )}

            {/* Step 2: Class Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Timing *</Label>
                
                {/* Show selected branch info */}
                {formData.branch && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">Selected Branch: {formData.branch}</p>
                  </div>
                )}

                {!selectedBranchId ? (
                  <Card className="p-4 text-sm text-muted-foreground">
                    Loading branch information...
                  </Card>
                ) : loadingClasses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading classes...</span>
                  </div>
                ) : branchClasses.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">
                    No active classes found for this branch.
                  </Card>
                ) : (
                  <>
                    {/* Timing Selection */}
                    <div className="space-y-3">
                      <div className="space-y-3">
                        <Label className="text-lg font-semibold flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Available Time Slots
                        </Label>
                        
                        <div className="grid gap-4">
                          {timings.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No timings configured.</p>
                          ) : (
                            timings.map((t: any) => {
                              const value = t.label ?? t.config_value ?? t.value;
                              const isAvailable = computedAllowedTimings.some(
                                (opt) => String(opt).trim().toLowerCase() === String(value).trim().toLowerCase(),
                              );
                              const isSelected = selectedTimings.some(
                                (sel) => String(sel).trim().toLowerCase() === String(value).trim().toLowerCase()
                              );
                              const timingCard = (
                                <Card
                                  key={t.id || value}
                                  className={`p-6 transition-all ${
                                    isSelected
                                      ? "border-primary border-2 bg-primary/5 shadow-lg"
                                      : isAvailable
                                        ? "hover:bg-muted/50 hover:shadow-md cursor-pointer"
                                        : "opacity-50 cursor-not-allowed"
                                  }`}
                                  onClick={() => {
                                    if (!isAvailable || isEditMode) return;
                                    // Toggle selection for multi-select
                                    setSelectedTimings(prev => {
                                      if (isSelected) {
                                        return prev.filter(sel => sel.toLowerCase().trim() !== String(value).toLowerCase().trim());
                                      } else {
                                        return [...prev, String(value)];
                                      }
                                    });
                                  }}
                                >
                                  <p className="font-medium text-lg text-center">
                                    {isEditMode ? (
                                      <InlineEditableField
                                        id={t.id}
                                        value={String(value)}
                                        configType="timing"
                                        configKey={t.value || t.config_key}
                                        isEditMode={isEditMode}
                                        onUpdate={refetch}
                                        onDelete={refetch}
                                      />
                                    ) : (
                                      String(value)
                                    )}
                                  </p>
                                  {isSelected && (
                                    <p className="text-xs text-primary text-center mt-1">✓ Selected</p>
                                  )}
                                </Card>
                              );
                              return isAvailable ? (
                                timingCard
                              ) : (
                                <TooltipProvider key={t.id || value}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>{timingCard}</TooltipTrigger>
                                    <TooltipContent>
                                      This timing isn't available for the selected levels/courses.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })
                          )}
                        </div>
                        {selectedTimings.length > 0 && (
                          <p className="text-sm text-primary">
                            Selected: {selectedTimings.join(", ")}
                          </p>
                        )}
                        {computedAllowedTimings.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            ✨ Multiple selection enabled - tap to select/deselect
                          </p>
                        )}
                        {isEditMode && (
                          <AddNewFieldButton configType="timing" onAdd={refetch} />
                        )}
                      </div>
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && selectedTimings.length === 0}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {/* Step 3: Payment Method */}
            {step === 3 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Payment Method *</Label>
                <div className="grid gap-3">
                  {paymentMethods.map((m) => (
                    <Card key={m.value} className={`p-4 cursor-pointer transition-all hover:bg-muted/50 ${formData.paymentMethod === m.value ? "border-primary bg-primary/5" : ""}`} onClick={() => handleInputChange("paymentMethod", m.value)}>
                      <p>{m.label}</p>
                    </Card>
                  ))}
                </div>
                {isEditMode && (<AddNewFieldButton configType="payment_method" onAdd={refetch} />)}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && !formData.paymentMethod}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {/* Step 4: Course Duration */}
            {step === 4 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Course Duration *</Label>
                <div className="grid gap-3">
                  {courseDurations.map((d) => (
                    <Card key={d.value} className={`p-4 cursor-pointer transition-all hover:bg-muted/50 ${formData.courseDuration === d.value && !formData.customDuration ? "border-primary bg-primary/5" : ""}`} onClick={() => {handleInputChange("courseDuration", d.value); handleInputChange("customDuration", "");}}>
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{d.label}</p>
                        <span className="text-sm font-semibold text-primary">${(d.price ?? 0).toFixed(2)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
                {isEditMode && (<AddNewFieldButton configType="course_duration" onAdd={refetch} />)}
                <div className="space-y-2">
                  <Label>Or Enter Custom Duration</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="1" placeholder="Enter number" className="flex-1" value={formData.customDuration} onChange={(e) => {handleInputChange("customDuration", e.target.value); handleInputChange("courseDuration", "");}} />
                    <Select value={formData.customDurationUnit} onValueChange={(v) => handleInputChange("customDurationUnit", v)}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="months">Months</SelectItem><SelectItem value="weeks">Weeks</SelectItem><SelectItem value="days">Days</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && (!formData.courseDuration && !formData.customDuration)}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {/* Step 5: Partial Payment */}
            {step === 5 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Partial Payment</Label>
                <PartialPaymentStep
                  totalFee={(() => {
                    const pricing = courseDurations.find(d => d.value === formData.courseDuration);
                    return pricing?.price || 0;
                  })()}
                  feeAfterDiscount={(() => {
                    const pricing = courseDurations.find(d => d.value === formData.courseDuration);
                    return pricing?.price || 0;
                  })()}
                  discountPercentage={0}
                  courseStartDate={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                  paymentDeadline={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                  onAmountChange={setPartialPaymentAmount}
                  onNextPaymentDateChange={() => {}}
                  initialPayment={partialPaymentAmount}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && partialPaymentAmount === 0}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {/* Step 6: Terms and Conditions */}
            {step === 6 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Terms and Conditions</Label>
                <Card className="p-4">
                  <ScrollArea className="h-[300px] w-full">
                    <div className="prose prose-sm max-w-none text-foreground">
                      <div dangerouslySetInnerHTML={{ __html: language === 'ar' ? termsAr : termsEn }} />
                    </div>
                  </ScrollArea>
                </Card>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms-agree-prev" checked={termsAgreed} onCheckedChange={(checked) => setTermsAgreed(checked === true)} />
                  <Label htmlFor="terms-agree-prev" className="text-sm cursor-pointer">I agree to the terms and conditions</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(5)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && !termsAgreed}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {/* Step 7: Billing & Signature */}
            {step === 7 && (
              <div className="space-y-4">
                <BillingFormStep 
                  formData={formData} 
                  onSignatureSave={handleSignatureSave} 
                  signature={signature} 
                  courseDurations={courseDurations}
                  partialPaymentAmount={partialPaymentAmount}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(6)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-secondary" disabled={loading || !signature}>
                    {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>) : ("Create Student")}
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}
      </DialogContent>
      
      {open && !configLoading && (
        <FloatingNavigationButton
          onNext={step === 7 ? handleSubmit : handleNext}
          onBack={step > 1 ? () => setStep(step - 1) : undefined}
          nextLabel={step === 7 ? "Create Student" : "Next"}
          backLabel="Back"
          loading={loading}
          disabled={(!isEditMode && ((step === 2 && selectedTimings.length === 0) || (step === 5 && partialPaymentAmount === 0) || (step === 6 && !termsAgreed))) || (step === 7 && !signature)}
          showBack={step > 1}
          showNext={true}
        />
      )}
    </Dialog>
  );
};

export default AddPreviousStudentModal;
