import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { studentSignupSchema } from "@/lib/validations";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { EditFormConfigModal } from "./EditFormConfigModal";
import { InlineEditableField } from "./InlineEditableField";
import { AddNewFieldButton } from "./AddNewFieldButton";

interface AddPreviousStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
}

const AddPreviousStudentModal = ({ open, onOpenChange, onStudentAdded }: AddPreviousStudentModalProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [autoTranslationEnabled, setAutoTranslationEnabled] = useState(false);
  const { courses, branches, paymentMethods, fieldLabels, courseDurations, timings, loading: configLoading, refetch } = useFormConfigurations();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courseTeachers, setCourseTeachers] = useState<any[]>([]);
  
  // Fetch auto-translation setting
  useEffect(() => {
    const fetchAutoTranslationSetting = async () => {
      const { data } = await supabase
        .from('form_configurations')
        .select('config_value')
        .eq('config_key', 'auto_translation_enabled')
        .single();
      
      setAutoTranslationEnabled(data?.config_value === 'true');
    };
    
    if (open) {
      fetchAutoTranslationSetting();
    }
  }, [open]);
  const [isTranslating, setIsTranslating] = useState(false);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    fullNameAr: "",
    fullNameEn: "",
    phone1: "",
    phone2: "",
    email: "",
    id: "",
    password: "",
    courses: [] as string[],
    teacherSelections: {} as Record<string, string>,
    timing: "",
    branch: "",
    paymentMethod: "",
    courseDuration: "",
    customDuration: "",
    customDurationUnit: "months",
    countryCode1: "+966",
    countryCode2: "+966",
  });

  const countryCodes = [
    { value: "+966", label: "+966 (Saudi Arabia)" },
    { value: "+971", label: "+971 (UAE)" },
    { value: "+965", label: "+965 (Kuwait)" },
    { value: "+973", label: "+973 (Bahrain)" },
    { value: "+974", label: "+974 (Qatar)" },
    { value: "+968", label: "+968 (Oman)" },
    { value: "+20", label: "+20 (Egypt)" },
    { value: "+962", label: "+962 (Jordan)" },
    { value: "+961", label: "+961 (Lebanon)" },
    { value: "+1", label: "+1 (USA/Canada)" },
    { value: "+44", label: "+44 (UK)" },
  ];

  const toggleCourse = (courseValue: string) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.includes(courseValue)
        ? prev.courses.filter(c => c !== courseValue)
        : [...prev.courses, courseValue]
    }));
  };

  // Auto-translate Arabic name to English with debouncing
  useEffect(() => {
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }

    const checkAndTranslate = async () => {
      const { data: setting } = await supabase
        .from('form_configurations')
        .select('config_value')
        .eq('config_key', 'auto_translation_enabled')
        .single();

      if (setting?.config_value !== 'true') {
        setIsTranslating(false);
        return;
      }

      if (formData.fullNameAr.trim() && !formData.fullNameEn) {
        setIsTranslating(true);
        
        translationTimeoutRef.current = setTimeout(async () => {
          try {
            const { data, error } = await supabase.functions.invoke('translate-name', {
              body: { arabicName: formData.fullNameAr }
            });

            if (error) throw error;

            if (data?.translatedName) {
              setFormData(prev => ({ ...prev, fullNameEn: data.translatedName }));
            }
          } catch (error) {
            console.error('Translation error:', error);
          } finally {
            setIsTranslating(false);
          }
        }, 800);
      } else if (!formData.fullNameAr.trim()) {
        setIsTranslating(false);
      }
    };

    checkAndTranslate();

    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, [formData.fullNameAr]);

  const fetchTeachersForCourses = async () => {
    if (formData.courses.length === 0) return;

    try {
      const { data: teachersData, error } = await supabase
        .from('teachers')
        .select('id, full_name, courses_assigned')
        .not('courses_assigned', 'is', null);

      if (error) throw error;

      const coursesNeedingSelection: any[] = [];
      const autoSelected: Record<string, string> = {};

      formData.courses.forEach((course: string) => {
        const teachersForCourse = (teachersData || []).filter((teacher: any) => {
          const teacherCourses = teacher.courses_assigned?.toLowerCase().split(',').map((c: string) => c.trim()) || [];
          const courseLower = course.toLowerCase();
          return teacherCourses.some((tc: string) => tc.includes(courseLower) || courseLower.includes(tc));
        });

        if (teachersForCourse.length > 1) {
          coursesNeedingSelection.push({
            course,
            teachers: teachersForCourse
          });
        } else if (teachersForCourse.length === 1) {
          autoSelected[course] = teachersForCourse[0].id;
        }
      });

      setTeachers(teachersData || []);
      setCourseTeachers(coursesNeedingSelection);
      setFormData(prev => ({ ...prev, teacherSelections: { ...prev.teacherSelections, ...autoSelected } }));
    } catch (error) {
      toast.error("Failed to load teachers");
    }
  };

  const handleNext = async () => {
    // Fetch teachers when moving from course selection to teacher assignment
    if (step === 2) {
      await fetchTeachersForCourses();
    }
    
    // Allow free navigation between steps without validation
    if (step < 7) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all required fields before submission
    if (!formData.fullNameAr || !formData.fullNameEn || !formData.phone1 || !formData.email || !formData.id || !formData.password) {
      toast.error(t('addPrevStudent.fillAllFields'));
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error(t('addPrevStudent.passwordMinLength'));
      return;
    }
    
    if (formData.courses.length === 0) {
      toast.error(t('addPrevStudent.selectAtLeastOneCourse'));
      return;
    }
    
    const missingSelections = courseTeachers.filter(ct => !formData.teacherSelections[ct.course]);
    if (missingSelections.length > 0) {
      toast.error("Please select a teacher for all courses");
      return;
    }
    
    if (!formData.timing) {
      toast.error("Please select a timing");
      return;
    }
    
    if (!formData.branch) {
      toast.error(t('addPrevStudent.selectBranchError'));
      return;
    }
    
    if (!formData.courseDuration && !formData.customDuration) {
      toast.error("Please select or enter a course duration");
      return;
    }
    
    if (!formData.paymentMethod) {
      toast.error(t('addPrevStudent.selectPaymentError'));
      return;
    }

    // Validate inputs using zod schema
    try {
      const dataToValidate = {
        fullNameAr: formData.fullNameAr,
        fullNameEn: formData.fullNameEn,
        phone1: formData.countryCode1 + formData.phone1,
        phone2: formData.phone2 ? formData.countryCode2 + formData.phone2 : "",
        email: formData.email,
        id: formData.id,
        password: formData.password
      };
      studentSignupSchema.parse(dataToValidate);
    } catch (error: any) {
      if (error.errors) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    try {
      const durationMonths = formData.customDuration 
        ? parseInt(formData.customDuration) 
        : parseInt(formData.courseDuration);

      // Determine which teachers to assign based on courses
      const assignedTeacherIds = new Set<string>();
      
      const { data: teachersData } = await supabase.from('teachers').select('id, full_name');
      const teachers = teachersData || [];
      const leoId = teachers.find(t => t.full_name.toLowerCase().includes('leo'))?.id;
      const lillyId = teachers.find(t => t.full_name.toLowerCase().includes('lilly'))?.id;
      const dorianId = teachers.find(t => t.full_name.toLowerCase().includes('dorian'))?.id;
      const ayshaId = teachers.find(t => t.full_name.toLowerCase().includes('aysha'))?.id;

      formData.courses.forEach(course => {
        const lowerCourse = course.toLowerCase();
        const courseNum = parseInt(course.match(/\d+/)?.[0] || "0");
        
        if ((courseNum >= 1 && courseNum <= 4) && leoId) assignedTeacherIds.add(leoId);
        if (((courseNum >= 5 && courseNum <= 9) || lowerCourse.includes('spanish') || lowerCourse.includes('italian')) && lillyId) assignedTeacherIds.add(lillyId);
        if (((courseNum >= 10 && courseNum <= 12) || lowerCourse.includes('arabic') || lowerCourse.includes('french') || lowerCourse.includes('chinese')) && dorianId) assignedTeacherIds.add(dorianId);
        if (((courseNum >= 10 && courseNum <= 12) || lowerCourse.includes('speaking')) && ayshaId) assignedTeacherIds.add(ayshaId);
      });

      const studentData: any = {
        full_name_ar: formData.fullNameAr,
        full_name_en: formData.fullNameEn,
        phone1: formData.countryCode1 + formData.phone1,
        phone2: formData.phone2 ? formData.countryCode2 + formData.phone2 : null,
        email: formData.email,
        national_id: formData.id,
        program: formData.courses.join(', '),
        class_type: formData.courses.join(', '),
        branch: formData.branch,
        payment_method: formData.paymentMethod,
        subscription_status: 'active',
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        course_duration_months: durationMonths,
      };

      const { data: insertedStudent, error } = await supabase
        .from("students")
        .insert(studentData)
        .select()
        .single();

      if (error) {
        console.error("Error adding previous student:", error);
        toast.error(t('addPrevStudent.error'));
        return;
      }

      // Insert teacher assignments
      if (assignedTeacherIds.size > 0 && insertedStudent) {
        const teacherAssignments = Array.from(assignedTeacherIds).map(teacherId => ({
          student_id: insertedStudent.id,
          teacher_id: teacherId
        }));

        await supabase.from("student_teachers").insert(teacherAssignments);
      }

      toast.success(t('addPrevStudent.success'));
      onStudentAdded();
      onOpenChange(false);
      
      // Store student data and redirect to course page
      sessionStorage.setItem("studentRegistration", JSON.stringify({
        fullNameAr: formData.fullNameAr,
        fullNameEn: formData.fullNameEn,
        phone1: formData.phone1,
        phone2: formData.phone2,
        email: formData.email,
        id: formData.id,
        courses: formData.courses,
        branch: formData.branch,
        paymentMethod: formData.paymentMethod,
        program: formData.courses[0] || "level-1",
        classType: formData.courses.join(', '),
        courseLevel: formData.courses[0] || "level-1"
      }));
      
      window.location.href = "/student/course";
      
      // Reset form
      setStep(1);
      setFormData({
        fullNameAr: "",
        fullNameEn: "",
        phone1: "",
        phone2: "",
        email: "",
        id: "",
        password: "",
        courses: [],
        teacherSelections: {},
        timing: "",
        branch: "",
        paymentMethod: "",
        courseDuration: "",
        customDuration: "",
        customDurationUnit: "months",
        countryCode1: "+966",
        countryCode2: "+966",
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error(t('addPrevStudent.generalError'));
    }
  };

  // Group courses by category
  const coursesByCategory = courses.reduce((acc, course) => {
    if (!acc[course.category]) {
      acc[course.category] = [];
    }
    acc[course.category].push(course);
    return acc;
  }, {} as Record<string, Array<{ id: string; value: string; label: string; category: string; price: number }>>);

  // Helper to get field label
  const getFieldLabel = (key: string) => {
    const field = fieldLabels.find(f => f.value === key);
    return field || { id: '', label: key, value: key };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{t('addPrevStudent.title')} - {t('addPrevStudent.step')} {step} {t('addPrevStudent.of')} 7</DialogTitle>
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? "Done Editing" : "Edit Form"}
              </Button>
            </div>
          </DialogHeader>
        
        {configLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            {/* Auto-Translation Toggle - Only shown in edit mode */}
            {isEditMode && (
              <Card className="p-4 bg-muted/50 mt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-translate-toggle-prev" className="text-base font-semibold">
                      Auto-Translation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically translate Arabic names to English in Add New Student and Add Previous Student forms
                    </p>
                  </div>
                  <Switch
                    id="auto-translate-toggle-prev"
                    checked={autoTranslationEnabled}
                    onCheckedChange={async (enabled) => {
                      try {
                        const { error } = await supabase
                          .from('form_configurations')
                          .update({ config_value: enabled ? 'true' : 'false' })
                          .eq('config_key', 'auto_translation_enabled');
                        
                        if (error) throw error;
                        
                        setAutoTranslationEnabled(enabled);
                        toast.success(`Auto-translation ${enabled ? 'enabled' : 'disabled'}`);
                      } catch (error: any) {
                        toast.error(`Failed to update: ${error.message}`);
                      }
                    }}
                  />
                </div>
              </Card>
            )}

            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullNameAr">
                    <InlineEditableField
                      id={getFieldLabel('full_name_ar').id}
                      value={getFieldLabel('full_name_ar').label}
                      configType="field_label"
                      configKey="full_name_ar"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <Input
                    id="fullNameAr"
                    placeholder="الاسم الكامل"
                    dir="rtl"
                    value={formData.fullNameAr}
                    onChange={(e) => setFormData({...formData, fullNameAr: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullNameEn">
                    <InlineEditableField
                      id={getFieldLabel('full_name_en').id}
                      value={getFieldLabel('full_name_en').label}
                      configType="field_label"
                      configKey="full_name_en"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="fullNameEn"
                      placeholder="Full Name"
                      value={formData.fullNameEn}
                      onChange={(e) => setFormData({...formData, fullNameEn: e.target.value})}
                      required
                    />
                    {isTranslating && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Translating from Arabic...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone1">
                      <InlineEditableField
                        id={getFieldLabel('phone1').id}
                        value={getFieldLabel('phone1').label}
                        configType="field_label"
                        configKey="phone1"
                        isEditMode={isEditMode}
                        onUpdate={refetch}
                        isLabel={true}
                      />
                      {" *"}
                    </Label>
                    <div className="flex gap-2">
                      <Select value={formData.countryCode1} onValueChange={(value) => setFormData({...formData, countryCode1: value})}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((code) => (
                            <SelectItem key={code.value} value={code.value}>
                              {code.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone1"
                        type="tel"
                        placeholder="XXX XXX XXX"
                        value={formData.phone1}
                        onChange={(e) => setFormData({...formData, phone1: e.target.value})}
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone2">
                      <InlineEditableField
                        id={getFieldLabel('phone2').id}
                        value={getFieldLabel('phone2').label}
                        configType="field_label"
                        configKey="phone2"
                        isEditMode={isEditMode}
                        onUpdate={refetch}
                        isLabel={true}
                      />
                    </Label>
                    <div className="flex gap-2">
                      <Select value={formData.countryCode2} onValueChange={(value) => setFormData({...formData, countryCode2: value})}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((code) => (
                            <SelectItem key={code.value} value={code.value}>
                              {code.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone2"
                        type="tel"
                        placeholder="XXX XXX XXX"
                        value={formData.phone2}
                        onChange={(e) => setFormData({...formData, phone2: e.target.value})}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <InlineEditableField
                      id={getFieldLabel('email').id}
                      value={getFieldLabel('email').label}
                      configType="field_label"
                      configKey="email"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id">
                    <InlineEditableField
                      id={getFieldLabel('national_id').id}
                      value={getFieldLabel('national_id').label}
                      configType="field_label"
                      configKey="national_id"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <Input
                    id="id"
                    placeholder="ID Number"
                    value={formData.id}
                    onChange={(e) => setFormData({...formData, id: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('addPrevStudent.password')} *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('addPrevStudent.passwordPlaceholder')}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>

                <Button onClick={handleNext} className="w-full">
                  {t('student.next')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Course Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">{t('addPrevStudent.selectCourses')}</Label>

                {Object.keys(coursesByCategory).map((category) => {
                  const categoryCourses = coursesByCategory[category];
                  return (
                  <div key={category} className="space-y-3">
                    <h3 className="font-semibold text-primary">{category}</h3>
                    <div className="space-y-2">
                      {categoryCourses.map((course) => (
                        <div key={course.value} className="flex items-center space-x-3 p-3 rounded hover:bg-muted/50">
                          <Checkbox
                            id={`course-${course.value}`}
                            checked={formData.courses.includes(course.value)}
                            onCheckedChange={() => toggleCourse(course.value)}
                          />
                          <div className="flex-1">
                            <InlineEditableField
                              id={course.id}
                              value={course.label}
                              configType="course"
                              configKey={course.value}
                              isEditMode={isEditMode}
                              onUpdate={refetch}
                              onDelete={refetch}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {isEditMode && (
                      <AddNewFieldButton
                        configType="course"
                        categoryName={category}
                        onAdd={refetch}
                      />
                    )}
                  </div>
                  );
                })}

                {formData.courses.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">{t('addPrevStudent.selected')}: {formData.courses.length} {t('addPrevStudent.courses')}</p>
                  </div>
                )}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('student.back')}
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      {t('student.next')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              </div>
            )}

            {/* Step 3: Teacher Selection */}
            {step === 3 && (
              <div className="space-y-4">
                {courseTeachers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Teachers have been auto-assigned based on your courses.</p>
                    <Button onClick={handleNext} className="w-full">
                      {t('student.next')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Label className="text-lg font-semibold">Select Your Teachers</Label>
                    <p className="text-sm text-muted-foreground">Multiple teachers are available for some courses. Please choose your preferred teacher.</p>
                    
                    {courseTeachers.map((courseTeacher) => (
                      <div key={courseTeacher.course} className="space-y-3">
                        <Label className="font-semibold">{courseTeacher.course}</Label>
                        <div className="grid gap-3">
                          {courseTeacher.teachers.map((teacher: any) => (
                            <Card
                              key={teacher.id}
                              className={`p-4 cursor-pointer transition-all ${
                                formData.teacherSelections[courseTeacher.course] === teacher.id
                                  ? "border-primary border-2 bg-primary/5"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                teacherSelections: { ...prev.teacherSelections, [courseTeacher.course]: teacher.id }
                              }))}
                            >
                              <p className="font-medium">{teacher.full_name}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Teaches: {teacher.courses_assigned}
                              </p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('student.back')}
                      </Button>
                      <Button onClick={handleNext} className="flex-1">
                        {t('student.next')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Timing Selection */}
            {step === 4 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Timing</Label>
                <div className="grid gap-3">
                  {timings.map((timing) => (
                    <Card
                      key={timing.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.timing === timing.value
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setFormData({...formData, timing: timing.value})}
                    >
                      <p className="font-medium">
                        <InlineEditableField
                          id={timing.id}
                          value={timing.label}
                          configType="timing"
                          configKey={timing.value}
                          isEditMode={isEditMode}
                          onUpdate={refetch}
                          onDelete={refetch}
                        />
                      </p>
                    </Card>
                  ))}
                </div>
                
                {isEditMode && (
                  <AddNewFieldButton
                    configType="timing"
                    onAdd={refetch}
                  />
                )}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('student.back')}
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      {t('student.next')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              </div>
            )}

            {/* Step 5: Branch Selection */}
            {step === 5 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">{t('addPrevStudent.selectBranch')}</Label>
                <div className="grid gap-3">
                  {branches.map((branch) => (
                    <Card
                      key={branch.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.branch === branch.value
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setFormData({...formData, branch: branch.value})}
                    >
                      <p className="font-medium">
                        <InlineEditableField
                          id={branch.id}
                          value={branch.label}
                          configType="branch"
                          configKey={branch.value}
                          isEditMode={isEditMode}
                          onUpdate={refetch}
                          onDelete={refetch}
                        />
                      </p>
                    </Card>
                  ))}
                </div>
                
                {isEditMode && (
                  <AddNewFieldButton
                    configType="branch"
                    onAdd={refetch}
                  />
                )}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('student.back')}
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      {t('student.next')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              </div>
            )}

            {/* Step 6: Course Duration */}
            {step === 6 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Course Duration</Label>
                <div className="grid gap-3">
                  {courseDurations.map((duration) => (
                    <Card
                      key={duration.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.courseDuration === duration.value && !formData.customDuration
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => {
                        setFormData({...formData, courseDuration: duration.value, customDuration: ""});
                      }}
                    >
                      <p className="font-medium">
                        <InlineEditableField
                          id={duration.id}
                          value={duration.label}
                          configType="course_duration"
                          configKey={duration.value}
                          isEditMode={isEditMode}
                          onUpdate={refetch}
                          onDelete={refetch}
                        />
                      </p>
                    </Card>
                  ))}
                </div>

                {isEditMode && (
                  <AddNewFieldButton
                    configType="course_duration"
                    onAdd={refetch}
                  />
                )}

                <div className="space-y-2">
                  <Label>Or Enter Custom Duration</Label>
                  <div className="flex gap-2">
                    <Input
                      id="customDuration"
                      type="number"
                      min="1"
                      placeholder="Enter number"
                      className="flex-1"
                      value={formData.customDuration}
                      onChange={(e) => setFormData({...formData, customDuration: e.target.value, courseDuration: ""})}
                    />
                    <Select
                      value={formData.customDurationUnit}
                      onValueChange={(value) => setFormData({...formData, customDurationUnit: value})}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>


                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(5)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('student.back')}
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    {t('student.next')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 7: Payment Method */}
            {step === 7 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">{t('addPrevStudent.selectPaymentMethod')}</Label>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => (
                    <Card
                      key={method.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.paymentMethod === method.value
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setFormData({...formData, paymentMethod: method.value})}
                    >
                      <p className="font-medium">
                        <InlineEditableField
                          id={method.id}
                          value={method.label}
                          configType="payment_method"
                          configKey={method.value}
                          isEditMode={isEditMode}
                          onUpdate={refetch}
                          onDelete={refetch}
                        />
                      </p>
                    </Card>
                  ))}
                </div>

                {isEditMode && (
                  <AddNewFieldButton
                    configType="payment_method"
                    onAdd={refetch}
                  />
                )}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(6)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('student.back')}
                    </Button>
                    <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-secondary">
                      {t('addPrevStudent.addStudent')}
                    </Button>
                  </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AddPreviousStudentModal;
