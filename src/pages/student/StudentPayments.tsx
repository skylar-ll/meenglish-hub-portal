import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const StudentPayments = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState({
    studentId: "",
    studentName: "",
    totalCourseFee: 0,
    amountPaid: 0,
    amountRemaining: 0,
    courseDuration: 0,
    discountPercentage: 0,
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
        .select("student_id, full_name_en, total_course_fee, amount_paid, amount_remaining, course_duration_months, discount_percentage")
        .eq("email", user.email)
        .single();

      if (error) throw error;

      setPaymentData({
        studentId: student.student_id || "N/A",
        studentName: student.full_name_en || "",
        totalCourseFee: student.total_course_fee || 0,
        amountPaid: student.amount_paid || 0,
        amountRemaining: student.amount_remaining || 0,
        courseDuration: student.course_duration_months || 0,
        discountPercentage: student.discount_percentage || 0,
      });
    } catch (error: any) {
      toast.error("Failed to load payment data");
    } finally {
      setLoading(false);
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
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">{paymentData.studentName}</h2>
                  <p className="text-sm text-muted-foreground">Student ID: {paymentData.studentId}</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Total Course Fee</h3>
                    </div>
                    <p className="text-3xl font-bold text-primary">
                      ${paymentData.totalCourseFee.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                    <h3 className="font-semibold mb-2">Amount Paid</h3>
                    <p className="text-3xl font-bold text-success">
                      ${paymentData.amountPaid.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                    <h3 className="font-semibold mb-2">Amount Remaining</h3>
                    <p className="text-3xl font-bold text-destructive">
                      ${paymentData.amountRemaining.toFixed(2)}
                    </p>
                    {paymentData.discountPercentage > 0 && (
                      <p className="text-sm text-success mt-2">
                        {paymentData.discountPercentage}% discount applied
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-muted rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5" />
                      <h3 className="font-semibold">Course Duration</h3>
                    </div>
                    <p className="text-2xl font-bold">
                      {paymentData.courseDuration} {paymentData.courseDuration === 1 ? 'Month' : 'Months'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-info/5 rounded-lg border border-info/20">
                <h3 className="font-semibold mb-2">Payment Terms</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• First payment: 50% due at enrollment (${(paymentData.totalCourseFee / 2).toFixed(2)})</li>
                  <li>• Second payment: 50% due after course completion (${(paymentData.totalCourseFee / 2).toFixed(2)})</li>
                  <li>• Contact admin for payment arrangements</li>
                </ul>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPayments;
