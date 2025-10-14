import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface AddPreviousStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
}

const AddPreviousStudentModal = ({ open, onOpenChange, onStudentAdded }: AddPreviousStudentModalProps) => {
  const [step, setStep] = useState(1);
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
  });

  const allCourses = [
    { value: "level-1", label: "Level 1 (Pre1) - مستوى اول", category: "English Program" },
    { value: "level-2", label: "Level 2 (Pre2) - مستوى ثاني", category: "English Program" },
    { value: "level-3", label: "Level 3 (Intro A) - مستوى ثالث", category: "English Program" },
    { value: "level-4", label: "Level 4 (Intro B) - مستوى رابع", category: "English Program" },
    { value: "level-5", label: "Level 5 (1A) - مستوى خامس", category: "English Program" },
    { value: "level-6", label: "Level 6 (1B) - مستوى سادس", category: "English Program" },
    { value: "level-7", label: "Level 7 (2A) - مستوى سابع", category: "English Program" },
    { value: "level-8", label: "Level 8 (2B) - مستوى ثامن", category: "English Program" },
    { value: "level-9", label: "Level 9 (3A) - مستوى تاسع", category: "English Program" },
    { value: "level-10", label: "Level 10 (3B) - مستوى عاشر", category: "English Program" },
    { value: "level-11", label: "Level 11 (IELTS 1 - STEP 1) - مستوى-11", category: "English Program" },
    { value: "level-12", label: "Level 12 (IELTS 2 - STEP 2) - مستوى-12", category: "English Program" },
    { value: "speaking", label: "Speaking Class", category: "Speaking Program" },
    { value: "private", label: "1:1 Class - Private Class - كلاس فردي", category: "Private Class" },
    { value: "french", label: "French Language - لغة فرنسية", category: "Other Languages" },
    { value: "chinese", label: "Chinese Language - لغة صينية", category: "Other Languages" },
    { value: "spanish", label: "Spanish Language - لغة اسبانية", category: "Other Languages" },
    { value: "italian", label: "Italian Language - لغة ايطالية", category: "Other Languages" },
    { value: "arabic", label: "Arabic for Non-Arabic Speakers - عربي لغير الناطقين بها", category: "Other Languages" },
  ];

  const branches = [
    { value: "riyadh-olaya", label: "Riyadh - Olaya - الرياض - العليا" },
    { value: "riyadh-exit6", label: "Riyadh - Exit 6 - الرياض - مخرج ٦" },
    { value: "jeddah", label: "Jeddah - جدة" },
    { value: "online", label: "Online - اونلاين" },
  ];

  const paymentMethods = [
    { value: "cash", label: "Cash - كاش" },
    { value: "card", label: "Card - بطاقة" },
    { value: "tamara", label: "Tamara - تمارا" },
    { value: "tabby", label: "Tabby - تابي" },
    { value: "bank-transfer", label: "Bank Transfer - تحويل بنكي" },
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
        toast.error("Please fill all required fields");
        return;
      }
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
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

    // Validate inputs using zod schema
    try {
      const { studentSignupSchema } = await import("@/lib/validations");
      studentSignupSchema.parse({
        fullNameAr: formData.fullNameAr,
        fullNameEn: formData.fullNameEn,
        phone1: formData.phone1,
        phone2: formData.phone2,
        email: formData.email,
        id: formData.id,
        password: formData.password
      });
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
        phone1: formData.phone1,
        phone2: formData.phone2 || null,
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
        toast.error("Failed to add previous student");
        return;
      }

      toast.success("Previous student added successfully! Redirecting to student page...");
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
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Previous Student - Step {step} of 4</DialogTitle>
        </DialogHeader>
        
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullNameEn">Full Name (English) *</Label>
              <Input
                id="fullNameEn"
                placeholder="Enter full name in English"
                value={formData.fullNameEn}
                onChange={(e) => setFormData({...formData, fullNameEn: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullNameAr">Full Name (Arabic) *</Label>
              <Input
                id="fullNameAr"
                placeholder="ادخل الاسم الكامل بالعربي"
                dir="rtl"
                value={formData.fullNameAr}
                onChange={(e) => setFormData({...formData, fullNameAr: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone1">Phone 1 *</Label>
              <Input
                id="phone1"
                type="tel"
                placeholder="+966 XX XXX XXXX"
                value={formData.phone1}
                onChange={(e) => setFormData({...formData, phone1: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone2">Phone 2 (Optional)</Label>
              <Input
                id="phone2"
                type="tel"
                placeholder="+966 XX XXX XXXX"
                value={formData.phone2}
                onChange={(e) => setFormData({...formData, phone2: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id">National ID / Iqama *</Label>
              <Input
                id="id"
                placeholder="Enter ID number"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password (min 6 characters)"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
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
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {["English Program", "Speaking Program", "Private Class", "Other Languages"].map(category => {
                const coursesInCategory = allCourses.filter(c => c.category === category);
                return (
                  <div key={category} className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">{category}</h3>
                    {coursesInCategory.map((course) => (
                      <div key={course.value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id={course.value}
                          checked={formData.courses.includes(course.value)}
                          onCheckedChange={() => toggleCourse(course.value)}
                        />
                        <label
                          htmlFor={course.value}
                          className="text-sm flex-1 cursor-pointer"
                        >
                          {course.label}
                        </label>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {formData.courses.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium">Selected: {formData.courses.length} course(s)</p>
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
            <div className="grid gap-4">
              {branches.map((branch) => (
                <Card
                  key={branch.value}
                  className={`p-4 cursor-pointer transition-all ${
                    formData.branch === branch.value
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setFormData({...formData, branch: branch.value})}
                >
                  <p className="font-medium">{branch.label}</p>
                </Card>
              ))}
            </div>
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

        {/* Step 4: Payment Method */}
        {step === 4 && (
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Select Payment Method</Label>
            <div className="grid gap-4">
              {paymentMethods.map((method) => (
                <Card
                  key={method.value}
                  className={`p-4 cursor-pointer transition-all ${
                    formData.paymentMethod === method.value
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setFormData({...formData, paymentMethod: method.value})}
                >
                  <p className="font-medium">{method.label}</p>
                </Card>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-primary to-secondary">
                Add Student
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddPreviousStudentModal;
