import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { MultiSelect } from "@/components/ui/multi-select";

export default function CreateTeacher() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [createdTeacher, setCreatedTeacher] = useState<{
    email: string;
    id: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    classIds: [] as string[],
  });

  // Fetch all active classes
  const { data: classes = [] } = useQuery({
    queryKey: ["all-classes-for-teacher"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("status", "active")
        .order("class_name");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Create class options with timing info
  const classOptions = classes.map((c) => ({
    label: `${c.class_name} (${c.timing})`,
    value: c.id,
  }));

  // Validate timing conflicts when selecting classes
  const handleClassSelection = (selectedIds: string[]) => {
    // Check for timing conflicts
    const selectedClasses = classes.filter(c => selectedIds.includes(c.id));
    const timings = selectedClasses.map(c => c.timing);
    const uniqueTimings = new Set(timings);
    
    if (timings.length !== uniqueTimings.size) {
      // Find duplicate timing
      const duplicateTiming = timings.find((t, i) => timings.indexOf(t) !== i);
      toast.error(`Cannot assign multiple classes with the same timing (${duplicateTiming})`);
      return; // Don't update selection
    }
    
    setFormData({ ...formData, classIds: selectedIds });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Final validation of timing conflicts
      if (formData.classIds.length > 1) {
        const selectedClasses = classes.filter(c => formData.classIds.includes(c.id));
        const timings = selectedClasses.map(c => c.timing);
        const uniqueTimings = new Set(timings);
        
        if (timings.length !== uniqueTimings.size) {
          throw new Error("Cannot assign classes with the same timing to one teacher");
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("You must be logged in as admin");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-teacher`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            classIds: formData.classIds,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.includes("email") || result.error?.includes("registered")) {
          throw new Error("A user with this email already exists. Please use a different email.");
        }
        if (result.error?.includes("timing")) {
          throw new Error(result.error);
        }
        throw new Error(result.error || 'Failed to create teacher account');
      }

      setCreatedTeacher({
        email: result.teacher.email,
        id: result.teacher.id,
      });
      setShowPasswordModal(true);

      toast.success("Teacher account created successfully!");
    } catch (error: any) {
      console.error("Error creating teacher:", error);
      toast.error(error.message || "Failed to create teacher account");
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowPasswordModal(false);
    if (createdTeacher) {
      navigate(`/admin/teacher/${createdTeacher.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate("/admin/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">Create Teacher Account</h1>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Teacher Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={6}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Minimum 6 characters
              </p>
            </div>

            <div>
              <Label>Assign Classes</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Teacher can be assigned multiple classes with different timings
              </p>
              <MultiSelect
                options={classOptions}
                selected={formData.classIds}
                onChange={handleClassSelection}
                placeholder="Select classes to assign..."
                className="mt-2"
              />
              {classes.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  No classes available. Create classes first in the Classes page.
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Teacher Account"}
            </Button>
          </form>
        </Card>

        <Dialog open={showPasswordModal} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Teacher Account Created Successfully</DialogTitle>
              <DialogDescription>
                The teacher account has been created. Share the login credentials securely with the teacher.
              </DialogDescription>
            </DialogHeader>
            
            <Alert>
              <AlertDescription className="space-y-3">
                <div>
                  <p className="font-semibold">Email:</p>
                  <p className="font-mono text-sm">{createdTeacher?.email}</p>
                </div>
                <div>
                  <p className="font-semibold">Password:</p>
                  <p className="font-mono text-sm text-muted-foreground">
                    (The password you entered in the form)
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                💡 For security, please share the password with the teacher through a secure channel (in-person, secure messaging, etc.)
              </AlertDescription>
            </Alert>

            <Button onClick={handleModalClose} className="w-full">
              Continue to Teacher Profile
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
