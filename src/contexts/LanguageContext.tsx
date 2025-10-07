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
    'student.courseSelection': 'Course Selection',
    'student.back': 'Back',
    'student.englishLevel': 'English Program Level',
    'student.selectLevel': 'Select your level',
    'student.classType': 'Class Type / Other Languages',
    'student.selectClassType': 'Select class type',
    'student.courseInfo': 'Course Information',
    'student.courseInfoDesc': 'Each English course consists of 8 parts. Your progress will be tracked throughout the program.',
    'student.selectBothError': 'Please select both program level and class type',
    'student.branchSelection': 'Branch Selection',
    'student.selectBranch': 'Select Your Preferred Branch',
    'student.selectBranchError': 'Please select a branch',
    'student.paymentMethod': 'Payment Method',
    'student.selectPayment': 'Select Payment Method',
    'student.selectPaymentError': 'Please select a payment method',
    'student.paymentTerms': 'Payment Terms',
    'student.paymentTermsDesc': 'Payment confirmation will be processed within 24 hours. You will receive access to your course materials once payment is verified.',
    'student.confirmSubscribe': 'Confirm & Subscribe',
    'student.registrationSuccess': 'Registration completed successfully!',
    'student.myCourse': 'My Course',
    'student.courseLevel': 'Course Level',
    'student.program': 'Program',
    'student.classTypeLabel': 'Class Type',
    'student.subscriptionStatus': 'Subscription Status',
    'student.active': 'Active',
    'student.branchLocation': 'Branch Location',
    'student.nextPayment': 'Next Payment',
    'student.dailyAttendance': 'Daily Attendance',
    'student.days': 'Days',
    'student.completePart': 'Complete a part to mark daily attendance',
    'student.courseProgress': 'Course Progress',
    'student.completedParts': 'Completed Parts',
    'student.keepGoing': 'Keep going!',
    'student.partsRemaining': 'parts remaining',
    'student.congratulations': '🎉 Congratulations! You\'ve completed the course!',
    'student.curriculum': 'Course Curriculum',
    'student.completed': 'Completed',
    'student.inProgress': 'In Progress',
    'student.locked': 'Locked',
    'student.available': 'Available',
    'student.lessons': 'lessons',
    'student.attend': 'Attend',
    'student.completedCheck': 'Completed ✓',
    'student.attendanceMarked': 'Lesson attendance marked',
    'student.attendanceAlready': 'Attendance already marked for this lesson',
    'student.partCompleted': 'completed! Daily attendance marked.',
    'student.home': 'Home',
    
    // Branch names
    'branch.online': 'Online Classes',
    'branch.onlineDesc': 'Learn from anywhere with our virtual classrooms',
    'branch.dammam': 'Dammam Branch',
    'branch.dammamDesc': 'Main campus in Dammam',
    'branch.dhahran': 'Dhahran Branch',
    'branch.dhahranDesc': 'Located in Dhahran',
    'branch.khobar': 'Khobar Branch',
    'branch.khobarDesc': 'Located in Khobar',
    
    // Payment methods
    'payment.tamara': 'Tamara',
    'payment.tamaraDesc': 'Split into installments',
    'payment.tabby': 'Tabby',
    'payment.tabbyDesc': 'Buy now, pay later',
    'payment.cash': 'Cash',
    'payment.cashDesc': 'Pay in cash at branch',
    'payment.transfer': 'Bank Transfer',
    'payment.transferDesc': 'Direct bank transfer',
    'payment.card': 'Credit/Debit Card',
    'payment.cardDesc': 'Visa, Mastercard, Mada',
    
    // Teacher Portal
    'teacher.login': 'Teacher Login',
    'teacher.email': 'Teacher Email',
    'teacher.password': 'Password',
    'teacher.loginButton': 'Login to Teacher Portal',
    'teacher.dashboard': 'Teacher Dashboard',
    'teacher.backHome': 'Back to Home',
    'teacher.logout': 'Logout',
    'teacher.totalStudents': 'Total Students',
    'teacher.activeClasses': 'Active Classes',
    'teacher.pendingAttendance': 'Pending Attendance',
    'teacher.markAttendance': 'Mark Attendance',
    'teacher.uploadLessons': 'Upload Lessons',
    'teacher.createQuiz': 'Create Quiz',
    'teacher.myStudents': 'My Students',
    'teacher.course': 'Course',
    'teacher.progress': 'Progress',
    'teacher.courseProgress': 'Course Progress',
    'teacher.parts': 'parts',
    'teacher.loginError': 'Please enter email and password',
    'teacher.loginSuccess': 'Teacher login successful!',
    
    // Admin Portal
    'admin.login': 'Admin Portal',
    'admin.email': 'Admin Email',
    'admin.password': 'Password',
    'admin.loginButton': 'Login to Admin Portal',
    'admin.secureAccess': 'Secure admin access only. Unauthorized access is prohibited.',
    'admin.dashboard': 'Admin Dashboard',
    'admin.backHome': 'Back to Home',
    'admin.logout': 'Logout',
    'admin.totalStudents': 'Total Students',
    'admin.totalTeachers': 'Total Teachers',
    'admin.revenue': 'Monthly Revenue',
    'admin.activeClasses': 'Active Classes',
    'admin.studentsInfo': 'Students Information',
    'admin.teachersInfo': 'Teachers Information',
    'admin.recentRegistrations': 'Recent Registrations',
    'admin.registeredOn': 'Registered on',
    'admin.loginError': 'Please enter email and password',
    'admin.loginSuccess': 'Admin login successful!',
    
    // Not Found
    'notfound.title': '404',
    'notfound.message': 'Oops! Page not found',
    'notfound.returnHome': 'Return to Home',
    
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
    'student.courseSelection': 'اختيار الدورة',
    'student.back': 'رجوع',
    'student.englishLevel': 'مستوى برنامج اللغة الإنجليزية',
    'student.selectLevel': 'اختر مستواك',
    'student.classType': 'نوع الفصل / لغات أخرى',
    'student.selectClassType': 'اختر نوع الفصل',
    'student.courseInfo': 'معلومات الدورة',
    'student.courseInfoDesc': 'تتكون كل دورة لغة إنجليزية من 8 أجزاء. سيتم تتبع تقدمك طوال البرنامج.',
    'student.selectBothError': 'يرجى اختيار مستوى البرنامج ونوع الفصل',
    'student.branchSelection': 'اختيار الفرع',
    'student.selectBranch': 'اختر الفرع المفضل لديك',
    'student.selectBranchError': 'يرجى اختيار فرع',
    'student.paymentMethod': 'طريقة الدفع',
    'student.selectPayment': 'اختر طريقة الدفع',
    'student.selectPaymentError': 'يرجى اختيار طريقة الدفع',
    'student.paymentTerms': 'شروط الدفع',
    'student.paymentTermsDesc': 'سيتم معالجة تأكيد الدفع خلال 24 ساعة. ستحصل على وصول إلى مواد الدورة بمجرد التحقق من الدفع.',
    'student.confirmSubscribe': 'تأكيد والاشتراك',
    'student.registrationSuccess': 'تم التسجيل بنجاح!',
    'student.myCourse': 'دورتي',
    'student.courseLevel': 'مستوى الدورة',
    'student.program': 'البرنامج',
    'student.classTypeLabel': 'نوع الفصل',
    'student.subscriptionStatus': 'حالة الاشتراك',
    'student.active': 'نشط',
    'student.branchLocation': 'موقع الفرع',
    'student.nextPayment': 'الدفعة القادمة',
    'student.dailyAttendance': 'الحضور اليومي',
    'student.days': 'أيام',
    'student.completePart': 'أكمل جزءاً لتسجيل الحضور اليومي',
    'student.courseProgress': 'تقدم الدورة',
    'student.completedParts': 'الأجزاء المكتملة',
    'student.keepGoing': 'استمر!',
    'student.partsRemaining': 'أجزاء متبقية',
    'student.congratulations': '🎉 تهانينا! لقد أكملت الدورة!',
    'student.curriculum': 'منهج الدورة',
    'student.completed': 'مكتمل',
    'student.inProgress': 'قيد التنفيذ',
    'student.locked': 'مقفل',
    'student.available': 'متاح',
    'student.lessons': 'دروس',
    'student.attend': 'حضور',
    'student.completedCheck': 'مكتمل ✓',
    'student.attendanceMarked': 'تم تسجيل حضور الدرس',
    'student.attendanceAlready': 'تم تسجيل الحضور لهذا الدرس مسبقاً',
    'student.partCompleted': 'مكتمل! تم تسجيل الحضور اليومي.',
    'student.home': 'الرئيسية',
    
    // Branch names
    'branch.online': 'الفصول الافتراضية',
    'branch.onlineDesc': 'تعلم من أي مكان مع فصولنا الافتراضية',
    'branch.dammam': 'فرع الدمام',
    'branch.dammamDesc': 'الحرم الرئيسي في الدمام',
    'branch.dhahran': 'فرع الظهران',
    'branch.dhahranDesc': 'يقع في الظهران',
    'branch.khobar': 'فرع الخبر',
    'branch.khobarDesc': 'يقع في الخبر',
    
    // Payment methods
    'payment.tamara': 'تمارا',
    'payment.tamaraDesc': 'قسّم على دفعات',
    'payment.tabby': 'تابي',
    'payment.tabbyDesc': 'اشترِ الآن وادفع لاحقاً',
    'payment.cash': 'نقداً',
    'payment.cashDesc': 'ادفع نقداً في الفرع',
    'payment.transfer': 'تحويل بنكي',
    'payment.transferDesc': 'تحويل بنكي مباشر',
    'payment.card': 'بطاقة ائتمان/خصم',
    'payment.cardDesc': 'فيزا، ماستركارد، مدى',
    
    // Teacher Portal
    'teacher.login': 'تسجيل دخول المعلم',
    'teacher.email': 'البريد الإلكتروني للمعلم',
    'teacher.password': 'كلمة المرور',
    'teacher.loginButton': 'تسجيل الدخول إلى بوابة المعلم',
    'teacher.dashboard': 'لوحة المعلم',
    'teacher.backHome': 'العودة للرئيسية',
    'teacher.logout': 'تسجيل الخروج',
    'teacher.totalStudents': 'إجمالي الطلاب',
    'teacher.activeClasses': 'الفصول النشطة',
    'teacher.pendingAttendance': 'الحضور المعلق',
    'teacher.markAttendance': 'تسجيل الحضور',
    'teacher.uploadLessons': 'رفع الدروس',
    'teacher.createQuiz': 'إنشاء اختبار',
    'teacher.myStudents': 'طلابي',
    'teacher.course': 'الدورة',
    'teacher.progress': 'التقدم',
    'teacher.courseProgress': 'تقدم الدورة',
    'teacher.parts': 'أجزاء',
    'teacher.loginError': 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
    'teacher.loginSuccess': 'تم تسجيل دخول المعلم بنجاح!',
    
    // Admin Portal
    'admin.login': 'بوابة الإدارة',
    'admin.email': 'البريد الإلكتروني للمسؤول',
    'admin.password': 'كلمة المرور',
    'admin.loginButton': 'تسجيل الدخول إلى بوابة الإدارة',
    'admin.secureAccess': 'وصول آمن للإدارة فقط. الوصول غير المصرح به محظور.',
    'admin.dashboard': 'لوحة الإدارة',
    'admin.backHome': 'العودة للرئيسية',
    'admin.logout': 'تسجيل الخروج',
    'admin.totalStudents': 'إجمالي الطلاب',
    'admin.totalTeachers': 'إجمالي المعلمين',
    'admin.revenue': 'الإيرادات الشهرية',
    'admin.activeClasses': 'الفصول النشطة',
    'admin.studentsInfo': 'معلومات الطلاب',
    'admin.teachersInfo': 'معلومات المعلمين',
    'admin.recentRegistrations': 'التسجيلات الأخيرة',
    'admin.registeredOn': 'مسجل في',
    'admin.loginError': 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
    'admin.loginSuccess': 'تم تسجيل دخول المسؤول بنجاح!',
    
    // Not Found
    'notfound.title': '404',
    'notfound.message': 'عذراً! الصفحة غير موجودة',
    'notfound.returnHome': 'العودة للصفحة الرئيسية',
    
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
