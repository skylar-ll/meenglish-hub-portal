import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddNewFieldButtonProps {
  configType: string;
  onAdd?: () => void;
  categoryName?: string;
}

export const AddNewFieldButton = ({
  configType,
  onAdd,
  categoryName,
}: AddNewFieldButtonProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newKey, setNewKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!newValue.trim() || !newKey.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Get max display_order
      const { data: maxOrderData } = await supabase
        .from("form_configurations")
        .select("display_order")
        .eq("config_type", configType)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

      let configValue = newValue.trim();
      
      // For courses, store as JSON with category
      if (configType === "course") {
        configValue = JSON.stringify({
          label: newValue.trim(),
          category: categoryName || "General",
        });
      }

      const { error } = await supabase
        .from("form_configurations")
        .insert({
          config_type: configType,
          config_key: newKey.trim().toLowerCase().replace(/\s+/g, "-"),
          config_value: configValue,
          display_order: nextOrder,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "✓ Added",
        description: "New field added successfully",
      });

      setNewValue("");
      setNewKey("");
      setIsAdding(false);
      onAdd?.();
    } catch (error) {
      console.error("Error adding field:", error);
      toast({
        title: "Error",
        description: "Failed to add new field",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNewValue("");
    setNewKey("");
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <div className="flex flex-col gap-2 p-3 border border-dashed border-primary/50 rounded-lg bg-primary/5">
        <Input
          placeholder="Display Name (e.g., 'German')"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          disabled={isSaving}
          className="h-8"
        />
        <Input
          placeholder="Key (e.g., 'german')"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          disabled={isSaving}
          className="h-8"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsAdding(true)}
      className="w-full border-dashed"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add New {configType.replace("_", " ")}
    </Button>
  );
};
