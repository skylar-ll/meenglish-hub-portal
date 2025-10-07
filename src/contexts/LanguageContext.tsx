import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Homepage
    'home.welcome': 'Welcome to Modern Education Center',
    'home.choosePortal': 'Choose Your Portal',
    'home.studentPortal': 'Student Portal',
    'home.teacherPortal': 'Teacher Portal',
    'home.adminPortal': 'Admin Portal',
    'home.studentDesc': 'Register, select courses, and track your progress',
    'home.teacherDesc': 'Manage students, mark attendance, and upload lessons',
    'home.adminDesc': 'View analytics, manage payments, and oversee operations',
    'home.copyright': '© 2024 Modern Education Institute of Languages. All rights reserved.',
    'home.instituteName': 'Modern Education Institute of Languages',
    'home.selectLanguage': 'Select Language',
    
    // Student Portal
    'student.signup': 'Student Registration',
    'student.signup.subtitle': 'Create your account to get started',
    'student.fullNameAr': 'Full Name (Arabic)',
    'student.fullNameEn': 'Full Name (English)',
    'student.phone': 'Phone Number',
    'student.phoneSecondary': 'Phone Number (Secondary)',
    'student.email': 'Email Address',
    'student.nationalId': 'National ID / Iqama',
    'student.backHome': 'Back to Home',
    'student.next': 'Next',
    'student.fillRequired': 'Please fill in all required fields',
    
    // Common
    'common.login': 'Login',
    'common.signup': 'Sign Up',
    'common.logout': 'Logout',
    'common.submit': 'Submit',
    'common.cancel': 'Cancel',
  },
  ar: {
    // Homepage
    'home.welcome': 'مرحباً بكم في مركز التعليم الحديث',
    'home.choosePortal': 'اختر بوابتك',
    'home.studentPortal': 'بوابة الطالب',
    'home.teacherPortal': 'بوابة المعلم',
    'home.adminPortal': 'بوابة الإدارة',
    'home.studentDesc': 'سجل، اختر الدورات، وتتبع تقدمك',
    'home.teacherDesc': 'إدارة الطلاب، تسجيل الحضور، ورفع الدروس',
    'home.adminDesc': 'عرض التحليلات، إدارة المدفوعات، والإشراف على العمليات',
    'home.copyright': '© 2024 المعهد الحديث للتعليم واللغات. جميع الحقوق محفوظة.',
    'home.instituteName': 'المعهد الحديث للتعليم واللغات',
    'home.selectLanguage': 'اختر اللغة',
    
    // Student Portal
    'student.signup': 'تسجيل الطالب',
    'student.signup.subtitle': 'أنشئ حسابك للبدء',
    'student.fullNameAr': 'الاسم الكامل (عربي)',
    'student.fullNameEn': 'الاسم الكامل (إنجليزي)',
    'student.phone': 'رقم الهاتف',
    'student.phoneSecondary': 'رقم الهاتف (ثانوي)',
    'student.email': 'البريد الإلكتروني',
    'student.nationalId': 'رقم الهوية / الإقامة',
    'student.backHome': 'العودة للرئيسية',
    'student.next': 'التالي',
    'student.fillRequired': 'يرجى ملء جميع الحقول المطلوبة',
    
    // Common
    'common.login': 'تسجيل الدخول',
    'common.signup': 'إنشاء حساب',
    'common.logout': 'تسجيل الخروج',
    'common.submit': 'إرسال',
    'common.cancel': 'إلغاء',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
