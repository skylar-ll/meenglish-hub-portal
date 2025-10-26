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
  const margin = 40;
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

  // Simple clean layout matching reference screenshot
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Modern Education Institute of Language', margin, yPos);
  yPos += 40;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Student Name (English): ${billingData.student_name_en}`, margin, yPos);
  yPos += 30;

  doc.text(`Student Name (Arabic): ${billingData.student_name_ar}`, margin, yPos);
  yPos += 30;

  doc.text(`Contact Number: ${billingData.phone}`, margin, yPos);
  yPos += 30;

  doc.text(`Course Package: ${billingData.course_package}`, margin, yPos);
  yPos += 30;

  doc.text(`Time Slot: ${billingData.time_slot || 'Not specified'}`, margin, yPos);
  yPos += 30;

  doc.text(`Level Count: ${billingData.level_count}`, margin, yPos);
  yPos += 30;

  doc.text(`Registration Date: ${format(new Date(billingData.registration_date), 'MM/dd/yyyy')}`, margin, yPos);
  yPos += 30;

  doc.text(`Course Start Date: ${format(new Date(billingData.course_start_date), 'MM/dd/yyyy')}`, margin, yPos);
  yPos += 30;

  doc.text(`Total Fee: ${billingData.total_fee.toLocaleString()} SR  |  Discount: ${billingData.discount_percentage}%`, margin, yPos);
  yPos += 30;

  doc.text(`Fee After Discount: ${billingData.fee_after_discount.toLocaleString()} SR`, margin, yPos);
  yPos += 30;

  doc.text(`Amount Paid: ${billingData.amount_paid.toLocaleString()} SR  |  Amount Remaining: ${billingData.amount_remaining.toLocaleString()} SR`, margin, yPos);
  yPos += 50;

  // Student Signature Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Signature:', margin, yPos);
  yPos += 40;

  // Load and embed signature
  const signatureDataUrl = await loadSignatureImage();
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', margin, yPos, 300, 150);
    } catch (error) {
      console.error('Failed to add signature to PDF:', error);
    }
  }

  return doc.output('blob');
};
