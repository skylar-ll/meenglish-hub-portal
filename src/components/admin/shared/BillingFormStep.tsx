import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignatureCanvas } from "@/components/billing/SignatureCanvas";
import { generateBillingPDF } from "@/components/billing/BillingPDFGenerator";
import { Download, FileText } from "lucide-react";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface BillingFormStepProps {
  formData: any;
  onSignatureSave: (dataUrl: string) => void;
  signature: string | null;
  courseDurations: any[];
}

export const BillingFormStep = ({ formData, onSignatureSave, signature, courseDurations }: BillingFormStepProps) => {
  const [downloading, setDownloading] = useState(false);
  const ksaTimezone = "Asia/Riyadh";

  // Calculate billing details
  const durationMonths = formData.customDuration 
    ? parseInt(formData.customDuration) 
    : parseInt(formData.courseDuration || "1");

  const pricing = courseDurations.find(d => d.value === formData.courseDuration);
  const totalFee = pricing?.price || (durationMonths * 500);
  const discountPercent = 10;
  const feeAfterDiscount = totalFee * (1 - discountPercent / 100);
  const firstPayment = feeAfterDiscount * 0.5;
  const secondPayment = feeAfterDiscount * 0.5;

  const now = new Date();
  const ksaDate = toZonedTime(now, ksaTimezone);
  const registrationDate = format(ksaDate, "dd MMMM yyyy");
  const courseStartDate = format(addDays(ksaDate, 1), "dd MMMM yyyy");

  const handleDownloadPDF = async () => {
    if (!signature) {
      return;
    }

    try {
      setDownloading(true);
      
      const pdfBlob = await generateBillingPDF({
        student_id: "preview",
        student_name_en: formData.fullNameEn,
        student_name_ar: formData.fullNameAr,
        phone: formData.countryCode1 + formData.phone1,
        course_package: Array.isArray(formData.courses) ? formData.courses.join(", ") : formData.courses,
        time_slot: formData.timing || "Not selected",
        registration_date: format(ksaDate, "yyyy-MM-dd"),
        course_start_date: format(addDays(ksaDate, 1), "yyyy-MM-dd"),
        level_count: durationMonths,
        total_fee: totalFee,
        discount_percentage: discountPercent,
        fee_after_discount: feeAfterDiscount,
        amount_paid: 0,
        amount_remaining: feeAfterDiscount,
        first_payment: firstPayment,
        second_payment: secondPayment,
        signature_url: signature,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing_${formData.fullNameEn}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold mb-2">Modern Education Institute of Language</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Training License No.: 5300751</p>
              <p>Commercial Registration: 2050122590</p>
            </div>
          </div>

          {/* Student Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Student Name (English):</p>
              <p className="text-muted-foreground">{formData.fullNameEn}</p>
            </div>
            <div>
              <p className="font-semibold">Student Name (Arabic):</p>
              <p className="text-muted-foreground">{formData.fullNameAr}</p>
            </div>
            <div>
              <p className="font-semibold">Phone:</p>
              <p className="text-muted-foreground">{formData.countryCode1}{formData.phone1}</p>
            </div>
            <div>
              <p className="font-semibold">Email:</p>
              <p className="text-muted-foreground">{formData.email}</p>
            </div>
            <div>
              <p className="font-semibold">National ID:</p>
              <p className="text-muted-foreground">{formData.id}</p>
            </div>
            <div>
              <p className="font-semibold">Branch:</p>
              <p className="text-muted-foreground">{formData.branch}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Registration Date:
              </p>
              <p className="text-muted-foreground">{registrationDate}</p>
            </div>
            <div>
              <p className="font-semibold">Course Start Date:</p>
              <p className="text-muted-foreground">{courseStartDate}</p>
            </div>
          </div>

          {/* Billing Table */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Billing Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Course Package</th>
                    <th className="p-2 text-left">Time Slot</th>
                    <th className="p-2 text-right">Duration (Months)</th>
                    <th className="p-2 text-right">Total Fee (SAR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">{Array.isArray(formData.courses) ? formData.courses.join(", ") : formData.courses}</td>
                    <td className="p-2">{formData.timing || "Not selected"}</td>
                    <td className="p-2 text-right">{durationMonths}</td>
                    <td className="p-2 text-right">{totalFee.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Fee:</span>
              <span className="font-semibold">{totalFee.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({discountPercent}%):</span>
              <span className="font-semibold">-{(totalFee - feeAfterDiscount).toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Fee After Discount:</span>
              <span>{feeAfterDiscount.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-sm mt-4">
              <span>Amount Paid:</span>
              <span>0.00 SAR</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-primary">
              <span>Amount Remaining:</span>
              <span>{feeAfterDiscount.toFixed(2)} SAR</span>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Payment Schedule</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>First Payment:</span>
                <span className="font-semibold">{firstPayment.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>Second Payment:</span>
                <span className="font-semibold">{secondPayment.toFixed(2)} SAR</span>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="border-t pt-4 text-xs text-muted-foreground space-y-2">
            <h3 className="font-semibold text-foreground mb-2">Terms and Conditions</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>All fees are non-refundable unless stated otherwise</li>
              <li>Payment schedule must be followed as agreed</li>
              <li>Course materials are provided by the institute</li>
              <li>Student must maintain 80% attendance</li>
              <li>Certificate will be issued upon course completion</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Signature Section */}
      <SignatureCanvas onSave={onSignatureSave} language="en" />

      {/* Download Button */}
      {signature && (
        <Button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="w-full"
          size="lg"
        >
          <Download className="w-4 h-4 mr-2" />
          {downloading ? "Generating PDF..." : "Download Signed Billing Form"}
        </Button>
      )}
    </div>
  );
};
