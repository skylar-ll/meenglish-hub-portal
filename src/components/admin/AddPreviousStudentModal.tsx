import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AddPreviousStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
}

const AddPreviousStudentModal = ({ open, onOpenChange, onStudentAdded }: AddPreviousStudentModalProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullNameAr: "",
    fullNameEn: "",
    phone1: "",
    phone2: "",
    email: "",
    id: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate all fields
    if (!formData.fullNameAr || !formData.fullNameEn || !formData.phone1 || !formData.email || !formData.id || !formData.password) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create auth account for the student
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name_en: formData.fullNameEn,
            full_name_ar: formData.fullNameAr,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Create user role
      await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "student",
        });

      // Store minimal data in sessionStorage to continue the flow
      sessionStorage.setItem("studentRegistration", JSON.stringify({
        fullNameAr: formData.fullNameAr,
        fullNameEn: formData.fullNameEn,
        phone1: formData.phone1,
        phone2: formData.phone2,
        email: formData.email,
        id: formData.id,
        isAdminAdded: true,
      }));

      toast.success("Student account created. Redirecting to complete registration...");
      
      // Close modal and redirect to student signup flow
      onOpenChange(false);
      
      // Navigate to branch selection to start the full flow
      setTimeout(() => {
        window.location.href = "/student/branch-selection";
      }, 500);

    } catch (error: any) {
      console.error("Error creating student:", error);
      toast.error(error.message || "Failed to create student account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      fullNameAr: "",
      fullNameEn: "",
      phone1: "",
      phone2: "",
      email: "",
      id: "",
      password: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add Previous Student - Basic Information</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Enter the student's basic information. They will be redirected to complete their course selection, teacher assignment, and billing form.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name (Arabic) *</label>
              <input
                type="text"
                dir="rtl"
                placeholder="الاسم الكامل"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.fullNameAr}
                onChange={(e) => setFormData({ ...formData, fullNameAr: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Full Name (English) *</label>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.fullNameEn}
                onChange={(e) => setFormData({ ...formData, fullNameEn: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Phone 1 *</label>
              <input
                type="tel"
                placeholder="+966 XXX XXX XXX"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.phone1}
                onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Phone 2 (Optional)</label>
              <input
                type="tel"
                placeholder="+966 XXX XXX XXX"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.phone2}
                onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email *</label>
              <input
                type="email"
                placeholder="email@example.com"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">National ID *</label>
              <input
                type="text"
                placeholder="XXXXXXXXXX"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Password *</label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Continue to Registration"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPreviousStudentModal;
