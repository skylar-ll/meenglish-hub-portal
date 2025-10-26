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
  const margin = 50;
  let yPos = 60;

  // Helper function to load signature image
  const loadSignatureImage = async (): Promise<string | null> => {
    if (!billingData.signature_url) return null;

    try {
      if (billingData.signature_url.startsWith('data:')) {
        return billingData.signature_url;
      }

      if (billingData.signature_url.startsWith('http')) {
        const response = await fetch(billingData.signature_url);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const cleaned = billingData.signature_url.replace(/^\/+/, '');
      const { data, error } = await supabase.storage
        .from('signatures')
        .createSignedUrl(cleaned, 60);

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

  // Header - Institute Name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Modern Education Institute of Language', pageWidth / 2, yPos, { align: 'center' });
  yPos += 25;

  // License and Registration Numbers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Training License No.: 5300751', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  doc.text('Commercial Registration No.: 2050122590', pageWidth / 2, yPos, { align: 'center' });
  yPos += 40;

  doc.setTextColor(0, 0, 0);

  // Student Information - Two Columns
  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;
  const lineHeight = 45;

  // Left Column
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Student Name (English)', leftCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.student_name_en, leftCol, yPos + 18);

  // Right Column
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Name (Arabic)', rightCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.student_name_ar, rightCol, yPos + 18);

  yPos += lineHeight;

  // Student ID
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Student ID', leftCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.student_id_code || 'N/A', leftCol, yPos + 18);

  // Contact Number
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Contact Number', rightCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.phone, rightCol, yPos + 18);

  yPos += lineHeight;

  // Course Package
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Course Package', leftCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.course_package, leftCol, yPos + 18);

  // Time Slot
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Time Slot', rightCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.time_slot || 'TBD', rightCol, yPos + 18);

  yPos += lineHeight;

  // Registration Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Registration Date', leftCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(format(new Date(billingData.registration_date), 'MM/dd/yyyy'), leftCol, yPos + 18);

  // Course Start Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Course Start Date', rightCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(format(new Date(billingData.course_start_date), 'MM/dd/yyyy'), rightCol, yPos + 18);

  yPos += 60;

  // Financial Details Section
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Details', leftCol, yPos);
  yPos += 30;

  // Financial Table
  const tableData = [
    { left: 'Level Count', leftValue: billingData.level_count.toString(), right: 'Total Fee', rightValue: `${billingData.total_fee.toLocaleString()} SR` },
    { left: 'Discount', leftValue: `${billingData.discount_percentage}%`, right: 'Fee After Discount', rightValue: `${billingData.fee_after_discount.toLocaleString()} SR` },
    { left: 'Amount Paid', leftValue: `${billingData.amount_paid.toLocaleString()} SR`, right: 'Amount Remaining', rightValue: `${billingData.amount_remaining.toLocaleString()} SR` },
  ];

  doc.setFontSize(11);
  tableData.forEach((row) => {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(row.left, leftCol, yPos);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    if (row.left === 'Discount') {
      doc.setTextColor(34, 197, 94); // Green color
    }
    doc.text(row.leftValue, leftCol + 100, yPos);

    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(row.right, rightCol, yPos);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    if (row.right === 'Amount Remaining') {
      doc.setTextColor(239, 68, 68); // Red color
    }
    doc.text(row.rightValue, rightCol + 130, yPos);

    yPos += 25;
  });

  yPos += 30;

  // Payment Schedule Section
  doc.setFillColor(240, 249, 255);
  doc.rect(margin - 10, yPos - 10, pageWidth - 2 * margin + 20, 90, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('📅 Payment Schedule', leftCol, yPos + 10);
  yPos += 35;

  // First Payment
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('First Payment (50%)', leftCol + 10, yPos);
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text(`${billingData.first_payment.toLocaleString()} SR`, pageWidth - margin - 120, yPos);
  
  yPos += 20;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Due at enrollment', leftCol + 10, yPos);

  yPos += 30;

  // Second Payment
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Second Payment (50%)', leftCol + 10, yPos);
  doc.setFontSize(20);
  doc.setTextColor(239, 68, 68);
  doc.text(`${billingData.second_payment.toLocaleString()} SR`, pageWidth - margin - 120, yPos);
  
  yPos += 20;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  const secondPaymentDate = new Date(billingData.course_start_date);
  secondPaymentDate.setMonth(secondPaymentDate.getMonth() + 1);
  doc.text(`Due: ${format(secondPaymentDate, 'MM/dd/yyyy')}`, leftCol + 10, yPos);

  yPos += 40;

  // Student Signature Section
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Signature', leftCol, yPos);
  yPos += 5;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('✍️ Please sign below to agree to the terms and conditions', leftCol, yPos);
  yPos += 20;

  // Signature box with dashed border
  const sigBoxX = leftCol;
  const sigBoxY = yPos;
  const sigBoxWidth = pageWidth - 2 * margin;
  const sigBoxHeight = 120;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(2);
  doc.rect(sigBoxX, sigBoxY, sigBoxWidth, sigBoxHeight);

  // Load and embed signature
  const signatureDataUrl = await loadSignatureImage();
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', sigBoxX + 10, sigBoxY + 10, sigBoxWidth - 20, sigBoxHeight - 20);
    } catch (error) {
      console.error('Failed to add signature to PDF:', error);
    }
  }

  return doc.output('blob');
};
