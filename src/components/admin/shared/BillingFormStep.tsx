import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignatureCanvas } from "@/components/billing/SignatureCanvas";
import { generateBillingPDF } from "@/components/billing/BillingPDFGenerator";
import { generateBillingPDFArabic } from "@/components/billing/BillingPDFGeneratorArabic";
import { downloadPdfBlob } from "@/lib/pdfDownload";
import { Download } from "lucide-react";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useTermsAndConditions } from "@/hooks/useTermsAndConditions";
import { toast } from "sonner";

interface BillingFormStepProps {
  formData: any;
  onSignatureSave: (dataUrl: string) => void;
  signature: string | null;
  courseDurations: any[];
  partialPaymentAmount?: number;
  billLanguage?: "en" | "ar";
}

type UiText = {
  instituteName: string;
  trainingLicense: string;
  commercialRegistration: string;
  studentInfoTitle: string;
  studentNameEn: string;
  studentNameAr: string;
  phone: string;
  email: string;
  nationalId: string;
  branch: string;
  registrationDate: string;
  courseStartDate: string;
   dateOfBirth: string;
  billingDetails: string;
  coursePackage: string;
  timeSlot: string;
  durationMonths: string;
  totalFeeSar: string;
  totalFeeLabel: string;
  discountLabel: string;
  feeAfterDiscount: string;
  amountPaidNow: string;
  amountRemaining: string;
  paymentSchedule: string;
  initialPayment: string;
  remainingBalance: string;
  remainingNote: string;
  fullPaymentReceived: string;
  termsAndConditions: string;
  downloadSigned: string;
  generatingPdf: string;
  notSelected: string;
  dueAtRegistration: string;
  dueDate: string;
  studentSignature: string;
  signatureNote: string;
  levelCount: string;
  financialDetails: string;
  sarCurrency: string;
  coursesLabel: string;
  levelsLabel: string;
};

const EN_UI: UiText = {
  instituteName: "Modern Education Institute of Language",
  trainingLicense: "Training License No.: 5300751",
  commercialRegistration: "Commercial Registration: 2050122590",
  studentInfoTitle: "Student Information",
  studentNameEn: "Student Name (English)",
  studentNameAr: "Student Name (Arabic)",
  phone: "Contact Number",
  email: "Email",
  nationalId: "Student ID",
  branch: "Branch",
  registrationDate: "Registration Date",
  courseStartDate: "Course Start Date",
  dateOfBirth: "Date of Birth",
  billingDetails: "Billing Details",
  coursePackage: "Course Package",
  timeSlot: "Class Time Slot",
  durationMonths: "Duration (Months)",
  totalFeeSar: "Total Fee (SAR)",
  totalFeeLabel: "Total Fee",
  discountLabel: "Discount",
  feeAfterDiscount: "Fee After Discount",
  amountPaidNow: "Amount Paid",
  amountRemaining: "Amount Remaining",
  paymentSchedule: "Payment Schedule",
  initialPayment: "First Payment (50%)",
  remainingBalance: "Second Payment (50%)",
  remainingNote: "* Remaining balance must be paid by the end of the first month",
  fullPaymentReceived: "✓ Full payment received - No remaining balance",
  termsAndConditions: "Terms and Conditions",
  downloadSigned: "Download Signed Billing Form",
  generatingPdf: "Generating PDF...",
  notSelected: "Not selected",
  dueAtRegistration: "Due at Registration",
  dueDate: "Due Date",
  studentSignature: "Student Signature",
  signatureNote: "Please sign below to agree to the terms and conditions",
  levelCount: "Number of Levels",
  financialDetails: "Financial Details",
  sarCurrency: "SAR",
  coursesLabel: "Courses",
  levelsLabel: "Levels",
};

const AR_UI: UiText = {
  instituteName: "معهد التعليم الحديث لتعليم اللغات",
  trainingLicense: "رقم ترخيص التدريب: 5300751",
  commercialRegistration: "رقم السجل التجاري: 2050122590",
  studentInfoTitle: "معلومات الطالب",
  studentNameEn: "اسم الطالب (باللغة الإنجليزية)",
  studentNameAr: "اسم الطالب (باللغة العربية)",
  phone: "رقم التواصل",
  email: "البريد الإلكتروني",
  nationalId: "رقم هوية الطالب",
  branch: "الفرع",
  registrationDate: "تاريخ التسجيل",
  courseStartDate: "تاريخ بدء الدورة",
  dateOfBirth: "تاريخ الميلاد",
  billingDetails: "تفاصيل الفاتورة",
  coursePackage: "الباقة",
  timeSlot: "موعد الحصة ضمن باقة الدورة",
  durationMonths: "المدة (أشهر)",
  totalFeeSar: "إجمالي الرسوم",
  totalFeeLabel: "إجمالي الرسوم",
  discountLabel: "قيمة الخصم",
  feeAfterDiscount: "الرسوم بعد الخصم",
  amountPaidNow: "المبلغ المدفوع",
  amountRemaining: "المبلغ المتبقي",
  paymentSchedule: "جدول السداد",
  initialPayment: "الدفعة الأولى (50%)",
  remainingBalance: "الدفعة الثانية (50%)",
  remainingNote: "* يجب دفع الرصيد المتبقي بنهاية الشهر الأول",
  fullPaymentReceived: "✓ تم استلام الدفعة الكاملة - لا يوجد رصيد متبقي",
  termsAndConditions: "الشروط والأحكام",
  downloadSigned: "تحميل نموذج الفاتورة الموقع",
  generatingPdf: "جارٍ إنشاء ملف PDF...",
  notSelected: "غير محدد",
  dueAtRegistration: "مستحقة عند التسجيل",
  dueDate: "تاريخ الاستحقاق",
  studentSignature: "توقيع الطالب",
  signatureNote: "يرجى التوقيع أدناه إقرارًا بالموافقة على الشروط والأحكام",
  levelCount: "عدد المستويات",
  financialDetails: "التفاصيل المالية",
  sarCurrency: "ريال سعودي",
  coursesLabel: "الدورات",
  levelsLabel: "المستويات",
};

const EN_TERMS = [
  "All fees are non-refundable unless stated otherwise",
  "Payment schedule must be followed as agreed",
  "Course materials are provided by the institute",
  "Student must maintain 80% attendance",
  "Certificate will be issued upon course completion",
];

const AR_TERMS = [
  "جميع الرسوم غير قابلة للاسترداد ما لم ينص على خلاف ذلك",
  "يجب اتباع جدول الدفع المتفق عليه",
  "يوفر المعهد المواد التعليمية",
  "يجب على الطالب الحفاظ على نسبة حضور 80%",
  "ستصدر الشهادة عند إتمام الدورة",
];

export const BillingFormStep = ({
  formData,
  onSignatureSave,
  signature,
  courseDurations,
  partialPaymentAmount = 0,
  billLanguage = "en",
}: BillingFormStepProps) => {
  const [downloading, setDownloading] = useState(false);
  const [ui, setUi] = useState<UiText>(EN_UI);
  const { terms: dbTerms, loading: termsLoading } = useTermsAndConditions();
  const [dynamic, setDynamic] = useState<{ branch: string; timeSlot: string; coursePackage: string }>({
    branch: "",
    timeSlot: "",
    coursePackage: "",
  });

  const ksaTimezone = "Asia/Riyadh";

  // Calculate billing details
  const durationMonths = formData.customDuration
    ? parseInt(formData.customDuration)
    : parseInt(formData.courseDuration || "1");

  const pricing = courseDurations.find((d) => d.value === formData.courseDuration);
  const totalFee = pricing?.price || durationMonths * 500;
  const discountPercent = formData.discountPercent || 0;
  const feeAfterDiscount = totalFee * (1 - discountPercent / 100);
  const amountPaid = partialPaymentAmount;
  const remainingBalance = feeAfterDiscount - amountPaid;

  const now = new Date();
  const ksaDate = toZonedTime(now, ksaTimezone);
  const registrationDate = format(ksaDate, "MM/dd/yyyy");
  const courseStartDate = format(addDays(ksaDate, 1), "MM/dd/yyyy");
  const dateOfBirthDisplay = useMemo(() => {
    const raw = formData?.dateOfBirth;
    if (!raw) return "";
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : format(d, "MM/dd/yyyy");
  }, [formData?.dateOfBirth]);

  const rawCoursePackage = useMemo(() => {
    const value = Array.isArray(formData.courses) ? formData.courses.join(", ") : formData.courses;
    return String(value || "");
  }, [formData.courses]);

  const rawTimeSlot = useMemo(() => {
    return String(formData.timing || EN_UI.notSelected);
  }, [formData.timing]);

  const rawBranch = useMemo(() => {
    return String(formData.branch || "");
  }, [formData.branch]);

  // Switch UI when switching language
  useEffect(() => {
    if (billLanguage === "en") {
      setUi(EN_UI);
      setDynamic({ branch: rawBranch, timeSlot: rawTimeSlot, coursePackage: rawCoursePackage });
    } else {
      setUi(AR_UI);
      setDynamic({ branch: rawBranch, timeSlot: rawTimeSlot, coursePackage: rawCoursePackage });
    }
  }, [billLanguage, rawBranch, rawTimeSlot, rawCoursePackage]);

  // Parse terms from database (split by newlines)
  const termsToDisplay = useMemo(() => {
    if (!dbTerms) return billLanguage === "ar" ? AR_TERMS : EN_TERMS;
    return dbTerms.split('\n').filter(line => line.trim());
  }, [dbTerms, billLanguage]);

  const displayCoursePackage = billLanguage === "ar" ? dynamic.coursePackage : rawCoursePackage;
  const displayTimeSlot = billLanguage === "ar" ? dynamic.timeSlot : rawTimeSlot;
  const displayBranch = billLanguage === "ar" ? dynamic.branch : rawBranch;

  const handleDownloadPDF = async () => {
    if (!signature) return;

    try {
      setDownloading(true);

      const generator = billLanguage === "ar" ? generateBillingPDFArabic : generateBillingPDF;

      const pdfBlob = await generator({
        student_id: "preview",
        student_name_en: formData.fullNameEn,
        student_name_ar: formData.fullNameAr,
        phone: formData.countryCode1 + formData.phone1,
        course_package: displayCoursePackage,
        time_slot: displayTimeSlot,
        registration_date: format(ksaDate, "yyyy-MM-dd"),
        course_start_date: format(addDays(ksaDate, 1), "yyyy-MM-dd"),
        date_of_birth: formData?.dateOfBirth || null,
        level_count: durationMonths,
        total_fee: totalFee,
        discount_percentage: discountPercent,
        fee_after_discount: feeAfterDiscount,
        amount_paid: amountPaid,
        amount_remaining: remainingBalance,
        first_payment: amountPaid,
        second_payment: remainingBalance,
        signature_url: signature,
      });

      const fileName = `billing_${formData.fullNameEn}_${billLanguage}_${Date.now()}.pdf`;
      downloadPdfBlob(pdfBlob, fileName);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const isArabic = billLanguage === "ar";

  // Calculate second payment due date
  const secondPaymentDueDate = format(addDays(ksaDate, 30), "MM/dd/yyyy");

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <Card className="p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold mb-2">{ui.instituteName}</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{ui.trainingLicense}</p>
              <p>{ui.commercialRegistration}</p>
            </div>
          </div>

          {/* Student Information - Simple label/value pairs */}
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-muted-foreground">{ui.studentNameEn}</p>
              <p className="text-lg">{formData.fullNameEn}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">{ui.studentNameAr}</p>
              <p className="text-lg">{formData.fullNameAr}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">{ui.nationalId}</p>
              <p className="text-lg">{formData.id}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">{ui.phone}</p>
              <p className="text-lg">{formData.countryCode1}{formData.phone1}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">{ui.timeSlot}</p>
              <p className="text-lg">{displayTimeSlot}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">{ui.registrationDate}</p>
              <p className="text-lg">{registrationDate}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">{ui.courseStartDate}</p>
              <p className="text-lg">{courseStartDate}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">{ui.dateOfBirth}</p>
              <p className="text-lg">{dateOfBirthDisplay || ui.notSelected}</p>
            </div>
            {/* Courses */}
            {displayCoursePackage && (
              <div>
                <p className="font-semibold text-muted-foreground">{ui.coursesLabel}</p>
                <p className="text-lg">{displayCoursePackage}</p>
              </div>
            )}
            {/* Levels */}
            {formData.selectedLevels && formData.selectedLevels.length > 0 && (
              <div>
                <p className="font-semibold text-muted-foreground">{ui.levelsLabel}</p>
                <p className="text-lg">{formData.selectedLevels.join(", ")}</p>
              </div>
            )}
          </div>

          {/* Financial Details */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">{ui.financialDetails}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{ui.levelCount} {durationMonths}</span>
                <span>{ui.totalFeeLabel} {totalFee.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>{ui.discountLabel}</span>
                <span>{discountPercent}% {ui.feeAfterDiscount} {feeAfterDiscount.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{ui.amountPaidNow}</span>
                <span className="text-green-600">{amountPaid.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{ui.amountRemaining}</span>
                <span className="text-orange-600">{remainingBalance.toLocaleString()} SAR</span>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          {remainingBalance > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">{ui.paymentSchedule}</h3>
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/50 p-4 rounded-lg">
                  <p className="font-semibold">{ui.initialPayment}</p>
                  <p className="text-xl font-bold text-green-600">{amountPaid.toLocaleString()} SAR</p>
                  <p className="text-xs text-muted-foreground">{ui.dueAtRegistration}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/50 p-4 rounded-lg">
                  <p className="font-semibold">{ui.remainingBalance}</p>
                  <p className="text-xl font-bold text-orange-600">{remainingBalance.toLocaleString()} SAR</p>
                  <p className="text-xs text-muted-foreground">{ui.dueDate}: {secondPaymentDueDate}</p>
                </div>
              </div>
            </div>
          )}

          {remainingBalance === 0 && (
            <div className="border-t pt-4 bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <p className="text-sm font-semibold text-green-600 text-center">{ui.fullPaymentReceived}</p>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">{ui.termsAndConditions}</h3>
            <div className="text-sm space-y-2 text-muted-foreground bg-muted/50 p-4 rounded-lg max-h-48 overflow-y-auto">
              {termsLoading ? (
                <p>{billLanguage === "ar" ? "جارٍ تحميل الشروط..." : "Loading terms..."}</p>
              ) : (
                termsToDisplay.map((term, idx) => (
                  <p key={idx} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{term}</span>
                  </p>
                ))
              )}
            </div>
          </div>

          {/* Student Signature Section */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-1">{ui.studentSignature}</h3>
            <p className="text-xs text-muted-foreground mb-4">{ui.signatureNote}</p>
          </div>
        </div>
      </Card>

      {/* Signature Canvas */}
      <SignatureCanvas onSave={onSignatureSave} language={billLanguage} />

      {/* Download Button */}
      {signature && (
        <Button onClick={handleDownloadPDF} disabled={downloading} className="w-full" size="lg">
          <Download className={`w-4 h-4 ${isArabic ? "ml-2" : "mr-2"}`} />
          {downloading ? ui.generatingPdf : ui.downloadSigned}
        </Button>
      )}
    </div>
  );
};

