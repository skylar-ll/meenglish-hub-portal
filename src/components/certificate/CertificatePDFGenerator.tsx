/**
 * Certificate PDF Generator
 * Generates bilingual (English/Arabic) certificate matching the EXACT official 
 * Modern Education Institute design with decorative corners, seal, and signature
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
  
  const rangeMatch = levels.match(/(\d+)\s*to\s*(\d+)/i);
  if (rangeMatch) {
    const from = arabicOrdinals[rangeMatch[1]] || rangeMatch[1];
    const to = arabicOrdinals[rangeMatch[2]] || rangeMatch[2];
    return `(${from} إلى ${to})`;
  }
  
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

  // === DECORATIVE CORNER TRIANGLES (Exactly as reference) ===
  // Top-left: Dark navy triangle
  doc.setFillColor(26, 54, 93); // Navy blue #1A365D
  doc.triangle(0, 0, 55, 0, 0, 45, 'F');

  // Bottom-left: Navy + Red triangles
  doc.setFillColor(26, 54, 93); // Navy
  doc.triangle(0, pageHeight - 65, 0, pageHeight, 55, pageHeight, 'F');
  doc.setFillColor(178, 34, 52); // Red #B22234
  doc.triangle(0, pageHeight - 38, 0, pageHeight, 32, pageHeight, 'F');

  // Bottom-right: Navy + Red triangles
  doc.setFillColor(26, 54, 93); // Navy
  doc.triangle(pageWidth, pageHeight - 80, pageWidth, pageHeight, pageWidth - 70, pageHeight, 'F');
  doc.setFillColor(178, 34, 52); // Red
  doc.triangle(pageWidth, pageHeight - 48, pageWidth, pageHeight, pageWidth - 42, pageHeight, 'F');

  // === LOGO - Top center ===
  try {
    const logoBase64 = await getLogoBase64();
    const logoWidth = 32;
    const logoHeight = 26;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 6;
    doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
  } catch (logoError) {
    console.warn('Logo loading failed:', logoError);
  }

  // === TOP-RIGHT HEADER (Arabic - Saudi Arabia) ===
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text('المملكة العربية السعودية', pageWidth - 15, 14, { align: 'right' });
    doc.setFontSize(8);
    doc.text('تحت إشراف المؤسسة العامة للتدريب التقني والمهني', pageWidth - 15, 20, { align: 'right' });
    doc.text('معهد التعليم الحديث', pageWidth - 15, 26, { align: 'right' });
    doc.text('ترخيص رقم: 19187872660000', pageWidth - 15, 32, { align: 'right' });
  }

  // === ARABIC TITLE (Golden brown) ===
  if (hasArabicFont) {
    doc.setTextColor(139, 90, 43); // Golden brown #8B5A2B
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(20);
    doc.text('شهادة إجتياز دورة في اللغة الإنجليزية', pageWidth / 2, 50, { align: 'center' });
  }

  // === MAIN TITLE - "CERTIFICATE" (Large, italic, golden) ===
  doc.setTextColor(139, 90, 43); // Golden brown
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(52);
  doc.text('CERTIFICATE', pageWidth / 2, 72, { align: 'center' });

  // "of Completion" subtitle
  doc.setFont('times', 'italic');
  doc.setFontSize(18);
  doc.setTextColor(80, 80, 80);
  doc.text('of Completion', pageWidth / 2, 82, { align: 'center' });

  // === CERTIFICATE BODY - Two columns ===
  const leftX = 20;
  const rightX = pageWidth - 20;
  let y = 100;
  const lineHeight = 7;

  // Gender prefix
  const genderEn = data.gender === 'male' ? 'Mr.' : 'Ms.';
  const genderAr = data.gender === 'male' ? 'بأن المتدرب :' : 'بأن المتدربة :';
  const nationalityAr = getNationalityArabic(data.nationality);
  const levelsAr = getLevelsArabic(data.levelsCompleted);

  // === LEFT COLUMN (English) ===
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  
  // Line 1
  doc.text('Modern Education Institute certifies that', leftX, y);
  
  // Line 2 - Student name (bold)
  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${genderEn} ${data.studentNameEn}.`, leftX, y);
  
  // Line 3 - Nationality and ID
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${data.nationality} nationality. ID No. ${data.nationalId}.`, leftX, y);
  
  // Line 4 - DOB
  y += lineHeight;
  doc.text(`Date of birth: ${data.dateOfBirth}.`, leftX, y);
  
  // Line 5 - Program
  y += lineHeight;
  doc.text(`Has completed a ${formatPdfNumber(data.totalHours)}-hour English Language program`, leftX, y);
  
  // Line 6 - Levels
  y += lineHeight;
  doc.text(`for levels (${data.levelsCompleted})`, leftX, y);
  
  // Line 7 - Grade (RED and bold)
  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(178, 34, 52); // Red
  doc.text(`And achieved a percentage of ${formatPdfNumber(data.finalGrade)}% and a grade of ${data.gradeLetterEn}.`, leftX, y);

  // === RIGHT COLUMN (Arabic) ===
  if (hasArabicFont) {
    let yAr = 100;
    
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    
    // Line 1
    doc.text('يشهد معهد التعليم الحديث', rightX, yAr, { align: 'right' });
    
    // Line 2 - Student name
    yAr += lineHeight;
    doc.setFontSize(12);
    doc.text(`${genderAr} ${data.studentNameAr}.`, rightX, yAr, { align: 'right' });
    
    // Line 3 - Nationality and ID
    yAr += lineHeight;
    doc.setFontSize(11);
    doc.text(`${nationalityAr} الجنسية بموجب هوية رقم/ ${data.nationalId}.`, rightX, yAr, { align: 'right' });
    
    // Line 4 - DOB
    yAr += lineHeight;
    doc.text(`تاريخ ميلاد: ${data.dateOfBirth}.`, rightX, yAr, { align: 'right' });
    
    // Line 5 - Program
    yAr += lineHeight;
    doc.text(`قد أكملت دورة اللغة الإنجليزية للمستويات ${levelsAr}`, rightX, yAr, { align: 'right' });
    
    // Line 6 - Hours
    yAr += lineHeight;
    doc.text(`بواقع ${formatPdfNumber(data.totalHours)} ساعة`, rightX, yAr, { align: 'right' });
    
    // Line 7 - Grade (RED)
    yAr += lineHeight;
    doc.setTextColor(178, 34, 52); // Red
    doc.text(`بتقدير ${data.gradeLetterAr} ونسبة ${formatPdfNumber(data.finalGrade)}%.`, rightX, yAr, { align: 'right' });
    
    // === DATE (Arabic side) ===
    yAr += lineHeight * 2;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    // Format: م YYYY/MM/DD الموافق Hijri date
    doc.text(`م ${data.issueDate} الموافق ${data.issueDateHijri}`, rightX, yAr, { align: 'right' });
  }

  // === INSTITUTE SEAL (Bottom left area) ===
  const sealX = 75;
  const sealY = pageHeight - 42;
  const sealRadius = 24;

  // Outer circle
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(1.2);
  doc.circle(sealX, sealY, sealRadius, 'S');
  
  // Inner circle
  doc.setLineWidth(0.6);
  doc.circle(sealX, sealY, sealRadius - 5, 'S');

  // Seal text
  doc.setTextColor(80, 80, 80);
  
  // Top curve - "MODERN EDUCATION"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('M O D E R N   E D U C A T I O N', sealX, sealY - 14, { align: 'center' });
  
  if (hasArabicFont) {
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(9);
    doc.text('اعتماد', sealX, sealY - 5, { align: 'center' });
    doc.setFontSize(7);
    doc.text('معهد التعليم الحديث للغات', sealX, sealY + 2, { align: 'center' });
    doc.text('المؤسسة العامة للتدريب', sealX, sealY + 8, { align: 'center' });
  }
  
  // TVTC registration
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('316722343201620', sealX, sealY + 14, { align: 'center' });
  doc.setFontSize(6);
  doc.text('T  V  T  C', sealX, sealY + 18, { align: 'center' });

  // === SIGNATURE (Bottom right) ===
  const sigX = pageWidth - 55;
  const sigY = pageHeight - 40;

  // Signature line (simulated cursive)
  doc.setDrawColor(70, 70, 70);
  doc.setLineWidth(0.4);
  // Simple curved line to simulate signature
  doc.line(sigX - 22, sigY - 2, sigX + 22, sigY - 2);

  // Name "AHMED ALI"
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(15);
  doc.setTextColor(50, 50, 50);
  doc.text('AHMED ALI', sigX, sigY + 6, { align: 'center' });

  // Title "Associate Director" in red
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(178, 34, 52); // Red
  doc.text('Associate Director', sigX, sigY + 13, { align: 'center' });

  // Return as blob
  return doc.output('blob');
};

export default generateCertificatePDF;
