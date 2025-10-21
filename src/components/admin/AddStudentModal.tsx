import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { studentSignupSchema } from "@/lib/validations";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { EditFormConfigModal } from "./EditFormConfigModal";
import { InlineEditableField } from "./InlineEditableField";
import { AddNewFieldButton } from "./AddNewFieldButton";

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
}

export const AddStudentModal = ({ open, onOpenChange, onStudentAdded }: AddStudentModalProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { courses, branches, paymentMethods, fieldLabels, courseDurations, loading: configLoading, refetch } = useFormConfigurations();
  
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
    courseDuration: "",
    customDuration: "",
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
        toast.error("Please fill in all required fields");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.courses.length === 0) {
        toast.error("Please select at least one course");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!formData.branch) {
        toast.error("Please select a branch");
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!formData.courseDuration && !formData.customDuration) {
        toast.error("Please select or enter a course duration");
        return;
      }
      setStep(5);
    }
  };

  const handleSubmit = async () => {
    if (!formData.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      setLoading(true);

      // Validate form data
      const validatedData = studentSignupSchema.parse({
        fullNameAr: formData.fullNameAr,
        fullNameEn: formData.fullNameEn,
        phone1: formData.countryCode1 + formData.phone1,
        phone2: formData.phone2 ? formData.countryCode2 + formData.phone2 : "",
        email: formData.email,
        id: formData.id,
        password: formData.password,
      });

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name_en: validatedData.fullNameEn,
            full_name_ar: validatedData.fullNameAr,
          },
        },
      });

      if (authError || !authData.user) {
        toast.error(`Authentication error: ${authError?.message}`);
        return;
      }

      // Assign student role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "student",
        });

      if (roleError) {
        toast.error("Failed to assign student role");
        return;
      }

      // Create student record
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

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .insert({
          id: authData.user.id,
          full_name_ar: validatedData.fullNameAr,
          full_name_en: validatedData.fullNameEn,
          phone1: validatedData.phone1,
          phone2: validatedData.phone2 || null,
          email: validatedData.email,
          national_id: validatedData.id,
          branch: formData.branch,
          program: formData.courses.join(', '),
          class_type: formData.courses.join(', '),
          payment_method: formData.paymentMethod,
          subscription_status: "active",
          course_duration_months: durationMonths,
        })
        .select()
        .single();

      if (studentError || !studentData) {
        toast.error("Failed to create student record");
        return;
      }

      // Insert teacher assignments
      if (assignedTeacherIds.size > 0) {
        const teacherAssignments = Array.from(assignedTeacherIds).map(teacherId => ({
          student_id: studentData.id,
          teacher_id: teacherId
        }));

        await supabase.from("student_teachers").insert(teacherAssignments);
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({
          full_name_en: validatedData.fullNameEn,
          full_name_ar: validatedData.fullNameAr,
          phone1: validatedData.phone1,
          phone2: validatedData.phone2 || null,
          national_id: validatedData.id,
          branch: formData.branch,
          program: formData.courses.join(', '),
          class_type: formData.courses.join(', '),
          payment_method: formData.paymentMethod,
        })
        .eq("id", authData.user.id);

      toast.success("Student account created successfully!");
      
      // Reset form
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
        courseDuration: "",
        customDuration: "",
        countryCode1: "+966",
        countryCode2: "+966",
      });
      setStep(1);
      
      onStudentAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating student:", error);
      if (error.errors) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to create student account");
      }
    } finally {
      setLoading(false);
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
              <DialogTitle>Add New Student - Step {step} of 5</DialogTitle>
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
          <div className="space-y-4 py-4">
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
                    dir="rtl"
                    placeholder="الاسم الكامل"
                    value={formData.fullNameAr}
                    onChange={(e) => handleInputChange("fullNameAr", e.target.value)}
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
                  <Input
                    id="fullNameEn"
                    placeholder="Full Name"
                    value={formData.fullNameEn}
                    onChange={(e) => handleInputChange("fullNameEn", e.target.value)}
                  />
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
                      <Select value={formData.countryCode1} onValueChange={(value) => handleInputChange("countryCode1", value)}>
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
                        onChange={(e) => handleInputChange("phone1", e.target.value)}
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
                      <Select value={formData.countryCode2} onValueChange={(value) => handleInputChange("countryCode2", value)}>
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
                        onChange={(e) => handleInputChange("phone2", e.target.value)}
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
                    onChange={(e) => handleInputChange("email", e.target.value)}
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
                    onChange={(e) => handleInputChange("id", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    <InlineEditableField
                      id={getFieldLabel('password').id}
                      value={getFieldLabel('password').label}
                      configType="field_label"
                      configKey="password"
                      isEditMode={isEditMode}
                      onUpdate={refetch}
                      isLabel={true}
                    />
                    {" *"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password (min 8 characters)"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                  />
                </div>

                <Button onClick={handleNext} className="w-full">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Course Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Courses (Multiple selection allowed)</Label>

                {Object.keys(coursesByCategory).map((category) => {
                  const categoryCourses = coursesByCategory[category];
                  return (
                  <div key={category} className="space-y-3">
                    <h3 className="font-semibold text-primary">{category}</h3>
                    <div className="space-y-2">
                      {categoryCourses.map((course) => (
                        <div key={course.value} className="flex items-center p-2 rounded hover:bg-muted/50">
                          <div className="flex items-center space-x-2 flex-1">
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
                    <p className="text-sm font-medium">Selected: {formData.courses.length} courses</p>
                  </div>
                )}

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              </div>
            )}

            {/* Step 3: Branch Selection */}
            {step === 3 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Branch</Label>
                <div className="grid gap-3">
                  {branches.map((branch) => (
                    <Card
                      key={branch.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.branch === branch.value
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => handleInputChange("branch", branch.value)}
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
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
              </div>
            )}

            {/* Step 4: Course Duration */}
            {step === 4 && (
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
                        handleInputChange("courseDuration", duration.value);
                        handleInputChange("customDuration", "");
                      }}
                    >
                      <div className="flex items-center justify-between">
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
                        <span className="text-sm font-semibold text-primary">${duration.price.toFixed(2)}</span>
                      </div>
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
                  <Label htmlFor="customDuration">Or Enter Custom Duration (Months)</Label>
                  <Input
                    id="customDuration"
                    type="number"
                    min="1"
                    placeholder="Enter number of months"
                    value={formData.customDuration}
                    onChange={(e) => {
                      handleInputChange("customDuration", e.target.value);
                      handleInputChange("courseDuration", "");
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Payment Method */}
            {step === 5 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Payment Method</Label>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => (
                    <Card
                      key={method.value}
                      className={`p-4 transition-all hover:bg-muted/50 cursor-pointer ${
                        formData.paymentMethod === method.value
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => handleInputChange("paymentMethod", method.value)}
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
                    <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-secondary" disabled={loading}>
                      {loading ? "Creating..." : "Create Student"}
                    </Button>
                  </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
