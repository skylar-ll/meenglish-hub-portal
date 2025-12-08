import jsPDF from "jspdf";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { loadArabicFont } from "@/lib/arabicFontLoader";

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

export const generateBillingPDFArabic = async (billingData: BillingData): Promise<Blob> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  let yPos = 60;

  // Load and register Arabic font
  let hasArabicFont = false;
  try {
    const arabicFontBase64 = await loadArabicFont();
    doc.addFileToVFS('Amiri-Regular.ttf', arabicFontBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    hasArabicFont = true;
  } catch (fontError) {
    console.warn('Arabic font loading failed, using fallback:', fontError);
  }

  // Helper to render Arabic text (reversed for RTL)
  const renderArabicText = (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }) => {
    if (hasArabicFont && /[\u0600-\u06FF]/.test(text)) {
      doc.setFont('Amiri', 'normal');
      const reversed = text.split('').reverse().join('');
      doc.text(reversed, x, y, options);
      doc.setFont('helvetica', 'normal');
    } else {
      doc.text(text, x, y, options);
    }
  };

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

  // Header - Institute Name (English for better compatibility)
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

  // Student Information - Two Columns (Arabic/English mix for compatibility)
  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;
  const lineHeight = 45;

  // Arabic Name (Right) - using Arabic font
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Student Name (Arabic)', rightCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  renderArabicText(billingData.student_name_ar, rightCol + 150, yPos + 18, { align: 'right' });

  // English Name (Left)
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Name (English)', leftCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.student_name_en, leftCol, yPos + 18);

  yPos += lineHeight;

  // Student ID (Right)
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('رقم الطالب', rightCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.student_id_code || 'N/A', rightCol, yPos + 18);

  // Contact Number (Left)
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('رقم الاتصال', leftCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.phone, leftCol, yPos + 18);

  yPos += lineHeight;

  // Course Package (Right)
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('اسم الدورة او الباقة', rightCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.course_package, rightCol, yPos + 18);

  // Time Slot (Left)
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('الفترة الزمنية', leftCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(billingData.time_slot || 'سيتم تحديده', leftCol, yPos + 18);

  yPos += lineHeight;

  // Registration Date (Right)
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('تاريخ التسجيل', rightCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(format(new Date(billingData.registration_date), 'dd/MM/yyyy'), rightCol, yPos + 18);

  // Course Start Date (Left)
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('تاريخ بدء الدورة', leftCol, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(format(new Date(billingData.course_start_date), 'dd/MM/yyyy'), leftCol, yPos + 18);

  yPos += 60;

  // Financial Details Section (Arabic)
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('التفاصيل المالية', rightCol, yPos);
  yPos += 30;

  // Financial Table (RTL)
  const tableData = [
    { right: 'عدد المستويات', rightValue: billingData.level_count.toString(), left: 'إجمالي الرسوم', leftValue: `${billingData.total_fee.toLocaleString()} ريال` },
    { right: 'الخصم', rightValue: `${billingData.discount_percentage}%`, left: 'الرسوم بعد الخصم', leftValue: `${billingData.fee_after_discount.toLocaleString()} ريال` },
    { right: 'المبلغ المدفوع', rightValue: `${billingData.amount_paid.toLocaleString()} ريال`, left: 'المبلغ المتبقي', leftValue: `${billingData.amount_remaining.toLocaleString()} ريال` },
  ];

  doc.setFontSize(11);
  tableData.forEach((row) => {
    // Right column
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(row.right, rightCol, yPos);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    if (row.right === 'Discount') {
      doc.setTextColor(34, 197, 94); // Green color
    }
    doc.text(row.rightValue, rightCol + 130, yPos);

    // Left column
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(row.left, leftCol, yPos);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    if (row.left === 'Amount Remaining') {
      doc.setTextColor(239, 68, 68); // Red color
    }
    doc.text(row.leftValue, leftCol + 100, yPos);

    yPos += 25;
  });

  yPos += 30;

  // Payment Schedule Section
  doc.setFillColor(240, 249, 255);
  doc.rect(margin - 10, yPos - 10, pageWidth - 2 * margin + 20, 90, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Schedule', rightCol, yPos + 10);
  yPos += 35;

  // First Payment
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('First Payment (50%)', rightCol + 10, yPos);
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text(`${billingData.first_payment.toLocaleString()} SR`, leftCol + 50, yPos);
  
  yPos += 20;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Due at enrollment', rightCol + 10, yPos);

  yPos += 30;

  // Second Payment
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Second Payment (50%)', rightCol + 10, yPos);
  doc.setFontSize(20);
  doc.setTextColor(239, 68, 68);
  doc.text(`${billingData.second_payment.toLocaleString()} SR`, leftCol + 50, yPos);
  
  yPos += 20;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  const secondPaymentDate = new Date(billingData.course_start_date);
  secondPaymentDate.setMonth(secondPaymentDate.getMonth() + 1);
  doc.text(`Deadline: ${format(secondPaymentDate, 'dd/MM/yyyy')}`, rightCol + 10, yPos);

  yPos += 40;

  // Student Signature Section
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Signature', rightCol, yPos);
  yPos += 5;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Please sign below to agree to the terms and conditions', rightCol, yPos);
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
