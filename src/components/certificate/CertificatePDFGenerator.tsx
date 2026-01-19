/**
 * Certificate PDF Generator
 * Generates bilingual (English/Arabic) certificate matching the official Modern Education Institute design
 * EXACTLY as per the reference certificate provided
 */

import { jsPDF } from 'jspdf';
import { loadArabicFont } from '@/lib/arabicFontLoader';
import { formatPdfNumber } from '@/lib/pdfFormat';
import logoImage from '@/assets/logo-new.png';

// Convert image to base64 for embedding in PDF
const getLogoBase64 = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = logoImage;
  });
};

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

// Convert levels to Arabic text
const getLevelsArabic = (levels: string): string => {
  // Map numbers to Arabic ordinals
  const arabicOrdinals: Record<string, string> = {
    '1': 'الأول',
    '2': 'الثاني',
    '3': 'الثالث',
    '4': 'الرابع',
    '5': 'الخامس',
    '6': 'السادس',
    '7': 'السابع',
    '8': 'الثامن',
    '9': 'التاسع',
    '10': 'العاشر',
    '11': 'الحادي عشر',
    '12': 'الثاني عشر',
  };
  
  // Check if it's a range like "1 to 6"
  const rangeMatch = levels.match(/(\d+)\s*to\s*(\d+)/i);
  if (rangeMatch) {
    const from = arabicOrdinals[rangeMatch[1]] || rangeMatch[1];
    const to = arabicOrdinals[rangeMatch[2]] || rangeMatch[2];
    return `(${from} إلى ${to})`;
  }
  
  // Single level
  const singleMatch = levels.match(/(\d+)/);
  if (singleMatch) {
    return arabicOrdinals[singleMatch[1]] || singleMatch[1];
  }
  
  return levels;
};

// Get nationality in Arabic
const getNationalityArabic = (nationality: string): string => {
  const nationalityMap: Record<string, string> = {
    'Saudi': 'سعودية',
    'Emirati': 'إماراتية',
    'Kuwaiti': 'كويتية',
    'Bahraini': 'بحرينية',
    'Qatari': 'قطرية',
    'Omani': 'عمانية',
    'Egyptian': 'مصرية',
    'Jordanian': 'أردنية',
    'Lebanese': 'لبنانية',
    'Syrian': 'سورية',
    'Palestinian': 'فلسطينية',
    'Yemeni': 'يمنية',
    'Iraqi': 'عراقية',
  };
  return nationalityMap[nationality] || nationality;
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

  // === BACKGROUND DECORATIVE TRIANGLES ===
  // Top left dark blue/gray triangle
  doc.setFillColor(45, 55, 72);
  doc.triangle(0, 0, 55, 0, 0, 45, 'F');

  // Top right dark triangle  
  doc.setFillColor(45, 55, 72);
  doc.triangle(pageWidth - 35, 0, pageWidth, 0, pageWidth, 28, 'F');

  // Bottom left red triangle  
  doc.setFillColor(180, 35, 45);
  doc.triangle(0, pageHeight - 55, 0, pageHeight, 45, pageHeight, 'F');

  // Bottom right red triangle
  doc.setFillColor(180, 35, 45);
  doc.triangle(pageWidth - 55, pageHeight, pageWidth, pageHeight - 70, pageWidth, pageHeight, 'F');

  // === LOGO - Center top ===
  try {
    const logoBase64 = await getLogoBase64();
    // Add logo centered at top - adjust size to match reference (approximately 35mm wide)
    const logoWidth = 35;
    const logoHeight = 25; // Adjust aspect ratio as needed
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 8;
    doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (logoError) {
    console.warn('Logo loading failed:', logoError);
  }

  // === HEADER - Right side (Arabic) ===
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text('المملكة العربية السعودية', pageWidth - 15, 15, { align: 'right' });
    doc.setFontSize(8);
    doc.text('تحت إشراف المؤسسة العامة للتدريب التقني والمهني', pageWidth - 15, 21, { align: 'right' });
    doc.text('معهد التعليم الحديث', pageWidth - 15, 27, { align: 'right' });
    doc.text('ترخيص رقم: 19187335022600', pageWidth - 15, 33, { align: 'right' });
  }

  // === ARABIC SUBTITLE (Golden/Brown) ===
  doc.setTextColor(139, 90, 43);
  doc.setFontSize(16);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text('شهادة إجتياز دورة في اللغة الإنجليزية', pageWidth / 2, 52, { align: 'center' });
  }

  // === MAIN TITLE - "CERTIFICATE" ===
  doc.setTextColor(139, 90, 43);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(52);
  doc.text('CERTIFICATE', pageWidth / 2, 75, { align: 'center' });

  // "of Completion" subtitle
  doc.setFont('times', 'italic');
  doc.setFontSize(22);
  doc.setTextColor(80, 80, 80);
  doc.text('of Completion', pageWidth / 2, 87, { align: 'center' });

  // === CERTIFICATE BODY - Two columns ===
  const leftCol = 25;
  const rightCol = pageWidth - 25;
  let y = 105;
  const lineHeight = 6.5;

  // Gender-specific titles
  const genderTitleEn = data.gender === 'male' ? 'Mr.' : 'Ms.';
  const genderTitleAr = data.gender === 'male' ? 'بأن المتدرب :' : 'بأن المتدربة :';
  const nationalityAr = getNationalityArabic(data.nationality);
  const levelsAr = getLevelsArabic(data.levelsCompleted);

  // Line 1: Institute certification
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text('Modern Education Institute certifies that', leftCol, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text('يشهد معهد التعليم الحديث', rightCol, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 2: Student name (bold)
  doc.setFont('helvetica', 'bold');
  doc.text(`${genderTitleEn} ${data.studentNameEn}.`, leftCol, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`${genderTitleAr} ${data.studentNameAr}.`, rightCol, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 3: Nationality and ID
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.nationality} nationality. ID No. ${data.nationalId}.`, leftCol, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`${nationalityAr} الجنسية. بموجب هوية رقم/ ${data.nationalId}.`, rightCol, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 4: Date of birth
  doc.setFont('helvetica', 'normal');
  doc.text(`Date of birth: ${data.dateOfBirth}.`, leftCol, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`تاريخ ميلاد : ${data.dateOfBirth}.`, rightCol, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 5: Program completion
  doc.setFont('helvetica', 'normal');
  doc.text(`Has completed a ${formatPdfNumber(data.totalHours)}-hour English Language program`, leftCol, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`قد أكملت دورة اللغة الانجليزية للمستويات ${levelsAr}`, rightCol, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 6: Levels
  doc.text(`for levels (${data.levelsCompleted})`, leftCol, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`بواقع ${formatPdfNumber(data.totalHours)} ساعة.`, rightCol, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 7: Grade (bold for emphasis)
  doc.setFont('helvetica', 'bold');
  doc.text(`And achieved a percentage of ${formatPdfNumber(data.finalGrade)}% and a grade of ${data.gradeLetterEn}.`, leftCol, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`بتقدير ${data.gradeLetterAr}، ونسبة ${formatPdfNumber(data.finalGrade)} %.`, rightCol, y, { align: 'right' });
  }

  // === ISSUE DATE (Arabic - right side) ===
  y += lineHeight * 2.5;
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(10);
    doc.text(`تاريخ اصدار الشهادة ${data.issueDateHijri}`, rightCol, y, { align: 'right' });
  }

  // === FOOTER SECTION ===
  // Institute seal (left side)
  const sealX = 72;
  const sealY = pageHeight - 42;
  
  // Outer circle
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.8);
  doc.circle(sealX, sealY, 22, 'S');
  
  // Inner circle
  doc.setLineWidth(0.5);
  doc.circle(sealX, sealY, 18, 'S');

  // Seal text
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  
  // Top arc text
  doc.text('MODERN', sealX - 8, sealY - 14);
  doc.text('EDUCATION', sealX + 2, sealY - 14);
  
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(7);
    doc.text('اعتماد', sealX, sealY - 6, { align: 'center' });
    doc.text('معهد التعليم الحديث للغات', sealX, sealY + 1, { align: 'center' });
    doc.text('/المؤسسة العامة للتدريب/', sealX, sealY + 7, { align: 'center' });
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('19187335022600', sealX, sealY + 13, { align: 'center' });
  doc.text('T  V  T  C', sealX, sealY + 17, { align: 'center' });

  // === SIGNATURE (right side) ===
  const signX = pageWidth - 65;
  const signY = pageHeight - 32;
  
  // Signature line
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.4);
  doc.line(signX - 28, signY, signX + 28, signY);
  
  // Signatory name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text('AHMED ALI', signX, signY + 6, { align: 'center' });
  
  // Title in red
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 35, 45);
  doc.text('Associate Director', signX, signY + 12, { align: 'center' });

  // Return as blob
  return doc.output('blob');
};

export default generateCertificatePDF;
