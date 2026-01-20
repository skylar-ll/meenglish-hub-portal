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
    'Indian': 'هندية',
    'Pakistani': 'باكستانية',
    'Bangladeshi': 'بنجلاديشية',
    'Filipino': 'فلبينية',
    'Indonesian': 'إندونيسية',
    'Sudanese': 'سودانية',
    'Moroccan': 'مغربية',
    'Tunisian': 'تونسية',
    'Algerian': 'جزائرية',
    'Libyan': 'ليبية',
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

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

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

  // === DECORATIVE CORNER TRIANGLES ===
  // Top-left dark blue triangle
  doc.setFillColor(26, 54, 93); // Navy blue
  doc.triangle(0, 0, 50, 0, 0, 40, 'F');

  // Bottom-left: Two triangles (navy + red)
  doc.setFillColor(26, 54, 93); // Navy blue
  doc.triangle(0, pageHeight - 60, 0, pageHeight, 50, pageHeight, 'F');
  doc.setFillColor(178, 34, 52); // Red
  doc.triangle(0, pageHeight - 35, 0, pageHeight, 30, pageHeight, 'F');

  // Bottom-right: Two triangles (navy + red)
  doc.setFillColor(26, 54, 93); // Navy blue
  doc.triangle(pageWidth, pageHeight - 75, pageWidth, pageHeight, pageWidth - 65, pageHeight, 'F');
  doc.setFillColor(178, 34, 52); // Red
  doc.triangle(pageWidth, pageHeight - 45, pageWidth, pageHeight, pageWidth - 40, pageHeight, 'F');

  // === LOGO - Top center with "EDUCATION" text ===
  try {
    const logoBase64 = await getLogoBase64();
    const logoWidth = 28;
    const logoHeight = 22;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 8;
    doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (logoError) {
    console.warn('Logo loading failed:', logoError);
  }

  // === TOP-RIGHT HEADER (Arabic - Saudi Arabia info) ===
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text('المملكة العربية السعودية', pageWidth - 12, 12, { align: 'right' });
    doc.setFontSize(7);
    doc.text('تحت إشراف المؤسسة العامة للتدريب التقني والمهني', pageWidth - 12, 17, { align: 'right' });
    doc.text('معهد التعليم الحديث', pageWidth - 12, 22, { align: 'right' });
    doc.text('ترخيص رقم: 19187872660000', pageWidth - 12, 27, { align: 'right' });
  }

  // === ARABIC SUBTITLE (Gold/Brown color) ===
  doc.setTextColor(139, 90, 43); // Golden brown
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(18);
    doc.text('شهادة إجتياز دورة في اللغة الإنجليزية', pageWidth / 2, 48, { align: 'center' });
  }

  // === MAIN TITLE - "CERTIFICATE" ===
  doc.setTextColor(139, 90, 43); // Golden brown
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(56);
  doc.text('CERTIFICATE', pageWidth / 2, 72, { align: 'center' });

  // "of Completion" subtitle
  doc.setFont('times', 'italic');
  doc.setFontSize(20);
  doc.setTextColor(80, 80, 80);
  doc.text('of Completion', pageWidth / 2, 83, { align: 'center' });

  // === CERTIFICATE BODY - Two columns ===
  const leftColX = 22;
  const rightColX = pageWidth - 22;
  let y = 100;
  const lineHeight = 7;

  // Gender-specific titles
  const genderTitleEn = data.gender === 'male' ? 'Mr.' : 'Ms.';
  const genderTitleAr = data.gender === 'male' ? 'بأن المتدرب :' : 'بأن المتدربة :';
  const nationalityAr = getNationalityArabic(data.nationality);
  const levelsAr = getLevelsArabic(data.levelsCompleted);

  // Line 1: Institute certification
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text('Modern Education Institute certifies that', leftColX, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text('يشهد معهد التعليم الحديث', rightColX, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 2: Student name (bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${genderTitleEn} ${data.studentNameEn}.`, leftColX, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(12);
    doc.text(`${genderTitleAr} ${data.studentNameAr}.`, rightColX, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 3: Nationality and ID
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${data.nationality} nationality. ID No. ${data.nationalId}.`, leftColX, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`${nationalityAr} الجنسية بموجب هوية رقم/ ${data.nationalId}.`, rightColX, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 4: Date of birth
  doc.setFont('helvetica', 'normal');
  doc.text(`Date of birth: ${data.dateOfBirth}.`, leftColX, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`تاريخ ميلاد: ${data.dateOfBirth}.`, rightColX, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 5: Program completion
  doc.text(`Has completed a ${formatPdfNumber(data.totalHours)}-hour English Language program`, leftColX, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`قد أكملت دورة اللغة الإنجليزية للمستويات ${levelsAr}`, rightColX, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 6: Levels
  doc.text(`for levels (${data.levelsCompleted})`, leftColX, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.text(`بواقع ${formatPdfNumber(data.totalHours)} ساعة`, rightColX, y, { align: 'right' });
  }

  y += lineHeight;
  // Line 7: Grade (highlighted)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(178, 34, 52); // Red for emphasis
  doc.text(`And achieved a percentage of ${formatPdfNumber(data.finalGrade)}% and a grade of ${data.gradeLetterEn}.`, leftColX, y);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setTextColor(178, 34, 52);
    doc.text(`بتقدير ${data.gradeLetterAr} ونسبة ${formatPdfNumber(data.finalGrade)}%.`, rightColX, y, { align: 'right' });
  }

  // === ISSUE DATE (Arabic side - right) ===
  y += lineHeight * 2;
  doc.setTextColor(50, 50, 50);
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(10);
    // Format: م 2022/3/200 الموافق 02/04/1447
    doc.text(`م ${data.issueDate} الموافق ${data.issueDateHijri}`, rightColX, y, { align: 'right' });
  }

  // === INSTITUTE SEAL (bottom left) ===
  const sealCenterX = 75;
  const sealCenterY = pageHeight - 40;
  const sealRadius = 22;

  // Outer circle
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(1);
  doc.circle(sealCenterX, sealCenterY, sealRadius, 'S');

  // Inner circle
  doc.setLineWidth(0.5);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 4, 'S');

  // Seal text
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  
  // Top arc text "MODERN EDUCATION"
  doc.text('M O D E R N', sealCenterX - 10, sealCenterY - 16);
  doc.text('E D U C A T I O N', sealCenterX - 12, sealCenterY - 12);
  
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(8);
    doc.text('اعتماد', sealCenterX, sealCenterY - 5, { align: 'center' });
    doc.setFontSize(7);
    doc.text('معهد التعليم الحديث للغات', sealCenterX, sealCenterY + 2, { align: 'center' });
    doc.text('المؤسسة العامة للتدريب', sealCenterX, sealCenterY + 8, { align: 'center' });
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('316722343201620', sealCenterX, sealCenterY + 14, { align: 'center' });
  doc.text('T  V  T  C', sealCenterX, sealCenterY + 18, { align: 'center' });

  // === SIGNATURE (bottom right) ===
  const signX = pageWidth - 60;
  const signY = pageHeight - 35;

  // Signature line (wavy/cursive style simulation)
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.3);
  
  // Simple signature line
  doc.line(signX - 25, signY, signX + 25, signY);

  // Signatory name
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text('AHMED ALI', signX, signY + 8, { align: 'center' });

  // Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(178, 34, 52); // Red
  doc.text('Associate Director', signX, signY + 15, { align: 'center' });

  // Return as blob
  return doc.output('blob');
};

export default generateCertificatePDF;
