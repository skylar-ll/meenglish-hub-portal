import jsPDF from "jspdf";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { loadArabicFont } from "@/lib/arabicFontLoader";
import { formatPdfNumber } from "@/lib/pdfFormat";


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
  date_of_birth?: string | null;
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

  // Helper to render Arabic text (no reversal - Amiri font handles RTL correctly)
  const renderArabicText = (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }) => {
    if (hasArabicFont && /[\u0600-\u06FF]/.test(text)) {
      doc.setFont('Amiri', 'normal');
      // Display Arabic text as-is without reversal
      doc.text(text, x, y, options);
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

  // Header - Institute Name in Arabic
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText('معهد التعليم الحديث لتعليم اللغات', pageWidth / 2, yPos, { align: 'center' });
  } else {
    doc.text('Modern Education Institute of Language', pageWidth / 2, yPos, { align: 'center' });
  }
  yPos += 20;

  // License and Registration Numbers in Arabic
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText('رقم ترخيص التدريب: 5300751', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    renderArabicText('رقم السجل التجاري: 2050122590', pageWidth / 2, yPos, { align: 'center' });
  } else {
    doc.text('Training License No.: 5300751', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    doc.text('Commercial Registration: 2050122590', pageWidth / 2, yPos, { align: 'center' });
  }
  yPos += 30;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Helper for label + value rows
  const addLabelValue = (label: string, value: string, isArabicLabel: boolean = true) => {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (isArabicLabel && hasArabicFont) {
      doc.setFont('Amiri', 'normal');
      renderArabicText(label, pageWidth - margin, yPos, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text(label, pageWidth - margin, yPos, { align: 'right' });
    }
    yPos += 15;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(value, pageWidth - margin, yPos, { align: 'right' });
    yPos += 25;
  };

  // Student Name English
  addLabelValue('اسم الطالب (باللغة الإنجليزية)', billingData.student_name_en);

  // Student Name Arabic
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText('اسم الطالب (باللغة العربية)', pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 15;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(billingData.student_name_ar, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(billingData.student_name_ar, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 25;

  // Student ID
  addLabelValue('رقم هوية الطالب', billingData.student_id_code || billingData.student_id || 'N/A');

  // Contact Number
  addLabelValue('رقم التواصل', billingData.phone);

  // Time Slot
  addLabelValue('موعد الحصة ضمن باقة الدورة', billingData.time_slot || 'غير محدد');

  // Registration Date
  addLabelValue('تاريخ التسجيل', format(new Date(billingData.registration_date), 'MM/dd/yyyy'));

  // Course Start Date
  addLabelValue('تاريخ بدء الدورة', format(new Date(billingData.course_start_date), 'MM/dd/yyyy'));

  // Date of Birth
  addLabelValue('تاريخ الميلاد', billingData.date_of_birth ? format(new Date(billingData.date_of_birth), 'MM/dd/yyyy') : 'غير متوفر');

  yPos += 10;

  // Financial Details Header
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText('التفاصيل المالية', pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text('Financial Details', pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 25;

  // Level count + Total Fee row
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const levelText = hasArabicFont ? `عدد المستويات ${billingData.level_count}` : `Levels: ${billingData.level_count}`;
  const totalFeeText = hasArabicFont ? `إجمالي الرسوم ${formatPdfNumber(billingData.total_fee)} SAR` : `Total Fee: ${formatPdfNumber(billingData.total_fee)} SAR`;
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(levelText + '  |  ' + totalFeeText, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(levelText + '  |  ' + totalFeeText, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 20;

  // Discount + Fee after discount row
  const discountText = hasArabicFont ? `قيمة الخصم ${billingData.discount_percentage}%` : `Discount: ${billingData.discount_percentage}%`;
  const afterDiscountText = hasArabicFont ? `الرسوم بعد الخصم ${formatPdfNumber(billingData.fee_after_discount)} SAR` : `After Discount: ${formatPdfNumber(billingData.fee_after_discount)} SAR`;
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(discountText + '  |  ' + afterDiscountText, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(discountText + '  |  ' + afterDiscountText, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 20;

  // Amount paid + Remaining row
  const paidText = hasArabicFont ? `المبلغ المدفوع ${formatPdfNumber(billingData.amount_paid)} SAR` : `Paid: ${formatPdfNumber(billingData.amount_paid)} SAR`;
  const remainingText = hasArabicFont ? `المبلغ المتبقي ${formatPdfNumber(billingData.amount_remaining)} SAR` : `Remaining: ${formatPdfNumber(billingData.amount_remaining)} SAR`;
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(paidText + '  |  ' + remainingText, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(paidText + '  |  ' + remainingText, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 30;


  // Payment Schedule Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText('جدول السداد', pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text('Payment Schedule', pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 25;

  // First Payment
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const firstPayLabel = hasArabicFont ? 'الدفعة الأولى (50%)' : 'First Payment (50%)';
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(firstPayLabel, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(firstPayLabel, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 15;
  doc.setFontSize(14);
  doc.setTextColor(34, 139, 34);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatPdfNumber(billingData.first_payment)} SAR`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 15;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  const dueAtReg = hasArabicFont ? 'مستحقة عند التسجيل' : 'Due at Registration';
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(dueAtReg, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(dueAtReg, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 25;

  // Second Payment
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  const secondPayLabel = hasArabicFont ? 'الدفعة الثانية (50%)' : 'Second Payment (50%)';
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(secondPayLabel, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(secondPayLabel, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 15;
  doc.setFontSize(14);
  doc.setTextColor(220, 53, 69);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatPdfNumber(billingData.second_payment)} SAR`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 15;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  const secondPaymentDate = new Date(billingData.course_start_date);
  secondPaymentDate.setMonth(secondPaymentDate.getMonth() + 1);
  const dueDateLabel = hasArabicFont ? `تاريخ الاستحقاق: ${format(secondPaymentDate, 'MM/dd/yyyy')}` : `Due Date: ${format(secondPaymentDate, 'MM/dd/yyyy')}`;
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(dueDateLabel, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(dueDateLabel, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 35;

  // Student Signature Section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  const sigTitle = hasArabicFont ? 'توقيع الطالب' : 'Student Signature';
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(sigTitle, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(sigTitle, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 15;
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  const sigNote = hasArabicFont ? 'يرجى التوقيع أدناه إقرارًا بالموافقة على الشروط والأحكام' : 'Please sign below to agree to the terms and conditions';
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    renderArabicText(sigNote, pageWidth - margin, yPos, { align: 'right' });
  } else {
    doc.text(sigNote, pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 20;

  // Signature box with dashed border
  const sigBoxX = margin;
  const sigBoxY = yPos;
  const sigBoxWidth = pageWidth - 2 * margin;
  const sigBoxHeight = 100;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
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
