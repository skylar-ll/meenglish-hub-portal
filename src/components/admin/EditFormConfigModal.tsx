import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface EditFormConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConfigItem {
  id: string;
  config_type: string;
  config_key: string;
  config_value: string;
  display_order: number;
  is_active: boolean;
}

export const EditFormConfigModal = ({ open, onOpenChange }: EditFormConfigModalProps) => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConfigs = async () => {
    const { data, error } = await supabase
      .from("form_configurations")
      .select("*")
      .order("config_type", { ascending: true })
      .order("display_order", { ascending: true });

    if (!error && data) {
      setConfigs(data);
    }
  };

  useEffect(() => {
    if (open) {
      fetchConfigs();
    }
  }, [open]);

  const handleSave = async (item: ConfigItem) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("form_configurations")
        .update({
          config_value: item.config_value,
          display_order: item.display_order,
        })
        .eq("id", item.id);

      if (error) throw error;
      toast.success("Configuration updated successfully");
      fetchConfigs();
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("form_configurations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Configuration deleted successfully");
      fetchConfigs();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (configType: string) => {
    const key = prompt(`Enter unique key for new ${configType}:`);
    if (!key) return;

    const value = prompt(`Enter display value for ${key}:`);
    if (!value) return;

    setLoading(true);
    try {
      let configValue = value;
      
      // For courses, we need JSON format
      if (configType === "course") {
        const category = prompt("Enter category (e.g., English Program, Speaking Program):");
        if (!category) return;
        configValue = JSON.stringify({ label: value, category });
      }

      const { error } = await supabase
        .from("form_configurations")
        .insert({
          config_type: configType,
          config_key: key,
          config_value: configValue,
          display_order: configs.filter(c => c.config_type === configType).length + 1,
        });

      if (error) throw error;
      toast.success("Configuration added successfully");
      fetchConfigs();
    } catch (error: any) {
      toast.error(`Failed to add: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateConfigValue = (id: string, field: keyof ConfigItem, value: any) => {
    setConfigs(configs.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const renderConfigItems = (configType: string, title: string) => {
    const items = configs.filter(c => c.config_type === configType);
    
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button size="sm" onClick={() => handleAdd(configType)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Key</Label>
                  <Input value={item.config_key} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={item.display_order}
                    onChange={(e) => updateConfigValue(item.id, "display_order", parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <Label>Value</Label>
                {configType === "course" ? (
                  <Textarea
                    value={item.config_value}
                    onChange={(e) => updateConfigValue(item.id, "config_value", e.target.value)}
                    placeholder='{"label": "Course Name", "category": "Category"}'
                    rows={2}
                  />
                ) : (
                  <Input
                    value={item.config_value}
                    onChange={(e) => updateConfigValue(item.id, "config_value", e.target.value)}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSave(item)} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)} disabled={loading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Form Configurations</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="courses" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="class_types">Class Types</TabsTrigger>
            <TabsTrigger value="payment_methods">Payment Methods</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            {renderConfigItems("course", "Available Courses")}
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            {renderConfigItems("branch", "Available Branches")}
          </TabsContent>

          <TabsContent value="programs" className="space-y-4">
            {renderConfigItems("program", "Available Programs")}
          </TabsContent>

          <TabsContent value="class_types" className="space-y-4">
            {renderConfigItems("class_type", "Class Types")}
          </TabsContent>

          <TabsContent value="payment_methods" className="space-y-4">
            {renderConfigItems("payment_method", "Payment Methods")}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
