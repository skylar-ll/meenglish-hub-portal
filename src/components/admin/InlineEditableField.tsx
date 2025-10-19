import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InlineEditableFieldProps {
  id: string;
  value: string;
  configType: string;
  configKey: string;
  isEditMode: boolean;
  onUpdate?: () => void;
  onDelete?: () => void;
  placeholder?: string;
  isLabel?: boolean;
}

export const InlineEditableField = ({
  id,
  value,
  configType,
  configKey,
  isEditMode,
  onUpdate,
  onDelete,
  placeholder,
  isLabel = false,
}: InlineEditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (editValue.trim() === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("form_configurations")
        .update({ config_value: editValue.trim() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "✓ Saved",
        description: "Field updated successfully",
      });
      
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating field:", error);
      toast({
        title: "Error",
        description: "Failed to update field",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this field?")) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("form_configurations")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "✓ Deleted",
        description: "Field deleted successfully",
      });
      
      onDelete?.();
    } catch (error) {
      console.error("Error deleting field:", error);
      toast({
        title: "Error",
        description: "Failed to delete field",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isEditMode) {
    return <span className={isLabel ? "font-medium" : ""}>{value}</span>;
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-8"
          disabled={isSaving}
          autoFocus
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving}
          className="h-8 w-8 p-0"
        >
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <span className={isLabel ? "font-medium" : ""}>{value}</span>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-6 w-6 p-0"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3 text-red-600" />
          </Button>
        )}
      </div>
    </div>
  );
};
