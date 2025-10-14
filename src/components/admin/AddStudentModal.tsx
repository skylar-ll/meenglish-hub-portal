import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { studentSignupSchema } from "@/lib/validations";

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
}

export const AddStudentModal = ({ open, onOpenChange, onStudentAdded }: AddStudentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullNameAr: "",
    fullNameEn: "",
    phone1: "",
    phone2: "",
    email: "",
    id: "",
    password: "",
    branch: "",
    program: "",
    classType: "",
    paymentMethod: "Cash",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate required fields
      const validatedData = studentSignupSchema.parse({
        fullNameAr: formData.fullNameAr,
        fullNameEn: formData.fullNameEn,
        phone1: formData.phone1,
        phone2: formData.phone2,
        email: formData.email,
        id: formData.id,
        password: formData.password,
      });

      if (!formData.branch || !formData.program || !formData.classType) {
        toast.error("Please fill in all required fields");
        return;
      }

      // 1. Create auth user
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

      if (authError) {
        toast.error(`Authentication error: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        toast.error("Failed to create user account");
        return;
      }

      // 2. Assign student role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "student",
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        toast.error("Failed to assign student role");
        return;
      }

      // 3. Create student record
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
          program: formData.program,
          class_type: formData.classType,
          payment_method: formData.paymentMethod,
          subscription_status: "active",
        });

      if (studentError) {
        console.error("Student record error:", studentError);
        toast.error("Failed to create student record");
        return;
      }

      // 4. Update profile (if needed)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name_en: validatedData.fullNameEn,
          full_name_ar: validatedData.fullNameAr,
          phone1: validatedData.phone1,
          phone2: validatedData.phone2 || null,
          national_id: validatedData.id,
          branch: formData.branch,
          program: formData.program,
          class_type: formData.classType,
          payment_method: formData.paymentMethod,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Profile update warning:", profileError);
      }

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
        branch: "",
        program: "",
        classType: "",
        paymentMethod: "Cash",
      });
      
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone1">Phone 1 *</Label>
              <Input
                id="phone1"
                type="tel"
                placeholder="+966 XXX XXX XXX"
                value={formData.phone1}
                onChange={(e) => handleInputChange("phone1", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone2">Phone 2 (Optional)</Label>
              <Input
                id="phone2"
                type="tel"
                placeholder="+966 XXX XXX XXX"
                value={formData.phone2}
                onChange={(e) => handleInputChange("phone2", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationalId">National ID *</Label>
            <Input
              id="nationalId"
              placeholder="ID Number"
              value={formData.id}
              onChange={(e) => handleInputChange("id", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch">Branch *</Label>
            <Select value={formData.branch} onValueChange={(value) => handleInputChange("branch", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Riyadh">Riyadh</SelectItem>
                <SelectItem value="Jeddah">Jeddah</SelectItem>
                <SelectItem value="Dammam">Dammam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">Program *</Label>
            <Select value={formData.program} onValueChange={(value) => handleInputChange("program", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General English">General English</SelectItem>
                <SelectItem value="Business English">Business English</SelectItem>
                <SelectItem value="IELTS Preparation">IELTS Preparation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classType">Class Type *</Label>
            <Select value={formData.classType} onValueChange={(value) => handleInputChange("classType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Group">Group</SelectItem>
                <SelectItem value="Private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange("paymentMethod", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Tabby">Tabby</SelectItem>
                <SelectItem value="Tamara">Tamara</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Student"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
