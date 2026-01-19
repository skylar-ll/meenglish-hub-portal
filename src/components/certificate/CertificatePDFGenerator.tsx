/**
 * Certificate PDF Generator
 * Generates bilingual (English/Arabic) certificate matching the official Modern Education Institute design
 */

import { jsPDF } from 'jspdf';
import { loadArabicFont } from '@/lib/arabicFontLoader';
import { formatPdfNumber } from '@/lib/pdfFormat';

export interface CertificateData {
  studentNameEn: string;
  studentNameAr: string;
  nationalId: string;
  nationality: string;
  dateOfBirth: string;
  courseName: string;
  levelsCompleted: string; // e.g., "1 to 6" or "1"
  totalHours: number;
  finalGrade: number;
  gradeLetterEn: string;
  gradeLetterAr: string;
  issueDate: string;
  issueDateHijri: string;
  gender: 'male' | 'female';
}

// Convert grade percentage to letter grade
export const getGradeLetter = (grade: number): { en: string; ar: string } => {
  if (grade >= 95) return { en: 'A+', ar: 'ممتاز مرتفع' };
  if (grade >= 90) return { en: 'A', ar: 'ممتاز' };
  if (grade >= 85) return { en: 'B+', ar: 'جيد جداً مرتفع' };
  if (grade >= 80) return { en: 'B', ar: 'جيد جداً' };
  if (grade >= 75) return { en: 'C+', ar: 'جيد مرتفع' };
  if (grade >= 70) return { en: 'C', ar: 'جيد' };
  if (grade >= 65) return { en: 'D+', ar: 'مقبول مرتفع' };
  if (grade >= 60) return { en: 'D', ar: 'مقبول' };
  return { en: 'F', ar: 'راسب' };
};

// Convert Gregorian date to Hijri (approximate conversion)
const toHijriDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch {
    return dateStr;
  }
};

export const generateCertificatePDF = async (data: CertificateData): Promise<Blob> => {
  // Create A4 landscape document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Load Arabic font
  let hasArabicFont = false;
  try {
    const arabicFontBase64 = await loadArabicFont();
    doc.addFileToVFS('Amiri-Regular.ttf', arabicFontBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    hasArabicFont = true;
  } catch (fontError) {
    console.warn('Arabic font loading failed:', fontError);
  }

  // Helper function to draw Arabic text (right-to-left)
  const drawArabicText = (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right'; maxWidth?: number }) => {
    if (hasArabicFont) {
      doc.setFont('Amiri', 'normal');
    }
    doc.text(text, x, y, { align: options?.align || 'right', maxWidth: options?.maxWidth });
  };

  const drawEnglishText = (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right'; maxWidth?: number }) => {
    doc.setFont('helvetica', 'normal');
    doc.text(text, x, y, { align: options?.align || 'left', maxWidth: options?.maxWidth });
  };

  // === BACKGROUND DESIGN ===
  // Top left dark blue triangle
  doc.setFillColor(35, 55, 77);
  doc.triangle(0, 0, 60, 0, 0, 40, 'F');

  // Top right dark triangle
  doc.setFillColor(35, 55, 77);
  doc.triangle(pageWidth - 40, 0, pageWidth, 0, pageWidth, 30, 'F');

  // Bottom left red triangle  
  doc.setFillColor(180, 35, 45);
  doc.triangle(0, pageHeight - 60, 0, pageHeight, 50, pageHeight, 'F');

  // Bottom right red design
  doc.setFillColor(180, 35, 45);
  doc.triangle(pageWidth - 60, pageHeight, pageWidth, pageHeight - 80, pageWidth, pageHeight, 'F');

  // === HEADER SECTION ===
  // Kingdom of Saudi Arabia header (Arabic - top right)
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text('المملكة العربية السعودية', pageWidth - 15, 15, { align: 'right' });
    doc.setFontSize(9);
    doc.text('تحت إشراف المؤسسة العامة للتدريب التقني والمهني', pageWidth - 15, 21, { align: 'right' });
    doc.text('معهد التعليم الحديث', pageWidth - 15, 27, { align: 'right' });
    doc.text('ترخيص رقم: 19187335022600', pageWidth - 15, 33, { align: 'right' });
  }

  // === MAIN TITLE ===
  // Arabic title (gold/brown color)
  doc.setTextColor(139, 90, 43);
  doc.setFontSize(18);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text('شهادة إجتياز دورة في اللغة الإنجليزية', pageWidth / 2, 55, { align: 'center' });
  }

  // "CERTIFICATE" in large text
  doc.setTextColor(139, 90, 43);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(48);
  doc.text('CERTIFICATE', pageWidth / 2, 80, { align: 'center' });

  // "of Completion"
  doc.setFont('times', 'normal');
  doc.setFontSize(24);
  doc.setTextColor(50, 50, 50);
  doc.text('of Completion', pageWidth / 2, 92, { align: 'center' });

  // === CERTIFICATE BODY ===
  const leftColumnX = 25;
  const rightColumnX = pageWidth - 25;
  let yPos = 115;
  const lineHeight = 7;

  // English text (left side)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  
  const genderTitleEn = data.gender === 'male' ? 'Mr.' : 'Ms.';
  const genderTitleAr = data.gender === 'male' ? 'بأن المتدرب :' : 'بأن المتدربة :';
  const nationalityAr = data.nationality === 'Saudi' ? 'سعودية الجنسية' : `${data.nationality} الجنسية`;
  const nationalityEn = `${data.nationality} nationality`;

  // Line 1: Institute certifies...
  doc.text('Modern Education Institute certifies that', leftColumnX, yPos);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text('يشهد معهد التعليم الحديث', rightColumnX, yPos, { align: 'right' });
  }

  yPos += lineHeight;
  // Line 2: Name
  doc.setFont('helvetica', 'bold');
  doc.text(`${genderTitleEn} ${data.studentNameEn}.`, leftColumnX, yPos);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`${genderTitleAr} ${data.studentNameAr}.`, rightColumnX, yPos, { align: 'right' });
  }

  yPos += lineHeight;
  // Line 3: Nationality and ID
  doc.setFont('helvetica', 'normal');
  doc.text(`${nationalityEn}. ID No. ${data.nationalId}.`, leftColumnX, yPos);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`${nationalityAr}. بموجب هوية رقم/ ${data.nationalId}.`, rightColumnX, yPos, { align: 'right' });
  }

  yPos += lineHeight;
  // Line 4: Date of birth
  doc.setFont('helvetica', 'normal');
  doc.text(`Date of birth: ${data.dateOfBirth}.`, leftColumnX, yPos);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`تاريخ ميلاد : ${data.dateOfBirth}.`, rightColumnX, yPos, { align: 'right' });
  }

  yPos += lineHeight;
  // Line 5: Course completion
  doc.setFont('helvetica', 'normal');
  doc.text(`Has completed a ${formatPdfNumber(data.totalHours)}-hour English Language program`, leftColumnX, yPos);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`قد أكملت دورة اللغة الانجليزية للمستويات (الأول إلى السادس)`, rightColumnX, yPos, { align: 'right' });
  }

  yPos += lineHeight;
  // Line 6: Levels
  doc.text(`for levels (${data.levelsCompleted})`, leftColumnX, yPos);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`بواقع ${formatPdfNumber(data.totalHours)} ساعة.`, rightColumnX, yPos, { align: 'right' });
  }

  yPos += lineHeight;
  // Line 7: Grade (bold)
  doc.setFont('helvetica', 'bold');
  doc.text(`And achieved a percentage of ${formatPdfNumber(data.finalGrade)}% and a grade of ${data.gradeLetterEn}.`, leftColumnX, yPos);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`بتقدير ${data.gradeLetterAr}، ونسبة ${formatPdfNumber(data.finalGrade)} %.`, rightColumnX, yPos, { align: 'right' });
  }

  // === ISSUE DATE (Arabic - right side) ===
  yPos += lineHeight * 2;
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(10);
    doc.text(`تاريخ اصدار الشهادة ${data.issueDateHijri}`, rightColumnX, yPos, { align: 'right' });
  }

  // === FOOTER SECTION ===
  // Institute seal placeholder (left side)
  const sealX = 70;
  const sealY = pageHeight - 45;
  doc.setDrawColor(100, 100, 100);
  doc.setFillColor(255, 255, 255);
  doc.circle(sealX, sealY, 22, 'S');
  
  // Seal text
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('MODERN EDUCATION', sealX, sealY - 12, { align: 'center' });
  
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(7);
    doc.text('اعتماد', sealX, sealY - 5, { align: 'center' });
    doc.text('معهد التعليم الحديث للغات', sealX, sealY + 2, { align: 'center' });
    doc.text('/المؤسسة العامة للتدريب/', sealX, sealY + 8, { align: 'center' });
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('19187335022600', sealX, sealY + 14, { align: 'center' });
  doc.text('T V T C', sealX, sealY + 19, { align: 'center' });

  // Signature section (right side)
  const signX = pageWidth - 70;
  const signY = pageHeight - 35;
  
  // Signature line
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.3);
  doc.line(signX - 30, signY, signX + 30, signY);
  
  // Signatory name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text('AHMED ALI', signX, signY + 7, { align: 'center' });
  
  // Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 35, 45);
  doc.text('Associate Director', signX, signY + 13, { align: 'center' });

  // Return as blob
  return doc.output('blob');
};

export default generateCertificatePDF;
