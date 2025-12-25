import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SignatureCanvas } from "@/components/billing/SignatureCanvas";
import { generateBillingPDF } from "@/components/billing/BillingPDFGenerator";
import { generateBillingPDFArabic } from "@/components/billing/BillingPDFGeneratorArabic";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ArrowLeft, Languages } from "lucide-react";
import { studentSignupSchema } from "@/lib/validations";
import { autoEnrollStudent } from "@/utils/autoEnrollment";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { BillingFormStep } from "@/components/admin/shared/BillingFormStep";

const BillingForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [billData, setBillData] = useState<any>(null);
  const [billLanguage, setBillLanguage] = useState<"en" | "ar">("en");
  const { language } = useLanguage();
  const ksaTimezone = "Asia/Riyadh";

  useEffect(() => {
    prepareBillingData();
  }, []);

  // If the user switches the app language, reflect it immediately in the billing form.
  useEffect(() => {
    setBillLanguage(language === "ar" ? "ar" : "en");
  }, [language]);

  const prepareBillingData = async () => {
    try {
      setLoading(true);
      
      // Get registration data from sessionStorage
      const registrationData = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
      
      // Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!registrationData.fullNameEn || !registrationData.courses || !user) {
        toast.error("Registration data not found or session expired. Please start over.");
        navigate("/student/signup");
        return;
      }

      // Fetch course pricing based on duration
      const durationMonths = registrationData.courseDurationMonths || 1;
      const { data: pricing, error: pricingError } = await supabase
        .from('course_pricing')
        .select('*')
        .eq('duration_months', durationMonths)
        .single();

      if (pricingError) {
        console.error("Pricing error:", pricingError);
      }

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

      // Fetch teacher details if any
      let teacherDetails: any[] = [];
      if (registrationData.teacherSelections) {
        const teacherIds = Object.values(registrationData.teacherSelections) as string[];
        const uniqueTeacherIds = [...new Set(teacherIds)];
        
        const { data: teachers, error: teacherError } = await supabase
          .from('teachers')
          .select('id, full_name, email, phone, courses_assigned')
          .in('id', uniqueTeacherIds);

        if (!teacherError && teachers) {
          teacherDetails = teachers;
        }
      }

      // Get current date in KSA timezone
      const nowDate = new Date();
      const ksaDate = toZonedTime(nowDate, ksaTimezone);
      const registrationDate = format(ksaDate, "dd MMMM yyyy");

      // Fetch matching classes to get actual start date
      const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
      let actualStartDate = null;
      
      if (registration.branch_id && registration.timing) {
        const { data: matchingClasses } = await supabase
          .from("classes")
          .select("start_date, courses, levels, timing")
          .eq("branch_id", registration.branch_id)
          .eq("timing", registration.timing)
          .eq("status", "active");

        if (matchingClasses && matchingClasses.length > 0) {
          const studentCourses = Array.isArray(registration.courses)
            ? registration.courses
            : registration.courses ? [registration.courses] : [];
          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const courseMatches = (clsCourses?: string[]) => {
            if (!clsCourses || clsCourses.length === 0 || studentCourses.length === 0) return true;
            const normAllowed = clsCourses.map(normalize);
            return studentCourses.some(c => normAllowed.some(a => a.includes(normalize(c)) || normalize(c).includes(a)));
          };
          const withDates = matchingClasses.filter(cls => courseMatches(cls.courses) && cls.start_date);
          if (withDates.length > 0) {
            withDates.sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
            actualStartDate = withDates[0].start_date;
          }
        }
      }

      const courseStartDate = actualStartDate 
        ? format(new Date(actualStartDate), "dd MMMM yyyy")
        : format(addDays(ksaDate, 1), "dd MMMM yyyy");

      // Calculate fees - use the exact selected price when available
      const totalFee = (typeof registrationData.selectedDurationPrice === 'number' && registrationData.selectedDurationPrice > 0)
        ? registrationData.selectedDurationPrice
        : (pricing?.price || 0);
      const discountPercent = activeOffer ? Number(activeOffer.discount_percentage) : 0;
      const feeAfterDiscount = totalFee * (1 - discountPercent / 100);
      
      // Get partial payment amount from registration data
      const partialPaymentAmount = registrationData.partialPaymentAmount || 0;
      const amountPaid = partialPaymentAmount;
      const amountRemaining = feeAfterDiscount - amountPaid;

      const billingData = {
        clientName: registrationData.fullNameEn,
        clientNameAr: registrationData.fullNameAr,
        contactNumber: registrationData.phone1,
        courseName: Array.isArray(registrationData.courses) 
          ? registrationData.courses.join(", ") 
          : registrationData.courses,
        billDate: registrationDate,
        courseStartDate: courseStartDate,
        timeSlot: registrationData.timing || "Not selected",
        levelCount: durationMonths,
        totalFee: totalFee,
        discountPercent: discountPercent,
        feeAfterDiscount: feeAfterDiscount,
        amountPaid: amountPaid,
        amountRemaining: amountRemaining,
        firstPayment: amountPaid,
        secondPayment: amountRemaining,
        branch: registrationData.branch,
        email: registrationData.email,
        nationalId: registrationData.id,
        phone2: registrationData.phone2 || "",
        teachers: teacherDetails,
        activeOffer: activeOffer,
      };

      setBillData(billingData);
      
      // Show offer notification if active
      if (activeOffer) {
        toast.success(`🎉 ${activeOffer.offer_name}: ${activeOffer.discount_percentage}% discount applied!`);
      }
    } catch (error: any) {
      console.error("Error preparing billing:", error);
      toast.error("Failed to prepare billing form");
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureSave = (dataUrl: string) => {
    setSignature(dataUrl);
    toast.success("Signature saved");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!signature) {
      toast.error("Please sign the billing form first");
      return;
    }

    if (!billData) {
      toast.error("Missing registration data");
      return;
    }

    // Lightweight validation against expected fields
    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    // Either courses OR level must be selected (not both required)
    const hasCourses = Array.isArray(registration?.courses) ? registration.courses.length > 0 : !!registration?.courses;
    const hasLevel = !!registration?.course_level;
    
    const checks: Array<[string, any]> = [
      ["name_en", billData.clientName],
      ["name_ar", billData.clientNameAr],
      ["phone", billData.contactNumber],
      ["branch", billData.branch],
      ["gender", registration?.gender],
      ["course_or_level_selected", hasCourses || hasLevel],
      ["timing_selected", !!registration?.timing],
      ["terms_agreed", registration?.agreedToTerms === true],
    ];
    const missing = checks.filter(([_, v]) => !v).map(([k]) => k);
    if (missing.length) {
      toast.error(`Please fill all required fields: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    let succeeded = false;
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error("Session expired. Please start registration again.");
        navigate("/student/signup");
        return;
      }

      // Verify student role is assigned - retry if needed
      let roleVerified = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: roleData, error: roleCheckError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "student")
          .single();

        if (!roleCheckError && roleData) {
          roleVerified = true;
          break;
        }

        // If role not found, try to create it
        if (attempt < 2) {
          await supabase
            .from("user_roles")
            .insert({
              user_id: user.id,
              role: "student",
            })
            .select()
            .single();
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!roleVerified) {
        toast.error("Failed to verify student role. Please contact support.");
        return;
      }

      // Upload signature
      const signatureBlob = await fetch(signature).then(r => r.blob());
      const signatureFileName = `${user.id}/signature_${Date.now()}.png`;
      
      const { data: signatureUpload, error: signatureError } = await supabase.storage
        .from('signatures')
        .upload(signatureFileName, signatureBlob);

      if (signatureError) throw signatureError;

      // Use storage path (bucket is private); we'll sign when needed
      const signatureStoragePath = signatureFileName;

      // Get registration data to determine actual course start date
      const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
      let actualCourseStartDate = format(addDays(toZonedTime(new Date(), ksaTimezone), 1), "yyyy-MM-dd");
      
      // Try to get the actual start date from matched classes (by branch, timing and course)
      if (registration.branch_id && registration.timing) {
        const { data: matchingClasses } = await supabase
          .from("classes")
          .select("start_date, courses, timing")
          .eq("branch_id", registration.branch_id)
          .eq("timing", registration.timing)
          .eq("status", "active");

        if (matchingClasses && matchingClasses.length > 0) {
          const studentCourses = Array.isArray(registration.courses)
            ? registration.courses
            : registration.courses ? [registration.courses] : [];
          const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const courseMatches = (clsCourses?: string[]) => {
            if (!clsCourses || clsCourses.length === 0 || studentCourses.length === 0) return true;
            const normAllowed = clsCourses.map(normalize);
            return studentCourses.some(c => normAllowed.some(a => a.includes(normalize(c)) || normalize(c).includes(a)));
          };

          const withDates = matchingClasses.filter(cls => courseMatches(cls.courses) && cls.start_date);
          if (withDates.length > 0) {
            withDates.sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
            actualCourseStartDate = withDates[0].start_date;
          }
        }
      }

      // Create billing record
      const billingRecord: any = {
        student_id: user.id,
        student_name_en: billData.clientName,
        student_name_ar: billData.clientNameAr,
        phone: billData.contactNumber,
        course_package: billData.courseName,
        registration_date: format(toZonedTime(new Date(), ksaTimezone), "yyyy-MM-dd"),
        course_start_date: actualCourseStartDate,
        time_slot: billData.timeSlot,
        level_count: billData.levelCount,
        total_fee: billData.totalFee,
        discount_percentage: billData.discountPercent,
        fee_after_discount: billData.feeAfterDiscount,
        amount_paid: billData.amountPaid,
        amount_remaining: billData.amountRemaining,
        signature_url: signatureStoragePath,
        language: 'en',
        first_payment: billData.firstPayment,
        second_payment: billData.secondPayment,
      };

      // Only add payment dates if they exist
      if (registration.nextPaymentDate) {
        billingRecord.payment_deadline = registration.nextPaymentDate;
      }
      if (registration.paymentDate) {
        billingRecord.last_payment_date = registration.paymentDate;
      }

      const { data: billing, error: billingError } = await supabase
        .from('billing')
        .insert(billingRecord)
        .select()
        .single();

      if (billingError) throw billingError;

      // Generate and upload signed PDF of the billing form
      try {
        // Use the user-selected billLanguage from the form
        let pdfBlob: Blob;
        
        if (billLanguage === 'ar') {
          pdfBlob = await generateBillingPDFArabic({
            student_id: user.id,
            student_name_en: billData.clientName,
            student_name_ar: billData.clientNameAr,
            phone: billData.contactNumber,
            course_package: billData.courseName,
            time_slot: billData.timeSlot,
            registration_date: billingRecord.registration_date,
            course_start_date: billingRecord.course_start_date,
            level_count: billData.levelCount,
            total_fee: billData.totalFee,
            discount_percentage: billData.discountPercent,
            fee_after_discount: billData.feeAfterDiscount,
            amount_paid: billData.amountPaid,
            amount_remaining: billData.amountRemaining,
            first_payment: billData.firstPayment,
            second_payment: billData.secondPayment,
            signature_url: signatureStoragePath,
          });
        } else {
          pdfBlob = await generateBillingPDF({
            student_id: user.id,
            student_name_en: billData.clientName,
            student_name_ar: billData.clientNameAr,
            phone: billData.contactNumber,
            course_package: billData.courseName,
            time_slot: billData.timeSlot,
            registration_date: billingRecord.registration_date,
            course_start_date: billingRecord.course_start_date,
            level_count: billData.levelCount,
            total_fee: billData.totalFee,
            discount_percentage: billData.discountPercent,
            fee_after_discount: billData.feeAfterDiscount,
            amount_paid: billData.amountPaid,
            amount_remaining: billData.amountRemaining,
            first_payment: billData.firstPayment,
            second_payment: billData.secondPayment,
            signature_url: signatureStoragePath,
          });
        }

        const pdfPath = `${user.id}/billing_${billing.id}_${billLanguage}.pdf`;
        const { error: pdfUploadError } = await supabase.storage
          .from('billing-pdfs')
          .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (pdfUploadError) throw pdfUploadError;

        // Save storage path to the billing record
        await supabase
          .from('billing')
          .update({ signed_pdf_url: pdfPath, language: billLanguage })
          .eq('id', billing.id);
      } catch (pdfErr) {
        console.error('PDF generation/upload failed:', pdfErr);
      }

      // Create or update student record using auth user id
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("email", billData.email)
        .maybeSingle();

      let studentData: any = null;
      let studentError: any = null;

      const studentPayload = {
        full_name_ar: billData.clientNameAr,
        full_name_en: billData.clientName,
        phone1: billData.contactNumber,
        phone2: billData.phone2 || null,
        email: user.email || billData.email, // Use authenticated user's email for RLS compliance
        national_id: billData.nationalId,
        branch_id: registration.branch_id || null,
        branch: billData.branch,
        program: Array.isArray(registration.courses) ? registration.courses.join(", ") : (registration.courses || billData.courseName),
        class_type: billData.courseName,
        course_level: registration.selectedLevels?.join(", ") || "Level 1",
        payment_method: registration.paymentMethod || "Cash",
        subscription_status: "active",
        course_duration_months: billData.levelCount,
        timing: billData.timeSlot,
        billing_id: billing.id,
        registration_date: billingRecord.registration_date,
        expiration_date: format(
          addDays(toZonedTime(new Date(), ksaTimezone), billData.levelCount * 30),
          "yyyy-MM-dd"
        ),
      };

      if (existingStudent?.id) {
        const { data, error } = await supabase
          .from("students")
          .update(studentPayload)
          .eq("id", existingStudent.id)
          .select()
          .single();
        studentData = data;
        studentError = error;
      } else {
        const { data, error } = await supabase
          .from("students")
          .insert({ id: user.id, ...studentPayload })
          .select()
          .single();
        studentData = data;
        studentError = error;
      }

      if (studentError || !studentData) {
        toast.error("Failed to create student record");
        return;
      }

      // Handle teacher assignments if any
      if (registration.teacherSelections) {
        const teacherIds = Object.values(registration.teacherSelections) as string[];
        const uniqueTeacherIds = [...new Set(teacherIds)];
        
        const teacherAssignments = uniqueTeacherIds.map(teacherId => ({
          student_id: studentData.id,
          teacher_id: teacherId
        }));

        await supabase.from("student_teachers").insert(teacherAssignments);
      }

      // Auto-enroll student using shared utility (matches by branch, timing, courses and levels)
      // Handle multiple timings if student selected multiple
      try {
        const timings = Array.isArray(registration.selectedTimings) && registration.selectedTimings.length > 0
          ? registration.selectedTimings
          : registration.timing ? [registration.timing] : [];
        
        const levels = Array.isArray(registration.selectedLevels) 
          ? registration.selectedLevels.join(", ")
          : registration.course_level || "";
        
        let totalEnrollments = 0;
        const allClassIds: string[] = [];
        
        // Enroll for each selected timing
        for (const timing of timings) {
          const result = await autoEnrollStudent({
            id: studentData.id,
            branch_id: registration.branch_id,
            program: Array.isArray(registration.courses) ? registration.courses[0] : registration.courses,
            courses: Array.isArray(registration.courses) ? registration.courses : (registration.courses ? [registration.courses] : []),
            course_level: levels,
            timing: timing,
          });
          if (result?.count) {
            totalEnrollments += result.count;
            allClassIds.push(...result.classIds);
          }
        }
        
        if (totalEnrollments > 0) {
          toast.success(`Enrollment complete! Added to ${totalEnrollments} class(es).`);
        } else {
          toast.warning("No matching classes found for auto-enrollment.");
        }
      } catch (enrollError) {
        console.error("❌ Auto-enrollment failed:", enrollError);
        toast.error("Auto-enrollment failed. Please contact admin.");
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({
          full_name_en: billData.clientName,
          full_name_ar: billData.clientNameAr,
          phone1: billData.contactNumber,
          phone2: billData.phone2 || null,
          national_id: billData.nationalId,
          branch: billData.branch,
          program: billData.courseName,
          payment_method: registration.paymentMethod || "Cash",
        })
        .eq("id", user.id);

      // Clear registration data
      sessionStorage.removeItem("studentRegistration");

      succeeded = true;
      toast.success("Registration completed successfully! Redirecting to payment...");
      // Navigate to student payment page after a small delay
      setTimeout(() => navigate("/student/payments"), 300);
    } catch (error: any) {
      console.error("Error completing registration:", error);
      if (!succeeded) {
        if (error?.errors?.[0]?.message) {
          toast.error(error.errors[0].message);
        } else {
          toast.error(error?.message || "Failed to complete registration");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !billData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p className="text-lg">Loading billing information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-4xl mx-auto py-8">
        <div className="mb-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/partial-payment-selection")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Billing Form
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Review your information and sign to complete registration
          </p>
          
          {/* Language Selector for Bill */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <Languages className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Bill Language:</span>
            <Select value={billLanguage} onValueChange={(v: "en" | "ar") => setBillLanguage(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="ar">🇸🇦 العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <BillingFormStep
          formData={{
            fullNameEn: billData.clientName,
            fullNameAr: billData.clientNameAr,
            email: billData.email,
            id: billData.nationalId,
            countryCode1: billData.countryCode1 || "",
            phone1: billData.phone1 || billData.contactNumber,
            timing: billData.timeSlot,
            branch: billData.branch,
            courses: billData.courses,
            selectedLevels: [],
            courseDuration: String(billData.levelCount || 1),
            discountPercent: billData.discountPercent,
          }}
          onSignatureSave={handleSignatureSave}
          signature={signature}
          courseDurations={[{ value: String(billData.levelCount || 1), price: billData.totalFee }]}
          partialPaymentAmount={billData.amountPaid}
          billLanguage={billLanguage}
        />

        {/* Single submission control: use floating navigation only to avoid duplicate triggers on mobile */}

        <FloatingNavigationButton
          onNext={handleSubmit}
          onBack={() => navigate("/student/partial-payment-selection")}
          nextLabel={billLanguage === "ar" ? "توقيع وإكمال التسجيل" : "Sign & Complete Registration"}
          backLabel={billLanguage === "ar" ? "رجوع" : "Back"}
          loading={submitting}
          disabled={!signature}
          showBack={true}
          showNext={true}
        />
      </div>
    </div>
  );
};

export default BillingForm;
