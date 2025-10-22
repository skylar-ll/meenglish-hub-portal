import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SignatureCanvas } from "@/components/billing/SignatureCanvas";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import { studentSignupSchema } from "@/lib/validations";

const BillingForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [billData, setBillData] = useState<any>(null);
  const password = location.state?.password;
  const ksaTimezone = "Asia/Riyadh";

  useEffect(() => {
    prepareBillingData();
  }, []);

  const prepareBillingData = async () => {
    try {
      setLoading(true);
      
      // Get registration data from sessionStorage
      const registrationData = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
      
      if (!registrationData.fullNameEn || !registrationData.courses || !password) {
        toast.error("Registration data not found. Please start over.");
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

      // Get current date in KSA timezone
      const now = new Date();
      const ksaDate = toZonedTime(now, ksaTimezone);
      const registrationDate = format(ksaDate, "dd MMMM yyyy");
      const courseStartDate = format(addDays(ksaDate, 1), "dd MMMM yyyy");

      // Calculate fees
      const totalFee = pricing?.price || (durationMonths * 500); // Default 500 per month
      const discountPercent = 10; // Default 10% discount
      const feeAfterDiscount = totalFee * (1 - discountPercent / 100);

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
        amountPaid: 0,
        amountRemaining: feeAfterDiscount,
        firstPayment: feeAfterDiscount * 0.5,
        secondPayment: feeAfterDiscount * 0.5,
        branch: registrationData.branch,
        email: registrationData.email,
        nationalId: registrationData.id,
        phone2: registrationData.phone2 || "",
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

    if (!billData || !password) {
      toast.error("Missing registration data");
      return;
    }

    setSubmitting(true);
    try {
      // Validate form data
      const validatedData = studentSignupSchema.parse({
        fullNameAr: billData.clientNameAr,
        fullNameEn: billData.clientName,
        phone1: billData.contactNumber,
        phone2: billData.phone2,
        email: billData.email,
        id: billData.nationalId,
        password: password,
      });

      // Create auth user
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

      // Upload signature
      const signatureBlob = await fetch(signature).then(r => r.blob());
      const signatureFileName = `${authData.user.id}/signature_${Date.now()}.png`;
      
      const { data: signatureUpload, error: signatureError } = await supabase.storage
        .from('signatures')
        .upload(signatureFileName, signatureBlob);

      if (signatureError) throw signatureError;

      const { data: { publicUrl: signatureUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(signatureFileName);

      // Create billing record
      const billingRecord = {
        student_id: authData.user.id,
        student_name_en: validatedData.fullNameEn,
        student_name_ar: validatedData.fullNameAr,
        phone: billData.contactNumber,
        course_package: billData.courseName,
        registration_date: format(toZonedTime(new Date(), ksaTimezone), "yyyy-MM-dd"),
        course_start_date: format(addDays(toZonedTime(new Date(), ksaTimezone), 1), "yyyy-MM-dd"),
        time_slot: billData.timeSlot,
        level_count: billData.levelCount,
        total_fee: billData.totalFee,
        discount_percentage: billData.discountPercent,
        amount_paid: 0,
        signature_url: signatureUrl,
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

      // Get registration data with all info
      const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");

      // Create student record
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
          branch: billData.branch,
          program: billData.courseName,
          class_type: billData.courseName,
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
        })
        .select()
        .single();

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

      // Update profile
      await supabase
        .from("profiles")
        .update({
          full_name_en: validatedData.fullNameEn,
          full_name_ar: validatedData.fullNameAr,
          phone1: validatedData.phone1,
          phone2: validatedData.phone2 || null,
          national_id: validatedData.id,
          branch: billData.branch,
          program: billData.courseName,
          payment_method: registration.paymentMethod || "Cash",
        })
        .eq("id", authData.user.id);

      // Clear registration data
      sessionStorage.removeItem("studentRegistration");

      toast.success("Registration completed successfully! Please check your email to verify your account.");
      
      // Navigate to student course page
      navigate("/student/course");
    } catch (error: any) {
      console.error("Error completing registration:", error);
      if (error.errors) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to complete registration");
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
            onClick={() => navigate("/student/branch-selection", { state: { password } })}
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
            <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-2">
              <h3 className="font-bold">Program Terms and Conditions</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Fees include registration, placement test, textbooks, and VAT for Saudi citizens</li>
                <li>Students must attend on time according to schedule</li>
                <li>Perfect attendance certificate for 100% attendance</li>
                <li>Discount coupons for high achievement grades</li>
                <li>Failed levels must be re-studied (paid re-enrollment)</li>
                <li>No refunds under any circumstances</li>
                <li>Postponement allowed up to 3 months with prior notice</li>
                <li>Mode switching between on-site and online is allowed per policy</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Signature */}
        <SignatureCanvas onSave={handleSignatureSave} language="en" />

        <div className="mt-6 flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/student/branch-selection", { state: { password } })}
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
            {submitting ? "Completing Registration..." : "Sign & Complete Registration"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BillingForm;
