import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { studentSignupSchema } from "@/lib/validations";
import { ArrowRight, ArrowLeft, Settings } from "lucide-react";
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
      const { error: studentError } = await supabase
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
        });

      if (studentError) {
        toast.error("Failed to create student record");
        return;
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
  }, {} as Record<string, Array<{ id: string; value: string; label: string; category: string }>>);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Add New Student - Step {step} of 4</DialogTitle>
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
                  ✏️ Edit Mode Active - Click on any field to edit. Changes save automatically and apply to all forms.
                </AlertDescription>
              </Alert>
            )}
          </DialogHeader>

        {configLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullNameAr">Full Name (Arabic) *</Label>
                  <Input
                    id="fullNameAr"
                    dir="rtl"
                    placeholder="الاسم الكامل"
                    value={formData.fullNameAr}
                    onChange={(e) => handleInputChange("fullNameAr", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullNameEn">Full Name (English) *</Label>
                  <Input
                    id="fullNameEn"
                    placeholder="Full Name"
                    value={formData.fullNameEn}
                    onChange={(e) => handleInputChange("fullNameEn", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone1">Phone *</Label>
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
                    <Label htmlFor="phone2">Phone 2 (Optional)</Label>
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
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id">National ID *</Label>
                  <Input
                    id="id"
                    placeholder="ID Number"
                    value={formData.id}
                    onChange={(e) => handleInputChange("id", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
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
                        <div key={course.value} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                          {!isEditMode && (
                            <Checkbox
                              id={`course-${course.value}`}
                              checked={formData.courses.includes(course.value)}
                              onCheckedChange={() => toggleCourse(course.value)}
                            />
                          )}
                          <Label
                            htmlFor={`course-${course.value}`}
                            className={`flex-1 ${!isEditMode ? 'cursor-pointer' : ''}`}
                          >
                            {isEditMode ? (
                              <InlineEditableField
                                id={course.id}
                                value={course.label}
                                configType="course"
                                configKey={course.value}
                                isEditMode={isEditMode}
                                onUpdate={refetch}
                                onDelete={refetch}
                              />
                            ) : (
                              course.label
                            )}
                          </Label>
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
                    <p className="text-sm font-medium">Selected: {formData.courses.length} courses</p>
                  </div>
                )}

                {!isEditMode && (
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
                )}
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
                      className={`p-4 transition-all ${
                        !isEditMode && formData.branch === branch.value
                          ? "border-primary bg-primary/5"
                          : isEditMode
                          ? "hover:border-primary"
                          : "hover:bg-muted/50 cursor-pointer"
                      }`}
                      onClick={() => !isEditMode && handleInputChange("branch", branch.value)}
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
                      Back
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Payment Method */}
            {step === 4 && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Payment Method</Label>
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
                      onClick={() => !isEditMode && handleInputChange("paymentMethod", method.value)}
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
                      Back
                    </Button>
                    <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-secondary" disabled={loading}>
                      {loading ? "Creating..." : "Create Student"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
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
