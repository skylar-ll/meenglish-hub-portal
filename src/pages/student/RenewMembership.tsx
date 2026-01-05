import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import logo from "@/assets/logo-new.png";

const RenewMembership = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { courses, courseDurations, timings, loading: configLoading } = useFormConfigurations();
  
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedTimings, setSelectedTimings] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [levelOptions, setLevelOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchStudentData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/student/login");
        return;
      }

      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("email", session.user.email)
        .maybeSingle();

      if (student) {
        setStudentData(student);
      } else {
        navigate("/student/login");
      }
    };

    const fetchLevels = async () => {
      const { data } = await supabase
        .from('form_configurations')
        .select('*')
        .eq('config_type', 'level')
        .eq('is_active', true)
        .order('display_order');
      setLevelOptions(data || []);
    };

    fetchStudentData();
    fetchLevels();
  }, [navigate]);

  const handleToggleLevel = (level: string) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handleToggleTiming = (timing: string) => {
    setSelectedTimings(prev =>
      prev.includes(timing)
        ? prev.filter(t => t !== timing)
        : [...prev, timing]
    );
  };

  const pricing = courseDurations.find(d => d.value === selectedDuration);
  const totalFee = pricing?.price || 0;
  const remainingBalance = totalFee - amountPaid;

  const handleSubmit = async () => {
    if (selectedLevels.length === 0) {
      toast.error(language === 'ar' ? 'يرجى اختيار المستويات' : 'Please select levels');
      return;
    }
    if (selectedTimings.length === 0) {
      toast.error(language === 'ar' ? 'يرجى اختيار المواعيد' : 'Please select timings');
      return;
    }
    if (!selectedDuration) {
      toast.error(language === 'ar' ? 'يرجى اختيار المدة' : 'Please select duration');
      return;
    }

    setLoading(true);
    try {
      const ksaTimezone = "Asia/Riyadh";
      const now = new Date();
      const ksaDate = toZonedTime(now, ksaTimezone);
      const registrationDate = format(ksaDate, "yyyy-MM-dd");
      const durationMonths = parseInt(selectedDuration);
      const expirationDate = format(addDays(ksaDate, durationMonths * 30), "yyyy-MM-dd");
      const paymentDeadline = format(addDays(ksaDate, 30), "yyyy-MM-dd");

      // Update student record
      const { error: studentError } = await supabase
        .from("students")
        .update({
          course_level: selectedLevels.join(", "),
          timing: selectedTimings.join(", "),
          course_duration_months: durationMonths,
          registration_date: registrationDate,
          expiration_date: expirationDate,
          subscription_status: "active",
          total_course_fee: totalFee,
          amount_paid: amountPaid,
          amount_remaining: remainingBalance,
          next_payment_date: paymentDeadline,
        })
        .eq("id", studentData.id);

      if (studentError) throw studentError;

      // Create billing record
      const { error: billingError } = await supabase
        .from("billing")
        .insert({
          student_id: studentData.id,
          student_name_en: studentData.full_name_en,
          student_name_ar: studentData.full_name_ar,
          phone: studentData.phone1,
          course_package: selectedLevels.join(", "),
          registration_date: registrationDate,
          course_start_date: registrationDate,
          time_slot: selectedTimings.join(", "),
          level_count: durationMonths,
          total_fee: totalFee,
          discount_percentage: 0,
          fee_after_discount: totalFee,
          amount_paid: amountPaid,
          amount_remaining: remainingBalance,
          first_payment: amountPaid,
          second_payment: remainingBalance,
          payment_deadline: paymentDeadline,
        });

      if (billingError) throw billingError;

      // Update session storage
      const registration = sessionStorage.getItem("studentRegistration");
      if (registration) {
        const data = JSON.parse(registration);
        data.courseLevel = selectedLevels.join(", ");
        data.expirationDate = expirationDate;
        sessionStorage.setItem("studentRegistration", JSON.stringify(data));
      }

      toast.success(language === 'ar' ? 'تم تجديد العضوية بنجاح!' : 'Membership renewed successfully!');
      navigate("/student/course");
    } catch (error: any) {
      console.error("Renewal error:", error);
      toast.error(language === 'ar' ? 'فشل التجديد' : 'Failed to renew');
    } finally {
      setLoading(false);
    }
  };

  if (!studentData || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <div className="flex items-center justify-between mb-6">
          <img src={logo} alt="Logo" className="h-12 object-contain" />
          <Button variant="ghost" onClick={() => navigate("/student/course")} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
        </div>

        <Card className="p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              {language === 'ar' ? 'تجديد العضوية' : 'Renew Membership'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' 
                ? `مرحباً ${studentData.full_name_ar}`
                : `Welcome back, ${studentData.full_name_en}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'رقم الطالب:' : 'Student ID:'} {studentData.student_id}
            </p>
          </div>

          {/* Select Levels */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {language === 'ar' ? 'اختر المستويات' : 'Select Levels'}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {levelOptions.map((level) => (
                <div
                  key={level.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedLevels.includes(level.config_value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleToggleLevel(level.config_value)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedLevels.includes(level.config_value)}
                      onCheckedChange={() => handleToggleLevel(level.config_value)}
                    />
                    <span>{level.config_value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Select Timings */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {language === 'ar' ? 'اختر المواعيد' : 'Select Timings'}
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {timings.map((timing) => (
                <div
                  key={timing.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTimings.includes(timing.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleToggleTiming(timing.value)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedTimings.includes(timing.value)}
                      onCheckedChange={() => handleToggleTiming(timing.value)}
                    />
                    <span>{timing.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {language === 'ar' ? 'مدة الدورة' : 'Course Duration'}
            </Label>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر المدة' : 'Select duration'} />
              </SelectTrigger>
              <SelectContent>
                {courseDurations.map((duration) => (
                  <SelectItem key={duration.id} value={duration.value}>
                    {duration.label} - SAR {duration.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Amount */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {language === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}
            </Label>
            <Input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value))}
              placeholder="0"
            />
          </div>

          {/* Summary */}
          {selectedDuration && (
            <Card className="p-4 bg-muted/50 space-y-2">
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'الرسوم الإجمالية' : 'Total Fee'}</span>
                <span className="font-semibold">SAR {totalFee}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}</span>
                <span className="text-success font-semibold">SAR {amountPaid}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>{language === 'ar' ? 'المتبقي' : 'Remaining'}</span>
                <span className="text-destructive font-semibold">SAR {remainingBalance}</span>
              </div>
            </Card>
          )}

          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            size="lg"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {language === 'ar' ? 'تأكيد التجديد' : 'Confirm Renewal'}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default RenewMembership;
