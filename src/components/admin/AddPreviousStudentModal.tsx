import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft, Settings } from "lucide-react";
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
  const [showEditConfig, setShowEditConfig] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { courses, branches, paymentMethods, loading: configLoading, refetch } = useFormConfigurations();
  
  const [formData, setFormData] = useState({
    fullNameAr: "",
    fullNameEn: "",
    phone1: "",
    phone2: "",
    email: "",
    id: "",
    password: "",
    courses: [] as string[],
    branch: "",
    paymentMethod: "",
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

  const handleNext = () => {
    if (step === 1) {
      if (!formData.fullNameAr || !formData.fullNameEn || !formData.phone1 || !formData.email || !formData.id || !formData.password) {
        toast.error(t('addPrevStudent.fillAllFields'));
        return;
      }
      if (formData.password.length < 8) {
        toast.error(t('addPrevStudent.passwordMinLength'));
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.courses.length === 0) {
        toast.error(t('addPrevStudent.selectAtLeastOneCourse'));
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!formData.branch) {
        toast.error(t('addPrevStudent.selectBranchError'));
        return;
      }
      setStep(4);
    }
  };

  const handleSubmit = async () => {
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

    // Validate course selection
    if (formData.courses.length === 0) {
      toast.error("At least one course is required");
      return;
    }

    try {
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
        branch: "",
        paymentMethod: "",
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
  }, {} as Record<string, Array<{ id: string; value: string; label: string; category: string }>>);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{t('addPrevStudent.title')} - {t('addPrevStudent.step')} {step} {t('addPrevStudent.of')} 4</DialogTitle>
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="ml-4"
              >
                <Settings className="h-4 w-4 mr-2" />
                {isEditMode ? "Done Editing" : "Edit Form"}
              </Button>
            </div>
            {isEditMode && (
              <Alert className="mt-2">
              <AlertDescription>
                ✏️ Edit Mode Active — You can rename options in Steps 2–4 (Courses, Branches, Payment Methods). Step 1 inputs are not editable.
              </AlertDescription>
              </Alert>
            )}
          </DialogHeader>
        
        {configLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullNameAr">{t('addPrevStudent.fullNameAr')} *</Label>
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
                  <Label htmlFor="fullNameEn">{t('addPrevStudent.fullNameEn')} *</Label>
                  <Input
                    id="fullNameEn"
                    placeholder="Full Name"
                    value={formData.fullNameEn}
                    onChange={(e) => setFormData({...formData, fullNameEn: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone1">{t('addPrevStudent.phone1')} *</Label>
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
                    <Label htmlFor="phone2">{t('addPrevStudent.phone2')}</Label>
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
                  <Label htmlFor="email">{t('addPrevStudent.email')} *</Label>
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
                  <Label htmlFor="id">{t('addPrevStudent.nationalId')} *</Label>
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
                        <div key={course.value} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                          {!isEditMode && (
                            <Checkbox
                              id={`prev-course-${course.value}`}
                              checked={formData.courses.includes(course.value)}
                              onCheckedChange={() => toggleCourse(course.value)}
                            />
                          )}
{isEditMode ? (
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
) : (
  <Label
    htmlFor={`prev-course-${course.value}`}
    className="flex-1 cursor-pointer"
  >
    {course.label}
  </Label>
)}
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

                {!isEditMode && formData.courses.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">{t('addPrevStudent.selected')}: {formData.courses.length} {t('addPrevStudent.courses')}</p>
                  </div>
                )}

                {!isEditMode && (
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
                )}
              </div>
            )}

            {/* Step 3: Branch Selection */}
            {step === 3 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">{t('addPrevStudent.selectBranch')}</Label>
                <div className="grid gap-3">
                  {branches.map((branch) => (
                    <Card
                      key={branch.value}
                      className={`p-4 transition-all ${
                        !isEditMode && formData.branch === branch.value
                          ? "border-primary bg-primary/5"
                          : isEditMode
                          ? "hover:border-primary"
                          : "hover:bg-muted/50 cursor-pointer"
                      }`}
                      onClick={() => !isEditMode && setFormData({...formData, branch: branch.value})}
                    >
                      <p className="font-medium">
                        {isEditMode ? (
                          <InlineEditableField
                            id={branch.id}
                            value={branch.label}
                            configType="branch"
                            configKey={branch.value}
                            isEditMode={isEditMode}
                            onUpdate={refetch}
                            onDelete={refetch}
                          />
                        ) : (
                          branch.label
                        )}
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

                {!isEditMode && (
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
                )}
              </div>
            )}

            {/* Step 4: Payment Method */}
            {step === 4 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">{t('addPrevStudent.selectPaymentMethod')}</Label>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => (
                    <Card
                      key={method.value}
                      className={`p-4 transition-all ${
                        !isEditMode && formData.paymentMethod === method.value
                          ? "border-primary bg-primary/5"
                          : isEditMode
                          ? "hover:border-primary"
                          : "hover:bg-muted/50 cursor-pointer"
                      }`}
                      onClick={() => !isEditMode && setFormData({...formData, paymentMethod: method.value})}
                    >
                      <p className="font-medium">
                        {isEditMode ? (
                          <InlineEditableField
                            id={method.id}
                            value={method.label}
                            configType="payment_method"
                            configKey={method.value}
                            isEditMode={isEditMode}
                            onUpdate={refetch}
                            onDelete={refetch}
                          />
                        ) : (
                          method.label
                        )}
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

                {!isEditMode && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('student.back')}
                    </Button>
                    <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-secondary">
                      {t('addPrevStudent.addStudent')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Edit Form Config Modal */}
    <EditFormConfigModal
      open={showEditConfig}
      onOpenChange={setShowEditConfig}
    />
    </>
  );
};

export default AddPreviousStudentModal;
