import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignatureCanvas } from "@/components/billing/SignatureCanvas";
import { generateBillingPDF } from "@/components/billing/BillingPDFGenerator";
import { generateBillingPDFArabic } from "@/components/billing/BillingPDFGeneratorArabic";
import { downloadPdfBlob } from "@/lib/pdfDownload";
import { Download, FileText, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
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
};

const EN_UI: UiText = {
  instituteName: "Modern Education Institute of Language",
  trainingLicense: "Training License No.: 5300751",
  commercialRegistration: "Commercial Registration: 2050122590",
  studentInfoTitle: "Student Information",
  studentNameEn: "Student Name (English):",
  studentNameAr: "Student Name (Arabic):",
  phone: "Phone:",
  email: "Email:",
  nationalId: "National ID:",
  branch: "Branch:",
  registrationDate: "Registration Date:",
  courseStartDate: "Course Start Date:",
  billingDetails: "Billing Details",
  coursePackage: "Course Package",
  timeSlot: "Time Slot",
  durationMonths: "Duration (Months)",
  totalFeeSar: "Total Fee (SAR)",
  totalFeeLabel: "Total Fee:",
  discountLabel: "Discount",
  feeAfterDiscount: "Fee After Discount:",
  amountPaidNow: "Amount Paid Now:",
  amountRemaining: "Amount Remaining:",
  paymentSchedule: "Payment Schedule",
  initialPayment: "Initial Payment:",
  remainingBalance: "Remaining Balance:",
  remainingNote: "* Remaining balance must be paid by the end of the first month",
  fullPaymentReceived: "✓ Full payment received - No remaining balance",
  termsAndConditions: "Terms and Conditions",
  downloadSigned: "Download Signed Billing Form",
  generatingPdf: "Generating PDF...",
  notSelected: "Not selected",
};

const EN_TERMS = [
  "All fees are non-refundable unless stated otherwise",
  "Payment schedule must be followed as agreed",
  "Course materials are provided by the institute",
  "Student must maintain 80% attendance",
  "Certificate will be issued upon course completion",
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
  const [isTranslatingUi, setIsTranslatingUi] = useState(false);
  const [ui, setUi] = useState<UiText>(EN_UI);
  const [terms, setTerms] = useState<string[]>(EN_TERMS);
  const [dynamic, setDynamic] = useState<{ branch: string; timeSlot: string; coursePackage: string }>({
    branch: "",
    timeSlot: "",
    coursePackage: "",
  });

  const arUiCacheRef = useRef<UiText | null>(null);
  const arTermsCacheRef = useRef<string[] | null>(null);
  const arDynamicCacheRef = useRef<Record<string, string>>({});

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
  const registrationDate = format(ksaDate, "dd MMMM yyyy");
  const courseStartDate = format(addDays(ksaDate, 1), "dd MMMM yyyy");

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

  const translateBatchToArabic = async (texts: string[]) => {
    const { data, error } = await supabase.functions.invoke("translate-text", {
      body: { texts, targetLanguage: "ar" },
    });
    if (error) throw error;
    return (data?.translations as string[] | undefined) || texts;
  };

  const translateOneToArabicCached = async (text: string) => {
    const clean = String(text || "").trim();
    if (!clean) return clean;

    // If it already contains Arabic, keep as-is.
    if (/[\u0600-\u06FF]/.test(clean)) return clean;

    // If no latin letters, translation isn't helpful (numbers/symbols).
    if (!/[A-Za-z]/.test(clean)) return clean;

    if (arDynamicCacheRef.current[clean]) return arDynamicCacheRef.current[clean];

    const translated = (await translateBatchToArabic([clean]))[0] || clean;
    arDynamicCacheRef.current[clean] = translated;
    return translated;
  };

  // Translate static UI + terms when switching to Arabic
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (billLanguage === "en") {
        setUi(EN_UI);
        setTerms(EN_TERMS);
        setDynamic({ branch: rawBranch, timeSlot: rawTimeSlot, coursePackage: rawCoursePackage });
        return;
      }

      try {
        setIsTranslatingUi(true);

        const nextUi = arUiCacheRef.current
          ? arUiCacheRef.current
          : (() => {
              // placeholder; will be overwritten after translation
              return EN_UI;
            })();

        const nextTerms = arTermsCacheRef.current ? arTermsCacheRef.current : EN_TERMS;

        if (!arUiCacheRef.current) {
          const keys = Object.keys(EN_UI) as Array<keyof UiText>;
          const enVals = keys.map((k) => EN_UI[k]);
          const arVals = await translateBatchToArabic(enVals);
          const mapped = keys.reduce((acc, k, idx) => {
            acc[k] = arVals[idx] || EN_UI[k];
            return acc;
          }, {} as UiText);
          arUiCacheRef.current = mapped;
        }

        if (!arTermsCacheRef.current) {
          const arTerms = await translateBatchToArabic(EN_TERMS);
          arTermsCacheRef.current = arTerms;
        }

        // Dynamic values
        const [branchAr, timeAr, pkgAr] = await Promise.all([
          translateOneToArabicCached(rawBranch),
          translateOneToArabicCached(rawTimeSlot),
          translateOneToArabicCached(rawCoursePackage),
        ]);

        if (cancelled) return;

        setUi(arUiCacheRef.current ?? nextUi);
        setTerms(arTermsCacheRef.current ?? nextTerms);
        setDynamic({ branch: branchAr, timeSlot: timeAr, coursePackage: pkgAr });
      } catch (e: any) {
        console.error("Billing translation failed:", e);
        toast.error("Failed to translate billing form to Arabic");
      } finally {
        if (!cancelled) setIsTranslatingUi(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [billLanguage, rawBranch, rawTimeSlot, rawCoursePackage]);

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

          {/* Student Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">{ui.studentNameEn}</p>
              <p className="text-muted-foreground">{formData.fullNameEn}</p>
            </div>
            <div>
              <p className="font-semibold">{ui.studentNameAr}</p>
              <p className="text-muted-foreground">{formData.fullNameAr}</p>
            </div>
            <div>
              <p className="font-semibold">{ui.phone}</p>
              <p className="text-muted-foreground">
                {formData.countryCode1}
                {formData.phone1}
              </p>
            </div>
            <div>
              <p className="font-semibold">{ui.email}</p>
              <p className="text-muted-foreground">{formData.email}</p>
            </div>
            <div>
              <p className="font-semibold">{ui.nationalId}</p>
              <p className="text-muted-foreground">{formData.id}</p>
            </div>
            <div>
              <p className="font-semibold">{ui.branch}</p>
              <p className="text-muted-foreground">{displayBranch}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {ui.registrationDate}
              </p>
              <p className="text-muted-foreground">{registrationDate}</p>
            </div>
            <div>
              <p className="font-semibold">{ui.courseStartDate}</p>
              <p className="text-muted-foreground">{courseStartDate}</p>
            </div>
          </div>

          {/* Billing Table */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">{ui.billingDetails}</h3>
              {isTranslatingUi && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Translating...
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className={`p-2 ${isArabic ? "text-right" : "text-left"}`}>{ui.coursePackage}</th>
                    <th className={`p-2 ${isArabic ? "text-right" : "text-left"}`}>{ui.timeSlot}</th>
                    <th className={`p-2 ${isArabic ? "text-left" : "text-right"}`}>{ui.durationMonths}</th>
                    <th className={`p-2 ${isArabic ? "text-left" : "text-right"}`}>{ui.totalFeeSar}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className={`p-2 ${isArabic ? "text-right" : "text-left"}`}>{displayCoursePackage}</td>
                    <td className={`p-2 ${isArabic ? "text-right" : "text-left"}`}>{displayTimeSlot}</td>
                    <td className={`p-2 ${isArabic ? "text-left" : "text-right"}`}>{durationMonths}</td>
                    <td className={`p-2 ${isArabic ? "text-left" : "text-right"}`}>{totalFee.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{ui.totalFeeLabel}</span>
              <span className="font-semibold">{totalFee.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>
                {ui.discountLabel} ({discountPercent}%)
              </span>
              <span className="font-semibold">-{(totalFee - feeAfterDiscount).toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>{ui.feeAfterDiscount}</span>
              <span>{feeAfterDiscount.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-sm mt-4">
              <span>{ui.amountPaidNow}</span>
              <span className="font-semibold text-green-600">{amountPaid.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-orange-600">
              <span>{ui.amountRemaining}</span>
              <span>{remainingBalance.toFixed(2)} SAR</span>
            </div>
          </div>

          {/* Payment Schedule */}
          {remainingBalance > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">{ui.paymentSchedule}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{ui.initialPayment}</span>
                  <span className="font-semibold text-green-600">{amountPaid.toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between">
                  <span>{ui.remainingBalance}</span>
                  <span className="font-semibold text-orange-600">{remainingBalance.toFixed(2)} SAR</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{ui.remainingNote}</p>
              </div>
            </div>
          )}

          {remainingBalance === 0 && (
            <div className="border-t pt-4 bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <p className="text-sm font-semibold text-green-600 text-center">{ui.fullPaymentReceived}</p>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="border-t pt-4 text-xs text-muted-foreground space-y-2">
            <h3 className="font-semibold text-foreground mb-2">{ui.termsAndConditions}</h3>
            <ul className="list-disc list-inside space-y-1">
              {terms.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Signature Section */}
      <SignatureCanvas onSave={onSignatureSave} language={billLanguage} />

      {/* Download Button */}
      {signature && (
        <Button onClick={handleDownloadPDF} disabled={downloading} className="w-full" size="lg">
          <Download className="w-4 h-4 mr-2" />
          {downloading ? ui.generatingPdf : ui.downloadSigned}
        </Button>
      )}
    </div>
  );
};

