import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AddPreviousStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded: () => void;
}

const AddPreviousStudentModal = ({ open, onOpenChange, onStudentAdded }: AddPreviousStudentModalProps) => {
  const [formData, setFormData] = useState({
    full_name_ar: "",
    full_name_en: "",
    phone1: "",
    phone2: "",
    email: "",
    national_id: "",
    program: "",
    class_type: "",
    branch: "",
    payment_method: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const studentData: any = {
        ...formData,
        phone2: formData.phone2 || null,
        subscription_status: 'active',
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      const { error } = await supabase.from("students").insert(studentData);

      if (error) {
        console.error("Error adding previous student:", error);
        toast.error("Failed to add previous student");
        return;
      }

      toast.success("Previous student added successfully!");
      onStudentAdded();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        full_name_ar: "",
        full_name_en: "",
        phone1: "",
        phone2: "",
        email: "",
        national_id: "",
        program: "",
        class_type: "",
        branch: "",
        payment_method: "",
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
          <DialogTitle>Add Previous Student</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name_ar">Full Name (Arabic)</Label>
              <Input
                id="full_name_ar"
                value={formData.full_name_ar}
                onChange={(e) => setFormData({...formData, full_name_ar: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name_en">Full Name (English)</Label>
              <Input
                id="full_name_en"
                value={formData.full_name_en}
                onChange={(e) => setFormData({...formData, full_name_en: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone1">Phone 1</Label>
              <Input
                id="phone1"
                value={formData.phone1}
                onChange={(e) => setFormData({...formData, phone1: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone2">Phone 2 (Optional)</Label>
              <Input
                id="phone2"
                value={formData.phone2}
                onChange={(e) => setFormData({...formData, phone2: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="national_id">National ID</Label>
              <Input
                id="national_id"
                value={formData.national_id}
                onChange={(e) => setFormData({...formData, national_id: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Program</Label>
              <Input
                id="program"
                value={formData.program}
                onChange={(e) => setFormData({...formData, program: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class_type">Class Type</Label>
              <Input
                id="class_type"
                value={formData.class_type}
                onChange={(e) => setFormData({...formData, class_type: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                value={formData.branch}
                onChange={(e) => setFormData({...formData, branch: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Input
                id="payment_method"
                value={formData.payment_method}
                onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Student</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPreviousStudentModal;
