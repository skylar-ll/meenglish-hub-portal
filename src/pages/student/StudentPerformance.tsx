import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2, Calendar, CreditCard, BookOpen, Award, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import logo from "@/assets/logo-new.png";

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  veryLate: number;
}

interface GradeData {
  monthYear: string;
  weeklyAssessments: (number | null)[];
  finalGrade: number | null;
  equivalent: string | null;
  teacherEvaluation: number | null;
}

const StudentPerformance = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({ present: 0, absent: 0, late: 0, veryLate: 0 });
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/student/login");
          return;
        }

        // Fetch student data
        const { data: student } = await supabase
          .from("students")
          .select("*")
          .eq("email", session.user.email)
          .maybeSingle();

        if (!student) {
          navigate("/student/login");
          return;
        }
        setStudentData(student);

        // Fetch billing data
        const { data: billing } = await supabase
          .from("billing")
          .select("*")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setBillingData(billing);

        // Fetch attendance sheets for grades and attendance summary
        const { data: sheets } = await supabase
          .from("teacher_attendance_sheets")
          .select("*")
          .eq("student_id", student.id)
          .order("month_year", { ascending: false });

        if (sheets && sheets.length > 0) {
          // Calculate attendance summary from all sheets
          let present = 0, absent = 0, late = 0, veryLate = 0;
          
          sheets.forEach(sheet => {
            const days = ['su', 'm', 'tu', 'w', 'th'];
            [1, 2, 3, 4].forEach(week => {
              days.forEach(day => {
                const val = sheet[`week${week}_${day}` as keyof typeof sheet];
                if (val === 'P') present++;
                else if (val === 'A') absent++;
                else if (val === 'L') late++;
                else if (val === 'VL') veryLate++;
              });
            });
          });
          
          setAttendanceSummary({ present, absent, late, veryLate });

          // Format grades
          const formattedGrades: GradeData[] = sheets.map(sheet => ({
            monthYear: sheet.month_year,
            weeklyAssessments: [sheet.week1_wa, sheet.week2_wa, sheet.week3_wa, sheet.week4_wa] as (number | null)[],
            finalGrade: sheet.final_grades as number | null,
            equivalent: sheet.equivalent,
            teacherEvaluation: sheet.teachers_evaluation as number | null,
          }));
          setGrades(formattedGrades);
        }

        // Fetch certificates
        const { data: certs } = await supabase
          .from("student_certificates")
          .select("*")
          .eq("student_id", student.id)
          .order("issue_date", { ascending: false });
        setCertificates(certs || []);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!studentData) return null;

  const totalAttendance = attendanceSummary.present + attendanceSummary.absent + attendanceSummary.late + attendanceSummary.veryLate;
  const attendancePercentage = totalAttendance > 0 ? Math.round((attendanceSummary.present / totalAttendance) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container mx-auto max-w-4xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <img src={logo} alt="Logo" className="h-12 object-contain" />
          <Button variant="ghost" onClick={() => navigate("/student/course")} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {language === 'ar' ? 'تقرير الأداء' : 'Performance Report'}
        </h1>

        {/* Student Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {studentData.full_name_en?.charAt(0) || 'S'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{studentData.full_name_en}</h2>
              <p className="text-muted-foreground">{studentData.full_name_ar}</p>
              <Badge variant="outline">ID: {studentData.student_id}</Badge>
            </div>
          </div>
        </Card>

        {/* Billing Information */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'معلومات الفواتير' : 'Billing Information'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'عدد المستويات' : 'Levels Registered'}</p>
              <p className="text-lg font-semibold">{billingData?.level_count || studentData.course_duration_months || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ البدء' : 'Start Date'}</p>
              <p className="text-lg font-semibold">
                {billingData?.course_start_date || studentData.registration_date 
                  ? format(new Date(billingData?.course_start_date || studentData.registration_date), 'MMM dd, yyyy')
                  : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiration Date'}</p>
              <p className="text-lg font-semibold">
                {studentData.expiration_date 
                  ? format(new Date(studentData.expiration_date), 'MMM dd, yyyy')
                  : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}</p>
              <p className="text-lg font-semibold text-success">SAR {billingData?.amount_paid || studentData.amount_paid || 0}</p>
            </div>
          </div>
          {studentData.expiration_date && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'حالة العضوية:' : 'Membership Status:'}
                </span>
                <Badge variant={studentData.subscription_status === 'active' ? 'default' : 'destructive'}>
                  {studentData.subscription_status === 'active' 
                    ? (language === 'ar' ? 'نشط' : 'Active')
                    : (language === 'ar' ? 'منتهي' : 'Expired')}
                </Badge>
              </div>
            </div>
          )}
        </Card>

        {/* Attendance Summary */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'ملخص الحضور' : 'Attendance Summary'}
          </h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-success/10">
              <p className="text-2xl font-bold text-success">{attendanceSummary.present}</p>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'حاضر' : 'Present'}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <p className="text-2xl font-bold text-destructive">{attendanceSummary.absent}</p>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'غائب' : 'Absent'}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/10">
              <p className="text-2xl font-bold text-accent">{attendanceSummary.late}</p>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'متأخر' : 'Late'}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/10">
              <p className="text-2xl font-bold text-secondary">{attendanceSummary.veryLate}</p>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'متأخر جداً' : 'Very Late'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{language === 'ar' ? 'نسبة الحضور' : 'Attendance Rate'}</span>
              <span className="font-semibold">{attendancePercentage}%</span>
            </div>
            <Progress value={attendancePercentage} className="h-2" />
          </div>
        </Card>

        {/* Grades & Performance */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'الدرجات والأداء' : 'Grades & Performance'}
          </h3>
          {grades.length > 0 ? (
            <div className="space-y-4">
              {grades.map((grade, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold">{grade.monthYear}</span>
                    {grade.equivalent && (
                      <Badge variant="default" className="text-lg px-3">
                        {grade.equivalent}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {grade.weeklyAssessments.map((wa, i) => (
                      <div key={i} className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">Week {i + 1}</p>
                        <p className="font-semibold">{wa !== null ? wa : '-'}</p>
                      </div>
                    ))}
                    <div className="text-center p-2 bg-primary/10 rounded">
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الدرجة النهائية' : 'Final'}</p>
                      <p className="font-bold text-primary">{grade.finalGrade !== null ? grade.finalGrade : '-'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {language === 'ar' ? 'لا توجد درجات متاحة بعد' : 'No grades available yet'}
            </p>
          )}
        </Card>

        {/* Certificates */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'الشهادات' : 'Certificates'}
          </h3>
          {certificates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-4 border rounded-lg flex items-center gap-3">
                  <Award className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-semibold">{cert.course_name || cert.level}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(cert.issue_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {language === 'ar' ? 'لا توجد شهادات بعد' : 'No certificates yet'}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StudentPerformance;
