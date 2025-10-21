import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Edit } from "lucide-react";

interface InlineStudentFieldProps {
  value: string | number;
  onSave: (value: string) => void;
  type?: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  isMulti?: boolean;
  selectedValues?: string[];
  className?: string;
}

export const InlineStudentField = ({
  value,
  onSave,
  type = "text",
  options,
  isMulti,
  selectedValues = [],
  className = ""
}: InlineStudentFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedValues);

  const handleSave = () => {
    if (isMulti) {
      onSave(selectedIds.join(","));
    } else {
      onSave(editValue.replace(/[$%m]/g, ""));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setSelectedIds(selectedValues);
    setIsEditing(false);
  };

  const toggleTeacher = (teacherId: string) => {
    setSelectedIds(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  if (!isEditing) {
    return (
      <div className={`flex items-center gap-2 group ${className}`}>
        <span>{value}</span>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
          onClick={() => setIsEditing(true)}
        >
          <Edit className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  if (type === "select" && isMulti && options) {
    return (
      <div className="flex flex-col gap-2">
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(option.value)}
                onChange={() => toggleTeacher(option.value)}
                className="rounded"
              />
              {option.label}
            </label>
          ))}
        </div>
        <div className="flex gap-1">
          <Button size="sm" onClick={handleSave} className="h-7">
            <Check className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  if (type === "select" && !isMulti && options) {
    return (
      <div className="flex items-center gap-1">
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleSave} className="h-8 w-8 p-0">
          <Check className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0">
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        type={type === "number" ? "text" : type}
        className="h-8 w-full"
        autoFocus
      />
      <Button size="sm" onClick={handleSave} className="h-8 w-8 p-0">
        <Check className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0">
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};
