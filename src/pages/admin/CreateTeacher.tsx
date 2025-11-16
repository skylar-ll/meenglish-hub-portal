import { useState } from "react";
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
    password: string;
    id: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    classIds: [] as string[],
  });

  // Fetch all classes for assignment
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("class_name");
      
      if (error) throw error;
      return data || [];
    },
  });

  const classOptions = classes.map((c) => ({
    label: c.class_name,
    value: c.id,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call edge function to create teacher (preserves admin session)
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-teacher`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
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
        throw new Error(result.error || 'Failed to create teacher account');
      }

      // Show password modal
      setCreatedTeacher({
        email: result.teacher.email,
        password: result.teacher.password,
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
              <MultiSelect
                options={classOptions}
                selected={formData.classIds}
                onChange={(selected) =>
                  setFormData({ ...formData, classIds: selected })
                }
                placeholder="Select classes to assign..."
                className="mt-2"
              />
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
                Save these credentials now. You will only see this once.
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
                  <p className="font-mono text-sm">{createdTeacher?.password}</p>
                </div>
              </AlertDescription>
            </Alert>

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800">
                ⚠️ IMPORTANT: You will only be shown this once. Please save these credentials now.
              </AlertDescription>
            </Alert>

            <Button onClick={handleModalClose} className="w-full">
              I've Saved It
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
