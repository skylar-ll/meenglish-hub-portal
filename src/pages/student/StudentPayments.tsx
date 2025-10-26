import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Calendar, CheckCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { generateBillingPDF } from "@/components/billing/BillingPDFGenerator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const StudentPayments = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    studentId: "",
    studentName: "",
    studentNameAr: "",
    totalCourseFee: 0,
    amountPaid: 0,
    amountRemaining: 0,
    courseDuration: 0,
    discountPercentage: 0,
    billingFormPath: "",
    signatureUrl: "",
    phone: "",
    coursePackage: "",
    timeSlot: "",
    registrationDate: "",
    courseStartDate: "",
    firstPayment: 0,
    secondPayment: 0,
    nextPaymentDate: "",
  });

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/student/login");
        return;
      }

      const { data: student, error } = await supabase
        .from("students")
        .select("*")
        .eq("email", user.email)
        .single();

      if (error) throw error;

      // Fetch billing form if exists
      const { data: billing } = await supabase
        .from("billing")
        .select("*")
        .eq("student_id", student.id)
        .maybeSingle();

      // Create signed URL for signature if available
      let signedSignatureUrl = "";
      if (billing?.signature_url) {
        try {
          const raw = billing.signature_url as string;
          const marker = '/signatures/';
          let path = raw;
          const idx = raw.indexOf(marker);
          if (raw.startsWith('http') && idx !== -1) {
            path = raw.substring(idx + marker.length);
          }
          path = path.replace(/^\/+/, '');
          const { data: sigData, error: sigError } = await supabase.storage
            .from('signatures')
            .createSignedUrl(path, 60 * 60);
          if (!sigError && sigData?.signedUrl) {
            signedSignatureUrl = sigData.signedUrl;
          }
        } catch (e) {
          console.error('Failed to get signature URL:', e);
        }
      }

      // Calculate next payment date (halfway through course)
      const nextPaymentDays = student.course_duration_months ? Math.floor((student.course_duration_months * 30) / 2) : 30;
      const nextPayment = new Date(student.registration_date || new Date());
      nextPayment.setDate(nextPayment.getDate() + nextPaymentDays);

      setPaymentData({
        studentId: student.student_id || "N/A",
        studentName: student.full_name_en || "",
        studentNameAr: student.full_name_ar || "",
        totalCourseFee: billing?.total_fee || student.total_course_fee || 0,
        amountPaid: student.amount_paid || 0,
        amountRemaining: student.amount_remaining || 0,
        courseDuration: student.course_duration_months || 0,
        discountPercentage: billing?.discount_percentage || student.discount_percentage || 0,
        billingFormPath: billing?.signed_pdf_url || "",
        signatureUrl: signedSignatureUrl || billing?.signature_url || "",
        phone: student.phone1 || "",
        coursePackage: billing?.course_package || student.program || "",
        timeSlot: billing?.time_slot || student.timing || "",
        registrationDate: billing?.registration_date ? new Date(billing.registration_date).toLocaleDateString() : "",
        courseStartDate: billing?.course_start_date ? new Date(billing.course_start_date).toLocaleDateString() : "",
        firstPayment: billing?.first_payment || 0,
        secondPayment: billing?.second_payment || 0,
        nextPaymentDate: nextPayment.toLocaleDateString(),
      });
    } catch (error: any) {
      toast.error("Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  const handlePayRemaining = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/student/login");
        return;
      }

      // Update the payment status
      const { error } = await supabase
        .from("students")
        .update({
          amount_paid: paymentData.totalCourseFee,
          amount_remaining: 0,
        })
        .eq("email", user.email);

      if (error) throw error;

      toast.success("Payment successful! Your balance is now fully paid.");
      setShowPaymentDialog(false);
      fetchPaymentData();
    } catch (error: any) {
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/student/course")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('student.back')}
        </Button>

        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center">
          Payment Information
        </h1>

        {loading ? (
          <div className="text-center py-12">{t('common.loading')}</div>
        ) : (
          <div className="space-y-6">
            {/* Full Billing Form Preview */}
            <Card className="p-8">
              {/* Header */}
              <div className="text-center border-b pb-4 mb-6">
                <h2 className="text-2xl font-bold mb-2">Modern Education Institute of Language</h2>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Training License No.: 5300751</p>
                  <p>Commercial Registration No.: 2050122590</p>
                </div>
              </div>

              {/* Student Info Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Student Name (English)</p>
                  <p className="font-semibold text-lg">{paymentData.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Student Name (Arabic)</p>
                  <p className="font-semibold text-lg">{paymentData.studentNameAr || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Student ID</p>
                  <p className="font-mono font-semibold">{paymentData.studentId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Contact Number</p>
                  <p className="font-semibold">{paymentData.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Course Package</p>
                  <p className="font-semibold">{paymentData.coursePackage}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Time Slot</p>
                  <p className="font-semibold">{paymentData.timeSlot || 'TBD'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Registration Date</p>
                  <p className="font-semibold">{paymentData.registrationDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Course Start Date</p>
                  <p className="font-semibold">{paymentData.courseStartDate}</p>
                </div>
              </div>

              {/* Financial Details */}
              <div className="bg-muted/30 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">Financial Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Level Count</span>
                    <span className="font-bold">{paymentData.courseDuration}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Total Fee</span>
                    <span className="font-bold">{paymentData.totalCourseFee.toLocaleString()} SR</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-bold text-green-600">{paymentData.discountPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Fee After Discount</span>
                    <span className="font-bold">{(paymentData.totalCourseFee * (1 - paymentData.discountPercentage / 100)).toLocaleString()} SR</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold text-green-600">{paymentData.amountPaid.toLocaleString()} SR</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Amount Remaining</span>
                    <span className="font-bold text-destructive">{paymentData.amountRemaining.toLocaleString()} SR</span>
                  </div>
                </div>
              </div>

              {/* Payment Schedule */}
              <div className="bg-primary/5 rounded-lg p-6 mb-6 border border-primary/20">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Payment Schedule
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <div>
                      <p className="font-semibold">First Payment (50%)</p>
                      <p className="text-sm text-muted-foreground">Due at enrollment</p>
                    </div>
                    <p className="text-xl font-bold text-primary">{paymentData.firstPayment.toLocaleString()} SR</p>
                  </div>
                  {paymentData.amountRemaining > 0 && (
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <div>
                        <p className="font-semibold">Second Payment (50%)</p>
                        <p className="text-sm text-muted-foreground">Due: {paymentData.nextPaymentDate}</p>
                      </div>
                      <p className="text-xl font-bold text-destructive">{paymentData.secondPayment.toLocaleString()} SR</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Signature */}
              {paymentData.signatureUrl && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">Student Signature</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    ✍️ Please sign below to agree to the terms and conditions
                  </p>
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 bg-background">
                    <img 
                      src={paymentData.signatureUrl} 
                      alt="Student Signature" 
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  onClick={async () => {
                    try {
                      toast.loading('Generating PDF...');
                      
                      const pdfBlob = await generateBillingPDF({
                        student_id: paymentData.studentId,
                        student_name_en: paymentData.studentName,
                        student_name_ar: paymentData.studentNameAr,
                        phone: paymentData.phone,
                        course_package: paymentData.coursePackage,
                        time_slot: paymentData.timeSlot,
                        registration_date: paymentData.registrationDate,
                        course_start_date: paymentData.courseStartDate,
                        level_count: paymentData.courseDuration,
                        total_fee: paymentData.totalCourseFee,
                        discount_percentage: paymentData.discountPercentage,
                        fee_after_discount: paymentData.totalCourseFee * (1 - paymentData.discountPercentage / 100),
                        amount_paid: paymentData.amountPaid,
                        amount_remaining: paymentData.amountRemaining,
                        first_payment: paymentData.firstPayment,
                        second_payment: paymentData.secondPayment,
                        signature_url: paymentData.signatureUrl,
                        student_id_code: paymentData.studentId,
                      });

                      const url = URL.createObjectURL(pdfBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `billing_${paymentData.studentId}_${Date.now()}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      toast.dismiss();
                      toast.success('PDF downloaded successfully!');
                    } catch (e) {
                      toast.dismiss();
                      toast.error('Unable to generate billing form');
                      console.error(e);
                    }
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Bill (PDF)
                </Button>
                
                {paymentData.amountRemaining > 0 && (
                  <Button
                    onClick={() => setShowPaymentDialog(true)}
                    className="flex-1 bg-gradient-to-r from-success to-success/80 hover:opacity-90 transition-opacity"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay Remaining ({paymentData.amountRemaining.toLocaleString()} SR)
                  </Button>
                )}

                {paymentData.amountRemaining === 0 && (
                  <div className="flex-1 p-4 bg-success/10 rounded-lg border border-success/20 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-success" />
                    <div>
                      <h3 className="font-semibold text-success">Fully Paid</h3>
                      <p className="text-sm text-muted-foreground">Your course fee has been paid in full.</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to pay the remaining balance of {paymentData.amountRemaining.toLocaleString()} SR.
              This will complete your course fee payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePayRemaining}
              disabled={processing}
              className="bg-gradient-to-r from-success to-success/80"
            >
              {processing ? "Processing..." : "Confirm Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentPayments;
