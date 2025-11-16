import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function TermsManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [contentEn, setContentEn] = useState("");
  const [contentAr, setContentAr] = useState("");

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("terms_and_conditions")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      
      if (data) {
        setContentEn(data.content_en);
        setContentAr(data.content_ar);
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the existing record ID
      const { data: existingRecord } = await supabase
        .from("terms_and_conditions")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from("terms_and_conditions")
          .update({
            content_en: contentEn,
            content_ar: contentAr,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("id", existingRecord.id);

        if (error) throw error;
      } else {
        // Create new record if none exists
        const { error } = await supabase
          .from("terms_and_conditions")
          .insert({
            content_en: contentEn,
            content_ar: contentAr,
            updated_by: user?.id,
          });

        if (error) throw error;
      }

      toast.success("Terms and conditions updated successfully!");
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => navigate("/admin/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">Terms & Conditions Management</h1>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label>English Content</Label>
                <Textarea
                  value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  rows={12}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Arabic Content</Label>
                <Textarea
                  value={contentAr}
                  onChange={(e) => setContentAr(e.target.value)}
                  rows={12}
                  className="mt-2"
                  dir="rtl"
                />
              </div>
              <Button onClick={handleSave} disabled={loading} className="w-full">
                Save Changes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
