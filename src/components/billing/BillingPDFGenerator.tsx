import jsPDF from "jspdf";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface BillingData {
  student_id: string;
  student_name_en: string;
  student_name_ar: string;
  phone: string;
  course_package: string;
  time_slot: string;
  registration_date: string;
  course_start_date: string;
  level_count: number;
  total_fee: number;
  discount_percentage: number;
  fee_after_discount: number;
  amount_paid: number;
  amount_remaining: number;
  first_payment: number;
  second_payment: number;
  signature_url?: string;
  student_id_code?: string;
}

export const generateBillingPDF = async (billingData: BillingData): Promise<Blob> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 60;
  const margin = 50;

  // Helper function to load signature image if available
  const loadSignatureImage = async (): Promise<string | null> => {
    if (!billingData.signature_url) return null;

    try {
      // Check if it's already a data URL
      if (billingData.signature_url.startsWith('data:')) {
        return billingData.signature_url;
      }

      // Check if it's a full HTTP URL
      if (billingData.signature_url.startsWith('http')) {
        const response = await fetch(billingData.signature_url);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      // Otherwise, it's a storage path - get signed URL
      const { data, error } = await supabase.storage
        .from('signatures')
        .createSignedUrl(billingData.signature_url, 60);

      if (error || !data) return null;

      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to load signature:', error);
      return null;
    }
  };

  // Header - Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Modern Education Institute of Language', pageWidth / 2, yPos, { align: 'center' });
  yPos += 25;

  // Header - License Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Training License No.: 5300751', pageWidth / 2, yPos, { align: 'center' });
  yPos += 18;
  doc.text('Commercial Registration No.: 2050122590', pageWidth / 2, yPos, { align: 'center' });
  yPos += 40;

  doc.setTextColor(0, 0, 0);

  // Student Information Section - Two columns
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  const col1X = margin;
  const col2X = pageWidth / 2 + 20;
  const labelColor: [number, number, number] = [100, 100, 100];
  const valueColor: [number, number, number] = [0, 0, 0];

  // Column 1 - Left
  doc.setTextColor(...labelColor);
  doc.text('Student Name (English)', col1X, yPos);
  yPos += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(billingData.student_name_en, col1X, yPos);
  yPos += 30;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Student ID', col1X, yPos);
  yPos += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(billingData.student_id_code || 'N/A', col1X, yPos);
  yPos += 30;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Course Package', col1X, yPos);
  yPos += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(billingData.course_package, col1X, yPos);
  yPos += 30;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Registration Date', col1X, yPos);
  yPos += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(format(new Date(billingData.registration_date), 'MM/dd/yyyy'), col1X, yPos);

  // Column 2 - Right
  yPos = 60 + 40; // Reset yPos to start of data section
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Student Name (Arabic)', col2X, yPos);
  yPos += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(billingData.student_name_ar, col2X, yPos);
  yPos += 30;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Contact Number', col2X, yPos);
  yPos += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(billingData.phone, col2X, yPos);
  yPos += 30;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Time Slot', col2X, yPos);
  yPos += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(billingData.time_slot || 'Not specified', col2X, yPos);
  yPos += 30;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text('Course Start Date', col2X, yPos);
  yPos += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(format(new Date(billingData.course_start_date), 'MM/dd/yyyy'), col2X, yPos);

  yPos = Math.max(yPos, 60 + 40 + 150) + 40; // Ensure consistent spacing

  // Financial Details Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Financial Details', margin, yPos);
  yPos += 30;

  // Financial table
  const financialData = [
    { label: 'Level Count', value: billingData.level_count.toString(), valueRight: `Total Fee`, valueRightValue: `${billingData.total_fee.toLocaleString()} SR` },
    { label: 'Discount', value: `${billingData.discount_percentage}%`, valueRight: `Fee After Discount`, valueRightValue: `${billingData.fee_after_discount.toLocaleString()} SR` },
    { label: 'Amount Paid', value: `${billingData.amount_paid.toLocaleString()} SR`, valueRight: `Amount Remaining`, valueRightValue: `${billingData.amount_remaining.toLocaleString()} SR`, isRed: true },
  ];

  doc.setFontSize(11);
  financialData.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...labelColor);
    doc.text(row.label, col1X, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(row.value.includes('%') && billingData.discount_percentage > 0 ? 0 : 0, row.value.includes('%') && billingData.discount_percentage > 0 ? 150 : 0, 0);
    doc.text(row.value, col1X + 120, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...labelColor);
    doc.text(row.valueRight, col2X, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(row.isRed ? 220 : 0, row.isRed ? 0 : 0, 0);
    doc.text(row.valueRightValue, col2X + 140, yPos);

    yPos += 25;
  });

  yPos += 20;

  // Payment Schedule
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const calendarIcon = '\u{1F4C5}';
  doc.text(`${calendarIcon} Payment Schedule`, margin, yPos);
  yPos += 30;

  // Payment Schedule Box
  const boxPadding = 20;
  const boxHeight = 100;
  doc.setFillColor(240, 248, 255);
  doc.roundedRect(margin, yPos - 10, pageWidth - 2 * margin, boxHeight, 8, 8, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('First Payment (50%)', margin + boxPadding, yPos + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Due at enrollment', margin + boxPadding, yPos + 26);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 150, 200);
  doc.text(`${billingData.first_payment.toLocaleString()} SR`, pageWidth - margin - 120, yPos + 18);

  yPos += 50;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Second Payment (50%)', margin + boxPadding, yPos + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const secondPaymentDate = new Date(billingData.registration_date);
  secondPaymentDate.setMonth(secondPaymentDate.getMonth() + 1);
  doc.text(`Due: ${format(secondPaymentDate, 'MM/dd/yyyy')}`, margin + boxPadding, yPos + 26);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 0, 0);
  doc.text(`${billingData.second_payment.toLocaleString()} SR`, pageWidth - margin - 120, yPos + 18);

  yPos += 50 + 40;

  // Student Signature Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Student Signature', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 150, 0);
  doc.text('\u270F Please sign below to agree to the terms and conditions', margin, yPos);
  yPos += 20;

  // Signature box
  const signatureBoxHeight = 120;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, signatureBoxHeight, 8, 8);

  // Load and embed signature
  const signatureDataUrl = await loadSignatureImage();
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', margin + 10, yPos + 10, pageWidth - 2 * margin - 20, signatureBoxHeight - 20, '', 'FAST');
    } catch (error) {
      console.error('Failed to add signature to PDF:', error);
    }
  }

  yPos += signatureBoxHeight + 30;

  // Payment Button at bottom
  if (billingData.amount_remaining > 0) {
    doc.setFillColor(0, 200, 100);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 10, 10, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`\u{1F4B3} Pay Remaining (${billingData.amount_remaining.toLocaleString()} SR)`, pageWidth / 2, yPos + 32, { align: 'center' });
  }

  return doc.output('blob');
};
