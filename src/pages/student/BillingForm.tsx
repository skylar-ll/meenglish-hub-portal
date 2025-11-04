import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SignatureCanvas } from "@/components/billing/SignatureCanvas";
import { generateBillingPDF } from "@/components/billing/BillingPDFGenerator";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ArrowLeft, FileText, Calendar, Download } from "lucide-react";
import { studentSignupSchema } from "@/lib/validations";
import { autoEnrollStudent } from "@/utils/autoEnrollment";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";

const BillingForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [billData, setBillData] = useState<any>(null);
  const ksaTimezone = "Asia/Riyadh";

  useEffect(() => {
    prepareBillingData();
  }, []);

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

      // Fetch enrolled class to get start date
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("email", user.email)
        .single();

      let actualStartDate = null;
      if (studentData) {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("classes(start_date)")
          .eq("student_id", studentData.id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (enrollments && enrollments.length > 0 && enrollments[0].classes?.start_date) {
          actualStartDate = enrollments[0].classes.start_date;
        }
      }

      // Get current date in KSA timezone
      const now = new Date();
      const ksaDate = toZonedTime(now, ksaTimezone);
      const registrationDate = format(ksaDate, "dd MMMM yyyy");
      const courseStartDate = actualStartDate 
        ? format(new Date(actualStartDate), "dd MMMM yyyy")
        : format(addDays(ksaDate, 1), "dd MMMM yyyy");

      // Calculate fees
      const totalFee = pricing?.price || (durationMonths * 500); // Default 500 per month
      const discountPercent = 10; // Default 10% discount
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
      };

      setBillData(billingData);
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
    if (!signature) {
      toast.error("Please sign the billing form first");
      return;
    }

    if (!billData) {
      toast.error("Missing registration data");
      return;
    }

    setSubmitting(true);
    try {
      // Get current authenticated user
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

      // Create billing record
      const billingRecord = {
        student_id: user.id,
        student_name_en: billData.clientName,
        student_name_ar: billData.clientNameAr,
        phone: billData.contactNumber,
        course_package: billData.courseName,
        registration_date: format(toZonedTime(new Date(), ksaTimezone), "yyyy-MM-dd"),
        course_start_date: format(addDays(toZonedTime(new Date(), ksaTimezone), 1), "yyyy-MM-dd"),
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

      const { data: billing, error: billingError } = await supabase
        .from('billing')
        .insert(billingRecord)
        .select()
        .single();

      if (billingError) throw billingError;

      // Generate and upload signed PDF of the billing form
      try {
        const pdfBlob = await generateBillingPDF({
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

        const pdfPath = `${user.id}/billing_${billing.id}.pdf`;
        const { error: pdfUploadError } = await supabase.storage
          .from('billing-pdfs')
          .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (pdfUploadError) throw pdfUploadError;

        // Save storage path to the billing record
        await supabase
          .from('billing')
          .update({ signed_pdf_url: pdfPath })
          .eq('id', billing.id);
      } catch (pdfErr) {
        console.error('PDF generation/upload failed:', pdfErr);
      }

      // Get registration data with all info
      const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");

      // Create or update student record (avoid duplicates)
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("email", billData.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let studentData: any = null;
      let studentError: any = null;

      const studentPayload = {
        full_name_ar: billData.clientNameAr,
        full_name_en: billData.clientName,
        phone1: billData.contactNumber,
        phone2: billData.phone2 || null,
        email: billData.email,
        national_id: billData.nationalId,
        branch_id: registration.branch_id || null,
        branch: billData.branch,
        program: registration.courses || billData.courseName,
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

      // Auto-enroll student in matching classes based on branch, program, levels, timing
      try {
        if (registration.branch_id && registration.courses && registration.selectedLevels && registration.timing) {
          await autoEnrollStudent({
            id: studentData.id,
            branch_id: registration.branch_id,
            program: Array.isArray(registration.courses) ? registration.courses[0] : registration.courses,
            course_level: registration.selectedLevels.join(", "),
            timing: registration.timing,
          });
          console.log("Auto-enrollment completed");
        }
      } catch (enrollError) {
        console.error("Auto-enrollment failed:", enrollError);
        // Don't block registration if auto-enrollment fails
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

      toast.success("Registration completed successfully! Redirecting to payment...");
      
      // Navigate to student payment page
      navigate("/student/payments");
    } catch (error: any) {
      console.error("Error completing registration:", error);
      if (error?.errors?.[0]?.message) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error?.message || "Failed to complete registration");
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
        </div>

        <Card className="p-8 mb-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold mb-2">Modern Education Institute of Language</h2>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Training License No.: 5300751</p>
                <p>Commercial Registration No.: 2050122590</p>
              </div>
            </div>

            {/* Student Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Client Name</p>
                <p className="font-semibold">{billData.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact Number</p>
                <p className="font-semibold">{billData.contactNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Course or Package Name</p>
                <p className="font-semibold">{billData.courseName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Slot</p>
                <p className="font-semibold">{billData.timeSlot}</p>
              </div>
            </div>

            {/* Teacher Details */}
            {billData.teachers && billData.teachers.length > 0 && (
              <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                <h4 className="font-semibold mb-3">Assigned Teachers</h4>
                <div className="space-y-3">
                  {billData.teachers.map((teacher: any) => (
                    <div key={teacher.id} className="grid md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Teacher Name</p>
                        <p className="font-medium">{teacher.full_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{teacher.email || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Courses</p>
                        <p className="font-medium">{teacher.courses_assigned || "N/A"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Bill Date (Registration Date)</p>
                  <p className="font-semibold">{billData.billDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Course Start Date</p>
                  <p className="font-semibold">{billData.courseStartDate}</p>
                </div>
              </div>
            </div>

            {/* Billing Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-sm">#</th>
                    <th className="border p-2 text-sm">Description</th>
                    <th className="border p-2 text-sm">Units</th>
                    <th className="border p-2 text-sm">Level Count</th>
                    <th className="border p-2 text-sm">Fee (SAR)</th>
                    <th className="border p-2 text-sm">Discount %</th>
                    <th className="border p-2 text-sm">Fee After Discount (SAR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2 text-center">1</td>
                    <td className="border p-2">{billData.courseName}</td>
                    <td className="border p-2 text-center">—</td>
                    <td className="border p-2 text-center">{billData.levelCount}</td>
                    <td className="border p-2 text-center">{billData.totalFee.toLocaleString()}</td>
                    <td className="border p-2 text-center">{billData.discountPercent}%</td>
                    <td className="border p-2 text-center font-bold">{billData.feeAfterDiscount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Summary */}
            <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Subtotal:</span>
                <span className="font-bold text-lg">{billData.totalFee.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between items-center text-green-600">
                <span className="font-semibold">Extra Discount:</span>
                <span className="font-bold">-{(billData.totalFee - billData.feeAfterDiscount).toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold text-lg">Total Amount:</span>
                <span className="font-bold text-2xl text-primary">{billData.feeAfterDiscount.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount Paid:</span>
                <span className="font-semibold">{billData.amountPaid.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount Remaining:</span>
                <span className="font-semibold text-orange-600">{billData.amountRemaining.toLocaleString()} SAR</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3 pt-2">
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-sm">First Payment:</span>
                  <span className="font-semibold">{billData.firstPayment.toLocaleString()} SAR</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-sm">Second Payment:</span>
                  <span className="font-semibold">{billData.secondPayment.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-3">
              <h3 className="font-bold text-lg mb-3">Program Terms and Conditions</h3>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Attendance and Postponement</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  <li>Additional classes, workshops, and learning activities are free or discounted for institute members during their subscription period.</li>
                  <li>Fees include registration, placement test, textbooks, and VAT for Saudi citizens.</li>
                  <li>Students must attend on time as per the schedule.</li>
                  <li>A perfect-attendance certificate is granted for 100% attendance.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Discount Rewards</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  <li>A discount coupon is granted for high achievement (+A grade or specified IELTS score).</li>
                  <li>Coupons apply only to private courses and cannot be combined.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Re-Study</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  <li>If a student fails to reach the required passing grade, they must re-study that level (re-enrollment is paid).</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Absence Policy</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  <li>Absence beyond the allowed percentage cancels eligibility for a completion certificate.</li>
                  <li>Missed classes cannot be compensated financially.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Postponement Rules</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  <li>Postponement allowed up to 3 months; contact the institute one week before start date.</li>
                  <li>If the institute delays a course beyond 3 months, the student may request a refund for remaining paid levels.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Payment and Cancellation</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  <li>Fees must be paid on time; late payment may result in cancellation.</li>
                  <li>Abusive behavior (verbal / physical) results in immediate termination without refund and may be reported to authorities.</li>
                  <li>No refund of paid fees under any circumstance.</li>
                  <li>Cancellation cannot transfer the course to another person.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Mode Change</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  <li>Students may switch between on-site and online study as per institute policy.</li>
                  <li>When converted to online, remaining months transfer as is; any fee difference is settled.</li>
                  <li>Transfer between branches is not allowed if outstanding payments exist.</li>
                </ul>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t">
                <h4 className="font-semibold">General</h4>
                <p className="text-muted-foreground">To confirm agreement, student must sign and send this document by email or the registration WhatsApp number with proof of payment.</p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Email:</p>
                    <p className="font-semibold">{billData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Phone:</p>
                    <p className="font-semibold">{billData.contactNumber}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Date (Student):</p>
                    <p className="font-semibold">{billData.billDate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Date (Institute):</p>
                    <p className="font-semibold">{billData.billDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Signatures Section */}
        <Card className="p-6 mb-6">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Student Signature</h3>
              {signature ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white p-4 flex items-center justify-center min-h-[200px]">
                    <img 
                      src={signature} 
                      alt="Student Signature" 
                      className="max-w-full max-h-[180px] object-contain"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSignature(null)}
                    className="w-full"
                  >
                    Clear and Re-sign
                  </Button>
                </div>
              ) : (
                <SignatureCanvas onSave={handleSignatureSave} language="en" />
              )}
            </div>
            
            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-2">Institute Signature</h3>
              <p className="text-sm text-muted-foreground">To be signed by institute representative after processing</p>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex gap-4 md:hidden">
          <Button
            variant="outline"
            onClick={() => navigate("/student/partial-payment-selection")}
            className="flex-1"
            disabled={submitting}
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!signature || submitting}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
          >
            <FileText className="w-4 h-4 mr-2" />
            {submitting ? "Completing..." : "Sign & Complete"}
          </Button>
        </div>
        
        {/* Floating Navigation Button */}
        <FloatingNavigationButton
          onNext={handleSubmit}
          onBack={() => navigate("/student/partial-payment-selection")}
          nextLabel="Sign & Complete Registration"
          backLabel="Back"
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
