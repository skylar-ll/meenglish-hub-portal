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
import { ArrowRight, ArrowLeft, Pencil, Check, X, Loader2, Clock } from "lucide-react";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { useBranchFiltering } from "@/hooks/useBranchFiltering";
import { EditFormConfigModal } from "./EditFormConfigModal";
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
import { CourseAndLevelSelector } from "./CourseAndLevelSelector";

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
}

export const AddStudentModal = ({ open, onOpenChange, onStudentAdded }: AddStudentModalProps) => {
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
  const [classTimingFilter, setClassTimingFilter] = useState<string>("all");
  const [classCourseFilter, setClassCourseFilter] = useState<string>("all");
  
  // Fetch auto-translation setting, levels, and terms
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

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // If branch changes, update selectedBranchId for filtering using branches table UUID
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

          // Specific synonym fix for Dhahran/Dahran naming
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
    // Validation
    if (!formData.fullNameAr || !formData.fullNameEn || !formData.gender || !formData.phone1 || !formData.email || !formData.id || !formData.password) {
      toast.error("Please fill in all required fields in Personal Information");
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
      
      const { data: signatureUpload, error: signatureError } = await supabase.storage
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
            .select('start_date, courses, timing')
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
        registration_date: registrationDate,
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

      toast.success("Student created successfully!");
      
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

  // Filter levels like CourseSelection does
  const levelLike = (val: string) => /^level[\s\-_]?\d+/i.test(val);
  const visibleCourses = courses.filter((c) => !levelLike(c.value));
  
  // Group courses by category
  const coursesByCategory = visibleCourses.reduce((acc, course) => {
    if (!acc[course.category]) {
      acc[course.category] = [];
    }
    acc[course.category].push(course);
    return acc;
  }, {} as Record<string, Array<{ id: string; value: string; label: string; category: string; price: number }>>);

  // English levels: prefer configured list, fallback to classes-derived allowed levels
  const englishLevelOptions = levelOptions.length
    ? levelOptions
    : (filteredOptions.allowedLevels || []).map((v, i) => ({
        id: `fallback-${i}`,
        config_key: v,
        config_value: v,
        display_order: i,
      }));

  // Helper functions for level/course matching
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

  // Helper to get field label
  const getFieldLabel = (key: string) => fieldLabels.find(f => f.value === key) || { id: '', label: key, value: key };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add New Student - Step {step} of 8</DialogTitle>
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
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-1">
                    <Label htmlFor="auto-translate">Auto-Translation</Label>
                    <p className="text-sm text-muted-foreground">Automatically translate Arabic names to English</p>
                  </div>
                  <Switch
                    id="auto-translate"
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

            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                      placeholder="الاسم الكامل"
                      value={formData.fullNameAr}
                      onChange={(e) => handleInputChange("fullNameAr", e.target.value)}
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullNameEn" className="flex items-center gap-2">
                      <InlineEditableField
                        id={getFieldLabel('full_name_en').id}
                        value={getFieldLabel('full_name_en').label}
                        configType="field_label"
                        configKey="full_name_en"
                        isEditMode={isEditMode}
                        onUpdate={refetch}
                        isLabel={true}
                      />
                      {isTranslating && <Loader2 className="w-3 h-3 animate-spin" />}
                      {" *"}
                    </Label>
                    <Input
                      id="fullNameEn"
                      placeholder="Full Name"
                      value={formData.fullNameEn}
                      onChange={(e) => handleInputChange("fullNameEn", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <RadioGroup value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male" className="cursor-pointer font-normal">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female" className="cursor-pointer font-normal">Female</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="kids" id="kids" />
                        <Label htmlFor="kids" className="cursor-pointer font-normal">Kids</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        placeholder="Phone number"
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
                        placeholder="Phone number (optional)"
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
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id">
                    <InlineEditableField
                      id={getFieldLabel('id').id}
                      value={getFieldLabel('id').label}
                      configType="field_label"
                      configKey="id"
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

                {/* Branch selection moved to Step 1 - dropdown */}
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">Select Branch *</Label>
                  <Select value={formData.branch} onValueChange={(v) => handleInputChange("branch", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
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

                <Button onClick={handleNext} className="w-full">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Course & Level Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Courses and Levels *</Label>
                
                <CourseAndLevelSelector
                  selectedBranchId={selectedBranchId}
                  formData={formData}
                  englishLevelOptions={englishLevelOptions}
                  coursesByCategory={coursesByCategory}
                  filteredOptions={filteredOptions}
                  onCourseToggle={(courseValue) => {
                    const current = formData.courses || [];
                    const updated = current.includes(courseValue)
                      ? current.filter((c) => c !== courseValue)
                      : [...current, courseValue];
                    handleInputChange("courses", updated);
                  }}
                  onLevelToggle={(levelValue) => {
                    const current = formData.selectedLevels || [];
                    const updated = current.includes(levelValue)
                      ? current.filter((l) => l !== levelValue)
                      : [...current, levelValue];
                    handleInputChange("selectedLevels", updated);
                  }}
                  extractLevelKey={extractLevelKey}
                  normalize={normalize}
                />

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    className="flex-1"
                    disabled={!isEditMode && ((!formData.courses || formData.courses.length === 0) && (!formData.selectedLevels || formData.selectedLevels.length === 0))}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Class Selection */}
            {step === 3 && loadingClasses && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading classes...</span>
              </div>
            )}
            {step === 3 && !loadingClasses && branchClasses.length === 0 && (
              <Card className="p-4 text-sm text-muted-foreground">
                No active classes found for this branch.
              </Card>
            )}
            {step === 3 && !loadingClasses && branchClasses.length > 0 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Timing *</Label>
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
                              const isAvailable = (filteredOptions.allowedTimings || []).some(
                                (opt) => String(opt).trim().toLowerCase() === String(value).trim().toLowerCase(),
                              );
                              const selected = classTimingFilter === value;
                              const timingCard = (
                                <Card
                                  key={t.id || value}
                                  className={`p-6 transition-all ${
                                    selected
                                      ? "border-primary border-2 bg-primary/5 shadow-lg"
                                      : isAvailable
                                        ? "hover:bg-muted/50 hover:shadow-md cursor-pointer"
                                        : "opacity-50 cursor-not-allowed"
                                  }`}
                                  onClick={() => {
                                    if (!isAvailable) return;
                                    const newValue = selected ? "all" : String(value);
                                    setClassTimingFilter(newValue);
                                    setFormData((prev) => ({ ...prev, timing: newValue === "all" ? "" : String(value) }));
                                  }}
                                >
                                  <p className="font-medium text-lg text-center">{String(value)}</p>
                                </Card>
                              );
                              return isAvailable ? (
                                timingCard
                              ) : (
                                <TooltipProvider key={t.id || value}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>{timingCard}</TooltipTrigger>
                                    <TooltipContent>
                                      This timing isn't available for the selected branch.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && classTimingFilter === "all"}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Payment Method */}
            {step === 4 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Payment Method *</Label>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => (
                    <Card
                      key={method.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.paymentMethod === method.value ? "border-primary bg-primary/5" : ""
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
                  <AddNewFieldButton configType="payment_method" onAdd={refetch} />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && !formData.paymentMethod}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Course Duration */}
            {step === 5 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Course Duration *</Label>
                <div className="grid gap-3">
                  {courseDurations.map((duration) => (
                    <Card
                      key={duration.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.courseDuration === duration.value && !formData.customDuration ? "border-primary bg-primary/5" : ""
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
                        <span className="text-sm font-semibold text-primary">${(duration.price ?? 0).toFixed(2)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
                {isEditMode && (
                  <AddNewFieldButton configType="course_duration" onAdd={refetch} />
                )}
                <div className="space-y-2">
                  <Label>Or Enter Custom Duration</Label>
                  <div className="flex gap-2">
                    <Input
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
                    <Select value={formData.customDurationUnit} onValueChange={(value) => handleInputChange("customDurationUnit", value)}>
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
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && (!formData.courseDuration && !formData.customDuration)}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Partial Payment */}
            {step === 6 && (
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
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && partialPaymentAmount === 0}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 7: Terms and Conditions */}
            {step === 7 && (
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
                  <Checkbox 
                    id="terms-agree" 
                    checked={termsAgreed}
                    onCheckedChange={(checked) => setTermsAgreed(checked === true)}
                  />
                  <Label htmlFor="terms-agree" className="text-sm cursor-pointer">
                    I agree to the terms and conditions
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(5)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1" disabled={!isEditMode && !termsAgreed}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 8: Billing & Signature */}
            {step === 8 && (
              <div className="space-y-4">
                <BillingFormStep 
                  formData={formData} 
                  onSignatureSave={handleSignatureSave} 
                  signature={signature} 
                  courseDurations={courseDurations}
                  partialPaymentAmount={partialPaymentAmount}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(6)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    className="flex-1 bg-gradient-to-r from-primary to-secondary" 
                    disabled={loading || !signature}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Student"
                    )}
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
          onNext={step === 8 ? handleSubmit : handleNext}
          onBack={step > 1 ? () => setStep(step - 1) : undefined}
          nextLabel={step === 8 ? "Create Student" : "Next"}
          backLabel="Back"
          loading={loading}
          disabled={(!isEditMode && ((step === 3 && classTimingFilter === "all") || (step === 6 && partialPaymentAmount === 0) || (step === 7 && !termsAgreed))) || (step === 8 && !signature)}
          showBack={step > 1}
          showNext={true}
        />
      )}
    </Dialog>
  );
};

export default AddStudentModal;
