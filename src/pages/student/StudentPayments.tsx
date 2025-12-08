import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CreditCard, Calendar, CheckCircle, Download, DollarSign, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { generateBillingPDF } from "@/components/billing/BillingPDFGenerator";
import { PayRemainingBalanceModal } from "@/components/billing/PayRemainingBalanceModal";
import { format } from "date-fns";
import { downloadPdfBlob } from "@/lib/pdfDownload";

const StudentPayments = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [billingId, setBillingId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState({
    studentIdCode: "",
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
    paymentDeadline: "",
    paymentStatus: "pending",
    lastPaymentDate: "",
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

      setStudentId(student.id);

      // Fetch billing data
      const { data: billing } = await supabase
        .from("billing")
        .select("*")
        .eq("student_id", student.id)
        .maybeSingle();

      if (billing) {
        setBillingId(billing.id);

        // Fetch payment history
        const { data: history } = await supabase
          .from("payment_history")
          .select("*")
          .eq("billing_id", billing.id)
          .order("payment_date", { ascending: false });

        setPaymentHistory(history || []);
      }

      // Create signed URL for signature
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

      setPaymentData({
        studentIdCode: student.student_id || "N/A",
        studentName: student.full_name_en || "",
        studentNameAr: student.full_name_ar || "",
        totalCourseFee: billing?.total_fee || 0,
        amountPaid: billing?.amount_paid || 0,
        amountRemaining: billing?.amount_remaining || 0,
        courseDuration: billing?.level_count || 0,
        discountPercentage: billing?.discount_percentage || 0,
        billingFormPath: billing?.signed_pdf_url || "",
        signatureUrl: signedSignatureUrl || billing?.signature_url || "",
        phone: billing?.phone || student.phone1 || "",
        coursePackage: billing?.course_package || "",
        timeSlot: billing?.time_slot || "",
        registrationDate: billing?.registration_date || "",
        courseStartDate: billing?.course_start_date || "",
        paymentDeadline: billing?.payment_deadline || "",
        paymentStatus: billing?.payment_status || "pending",
        lastPaymentDate: billing?.last_payment_date || "",
      });
    } catch (error: any) {
      toast.error("Failed to load payment data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = paymentData.paymentDeadline && paymentData.amountRemaining > 0 && 
    new Date(paymentData.paymentDeadline) < new Date();

  const feeAfterDiscount = paymentData.totalCourseFee * (1 - paymentData.discountPercentage / 100);

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
            {/* Payment Status Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Payment Status</h2>
                <Badge variant={paymentData.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                  {paymentData.paymentStatus === 'completed' ? 'Completed' : 'Pending'}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-muted-foreground">Amount Paid</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {paymentData.amountPaid.toFixed(2)} SAR
                    </p>
                    {paymentData.lastPaymentDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last payment: {format(new Date(paymentData.lastPaymentDate), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>

                  <div className={`p-4 rounded-lg ${
                    paymentData.amountRemaining > 0 
                      ? 'bg-orange-50 dark:bg-orange-950' 
                      : 'bg-green-50 dark:bg-green-950'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className={`h-5 w-5 ${
                        paymentData.amountRemaining > 0 ? 'text-orange-600' : 'text-green-600'
                      }`} />
                      <span className="text-sm text-muted-foreground">Remaining Balance</span>
                    </div>
                    <p className={`text-2xl font-bold ${
                      paymentData.amountRemaining > 0 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {paymentData.amountRemaining.toFixed(2)} SAR
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {paymentData.paymentDeadline && paymentData.amountRemaining > 0 && (
                    <Alert variant={isOverdue ? 'destructive' : 'default'}>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-semibold">Payment Deadline</p>
                          <p className="text-lg">
                            {format(new Date(paymentData.paymentDeadline), 'MMMM dd, yyyy')}
                          </p>
                          {isOverdue && (
                            <p className="text-sm font-semibold">⚠️ Overdue!</p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {paymentData.amountRemaining > 0 && (
                    <Button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full bg-gradient-to-r from-primary to-secondary"
                      size="lg"
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay Remaining Balance
                    </Button>
                  )}

                  {paymentData.amountRemaining === 0 && (
                    <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-600">
                        <p className="font-semibold">Fully Paid!</p>
                        <p className="text-sm">Your course fee has been paid in full.</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </Card>

            {/* Payment History */}
            {paymentHistory.length > 0 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Payment History
                </h2>
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-semibold">{payment.amount_paid.toFixed(2)} SAR</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.payment_date), 'MMMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Method: {payment.payment_method}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Full Billing Details */}
            <Card className="p-8">
              <div className="text-center border-b pb-4 mb-6">
                <h2 className="text-2xl font-bold mb-2">Modern Education Institute of Language</h2>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Training License No.: 5300751</p>
                  <p>Commercial Registration No.: 2050122590</p>
                </div>
              </div>

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
                  <p className="font-mono font-semibold">{paymentData.studentIdCode}</p>
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
                  <p className="font-semibold">
                    {paymentData.registrationDate && format(new Date(paymentData.registrationDate), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Course Start Date</p>
                  <p className="font-semibold">
                    {paymentData.courseStartDate && format(new Date(paymentData.courseStartDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Total Fee</span>
                    <span className="font-bold">{paymentData.totalCourseFee.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Discount ({paymentData.discountPercentage}%)</span>
                    <span className="font-bold text-green-600">
                      -{(paymentData.totalCourseFee - feeAfterDiscount).toFixed(2)} SAR
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Fee After Discount</span>
                    <span className="font-bold">{feeAfterDiscount.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-primary/5 rounded-lg px-3 mt-2">
                    <span className="font-semibold">Amount Paid</span>
                    <span className="font-bold text-green-600">{paymentData.amountPaid.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-orange-50 dark:bg-orange-950 rounded-lg px-3">
                    <span className="font-semibold">Amount Remaining</span>
                    <span className="font-bold text-orange-600">{paymentData.amountRemaining.toFixed(2)} SAR</span>
                  </div>
                </div>
              </div>

              {paymentData.signatureUrl && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">Student Signature</h3>
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 bg-background">
                    <img 
                      src={paymentData.signatureUrl} 
                      alt="Student Signature" 
                      className="w-full h-auto max-h-[200px] object-contain"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={async () => {
                  try {
                    toast.loading('Generating PDF...');
                    const pdfBlob = await generateBillingPDF({
                      student_id: paymentData.studentIdCode,
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
                      fee_after_discount: feeAfterDiscount,
                      amount_paid: paymentData.amountPaid,
                      amount_remaining: paymentData.amountRemaining,
                      first_payment: paymentData.amountPaid,
                      second_payment: paymentData.amountRemaining,
                      signature_url: paymentData.signatureUrl,
                      student_id_code: paymentData.studentIdCode,
                    });

                    const fileName = `billing_${paymentData.studentIdCode}_${Date.now()}.pdf`;
                    
                    // Use cross-platform download helper
                    downloadPdfBlob(pdfBlob, fileName);

                    toast.dismiss();
                    toast.success('PDF generated - check your downloads or new tab');
                  } catch (e) {
                    toast.dismiss();
                    toast.error('Unable to generate billing form');
                    console.error(e);
                  }
                }}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Bill (PDF)
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Pay Remaining Balance Modal */}
      <PayRemainingBalanceModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        billingId={billingId}
        studentId={studentId}
        remainingAmount={paymentData.amountRemaining}
        onPaymentSuccess={fetchPaymentData}
      />
    </div>
  );
};

export default StudentPayments;
