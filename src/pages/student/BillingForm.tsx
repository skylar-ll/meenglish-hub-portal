import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SignatureCanvas } from '@/components/billing/SignatureCanvas';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { FileText, Calendar, DollarSign } from 'lucide-react';

const BillingForm = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [billingData, setBillingData] = useState({
    studentName: '',
    phone: '',
    coursePackage: '',
    registrationDate: '',
    courseStartDate: '',
    timeSlot: '',
    levelCount: 0,
    totalFee: 0,
    discountPercentage: 10,
    feeAfterDiscount: 0,
    firstPayment: 0,
    secondPayment: 0,
  });

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/student/login');
        return;
      }

      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) throw error;

      const registration = JSON.parse(sessionStorage.getItem('studentRegistration') || '{}');
      
      // Get KSA time (UTC+3)
      const ksaOffset = 3 * 60 * 60 * 1000;
      const now = new Date(Date.now() + ksaOffset);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const registrationDate = now.toISOString().split('T')[0];
      const courseStartDate = tomorrow.toISOString().split('T')[0];

      // Calculate fees
      const courseDuration = student.course_duration_months || 1;
      const { data: pricingData } = await supabase
        .from('course_pricing')
        .select('price')
        .eq('duration_months', courseDuration)
        .single();

      const totalFee = pricingData?.price || (courseDuration * 500);
      const discountPercentage = 10;
      const feeAfterDiscount = totalFee * (1 - discountPercentage / 100);
      const firstPayment = feeAfterDiscount * 0.5;
      const secondPayment = feeAfterDiscount * 0.5;

      setBillingData({
        studentName: language === 'ar' ? student.full_name_ar : student.full_name_en,
        phone: student.phone1,
        coursePackage: student.program,
        registrationDate,
        courseStartDate,
        timeSlot: registration.timing || student.timing || 'TBD',
        levelCount: courseDuration,
        totalFee,
        discountPercentage,
        feeAfterDiscount,
        firstPayment,
        secondPayment,
      });

      setLoading(false);
    } catch (error: any) {
      toast.error('Failed to load billing information');
      navigate('/student/course');
    }
  };

  const handleSignatureSave = async (dataUrl: string) => {
    setSignatureData(dataUrl);
    toast.success(language === 'ar' ? 'تم حفظ التوقيع' : 'Signature saved');
  };

  const handleSubmit = async () => {
    if (!signatureData) {
      toast.error(language === 'ar' ? 'يرجى التوقيع أولاً' : 'Please sign first');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: student } = await supabase
        .from('students')
        .select('id, student_id, full_name_ar, full_name_en')
        .eq('email', user.email)
        .single();

      if (!student) throw new Error('Student not found');

      // Upload signature
      const signatureBlob = await fetch(signatureData).then(r => r.blob());
      const signatureFileName = `${user.id}/signature_${Date.now()}.png`;
      
      const { data: signatureUpload, error: signatureError } = await supabase.storage
        .from('signatures')
        .upload(signatureFileName, signatureBlob);

      if (signatureError) throw signatureError;

      const { data: { publicUrl: signatureUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(signatureFileName);

      // Create billing record
      const billingRecord = {
        student_id: student.id,
        student_name_en: student.full_name_en,
        student_name_ar: student.full_name_ar,
        phone: billingData.phone,
        course_package: billingData.coursePackage,
        registration_date: billingData.registrationDate,
        course_start_date: billingData.courseStartDate,
        time_slot: billingData.timeSlot,
        level_count: billingData.levelCount,
        total_fee: billingData.totalFee,
        discount_percentage: billingData.discountPercentage,
        amount_paid: billingData.firstPayment,
        signature_url: signatureUrl,
        language: language,
        contract_number: `${student.student_id}_${Date.now()}`,
      };

      const { data: billing, error: billingError } = await supabase
        .from('billing')
        .insert(billingRecord)
        .select()
        .single();

      if (billingError) throw billingError;

      // Update student record with billing_id
      await supabase
        .from('students')
        .update({ 
          billing_id: billing.id,
          registration_date: billingData.registrationDate,
          expiration_date: new Date(new Date(billingData.courseStartDate).getTime() + billingData.levelCount * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .eq('id', student.id);

      toast.success(language === 'ar' ? 'تم إنشاء الفاتورة بنجاح!' : 'Billing form created successfully!');
      navigate('/student/payments');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create billing form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-4xl mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center">
          {language === 'ar' ? 'نموذج الفوترة' : 'Billing Form'}
        </h1>

        <Card className="p-8 mb-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold mb-2">
                {language === 'ar' 
                  ? 'معهد التعليم الحديث للغات'
                  : 'Modern Education Institute of Language'}
              </h2>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{language === 'ar' ? 'رقم الترخيص التدريبي' : 'Training License No.'}: 5300751</p>
                <p>{language === 'ar' ? 'رقم السجل التجاري' : 'Commercial Registration No.'}: 2050122590</p>
              </div>
            </div>

            {/* Student Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'اسم العميل' : 'Client Name'}</p>
                <p className="font-semibold">{billingData.studentName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'رقم التواصل' : 'Contact Number'}</p>
                <p className="font-semibold">{billingData.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'اسم الدورة أو الباكج' : 'Course or Package Name'}</p>
                <p className="font-semibold">{billingData.coursePackage}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الوقت المحدد' : 'Time Slot'}</p>
                <p className="font-semibold">{billingData.timeSlot}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ الفاتورة' : 'Bill Date'}</p>
                  <p className="font-semibold">{new Date(billingData.registrationDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ بداية الدورة' : 'Course Start Date'}</p>
                  <p className="font-semibold">{new Date(billingData.courseStartDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                </div>
              </div>
            </div>

            {/* Billing Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-sm">#</th>
                    <th className="border p-2 text-sm">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                    <th className="border p-2 text-sm">{language === 'ar' ? 'عدد المستويات' : 'Level Count'}</th>
                    <th className="border p-2 text-sm">{language === 'ar' ? 'الرسوم' : 'Fee (SAR)'}</th>
                    <th className="border p-2 text-sm">{language === 'ar' ? 'نسبة الخصم' : 'Discount %'}</th>
                    <th className="border p-2 text-sm">{language === 'ar' ? 'الرسوم بعد الخصم' : 'Fee After Discount'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2 text-center">1</td>
                    <td className="border p-2">{billingData.coursePackage}</td>
                    <td className="border p-2 text-center">{billingData.levelCount}</td>
                    <td className="border p-2 text-center">{billingData.totalFee.toFixed(2)}</td>
                    <td className="border p-2 text-center">{billingData.discountPercentage}%</td>
                    <td className="border p-2 text-center font-bold">{billingData.feeAfterDiscount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Summary */}
            <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{language === 'ar' ? 'المجموع' : 'Subtotal'}:</span>
                <span className="font-bold text-lg">{billingData.totalFee.toFixed(2)} {language === 'ar' ? 'ريال' : 'SAR'}</span>
              </div>
              <div className="flex justify-between items-center text-success">
                <span className="font-semibold">{language === 'ar' ? 'خصم إضافي' : 'Extra Discount'}:</span>
                <span className="font-bold">-{(billingData.totalFee - billingData.feeAfterDiscount).toFixed(2)} {language === 'ar' ? 'ريال' : 'SAR'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold text-lg">{language === 'ar' ? 'المبلغ النهائي' : 'Total Amount'}:</span>
                <span className="font-bold text-2xl text-primary">{billingData.feeAfterDiscount.toFixed(2)} {language === 'ar' ? 'ريال' : 'SAR'}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3 pt-2">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm">{language === 'ar' ? 'الدفعة الأولى' : 'First Payment'}:</span>
                  <span className="font-semibold">{billingData.firstPayment.toFixed(2)} {language === 'ar' ? 'ريال' : 'SAR'}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm">{language === 'ar' ? 'الدفعة الثانية' : 'Second Payment'}:</span>
                  <span className="font-semibold">{billingData.secondPayment.toFixed(2)} {language === 'ar' ? 'ريال' : 'SAR'}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-2">
              <h3 className="font-bold">{language === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions'}</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{language === 'ar' ? 'تشمل الرسوم التسجيل والكتب المدرسية وضريبة القيمة المضافة' : 'Fees include registration, textbooks, and VAT'}</li>
                <li>{language === 'ar' ? 'يجب حضور الطالب في الوقت المحدد حسب الجدول' : 'Students must attend on time according to schedule'}</li>
                <li>{language === 'ar' ? 'لا يتم استرداد الرسوم المدفوعة تحت أي ظرف' : 'No refunds under any circumstances'}</li>
                <li>{language === 'ar' ? 'التأجيل مسموح لمدة تصل إلى 3 أشهر' : 'Postponement allowed up to 3 months'}</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Signature */}
        <SignatureCanvas onSave={handleSignatureSave} language={language} />

        <div className="mt-6 flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/student/course')}
            className="flex-1"
            disabled={submitting}
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!signatureData || submitting}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
          >
            <FileText className="w-4 h-4 mr-2" />
            {submitting 
              ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
              : (language === 'ar' ? 'تأكيد وإنشاء الفاتورة' : 'Confirm & Create Billing')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BillingForm;
