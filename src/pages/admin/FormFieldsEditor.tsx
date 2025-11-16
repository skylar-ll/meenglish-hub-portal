import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FormField {
  id: string;
  form_type: string;
  field_name: string;
  field_label_en: string;
  field_label_ar: string | null;
  field_type: string;
  field_options: any;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  placeholder_en: string | null;
  placeholder_ar: string | null;
  validation_rules: any;
}

export default function FormFieldsEditor() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const [formData, setFormData] = useState({
    form_type: "add_new_student",
    field_name: "",
    field_label_en: "",
    field_label_ar: "",
    field_type: "text",
    is_required: true,
    placeholder_en: "",
    placeholder_ar: "",
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_form_fields")
        .select("*")
        .order("form_type")
        .order("display_order");

      if (error) throw error;
      setFields(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch fields: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.field_name || !formData.field_label_en) {
        toast.error("Field name and English label are required");
        return;
      }

      if (editingField) {
        // Update existing field
        const { error } = await supabase
          .from("custom_form_fields")
          .update({
            field_label_en: formData.field_label_en,
            field_label_ar: formData.field_label_ar || null,
            field_type: formData.field_type,
            is_required: formData.is_required,
            placeholder_en: formData.placeholder_en || null,
            placeholder_ar: formData.placeholder_ar || null,
          })
          .eq("id", editingField.id);

        if (error) throw error;
        toast.success("Field updated successfully");
      } else {
        // Create new field
        const { error } = await supabase
          .from("custom_form_fields")
          .insert({
            ...formData,
            field_label_ar: formData.field_label_ar || null,
            placeholder_en: formData.placeholder_en || null,
            placeholder_ar: formData.placeholder_ar || null,
            display_order: fields.filter(f => f.form_type === formData.form_type).length,
          });

        if (error) throw error;
        toast.success("Field created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchFields();
    } catch (error: any) {
      toast.error("Failed to save field: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this field?")) return;

    try {
      const { error } = await supabase
        .from("custom_form_fields")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Field deleted successfully");
      fetchFields();
    } catch (error: any) {
      toast.error("Failed to delete field: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      form_type: "add_new_student",
      field_name: "",
      field_label_en: "",
      field_label_ar: "",
      field_type: "text",
      is_required: true,
      placeholder_en: "",
      placeholder_ar: "",
    });
    setEditingField(null);
  };

  const openEditDialog = (field: FormField) => {
    setEditingField(field);
    setFormData({
      form_type: field.form_type,
      field_name: field.field_name,
      field_label_en: field.field_label_en,
      field_label_ar: field.field_label_ar || "",
      field_type: field.field_type,
      is_required: field.is_required,
      placeholder_en: field.placeholder_en || "",
      placeholder_ar: field.placeholder_ar || "",
    });
    setIsDialogOpen(true);
  };

  const renderFieldsTable = (formType: string, title: string) => {
    const formFields = fields.filter(f => f.form_type === formType);

    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <Dialog open={isDialogOpen && formData.form_type === formType} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setFormData(prev => ({ ...prev, form_type: formType }));
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingField ? "Edit Field" : "Add New Field"}</DialogTitle>
                <DialogDescription>
                  Configure the form field settings
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Field Name (Internal) *</Label>
                  <Input
                    value={formData.field_name}
                    onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                    placeholder="e.g., phone_number"
                    disabled={!!editingField}
                  />
                </div>

                <div>
                  <Label>Label (English) *</Label>
                  <Input
                    value={formData.field_label_en}
                    onChange={(e) => setFormData({ ...formData, field_label_en: e.target.value })}
                    placeholder="e.g., Phone Number"
                  />
                </div>

                <div>
                  <Label>Label (Arabic)</Label>
                  <Input
                    value={formData.field_label_ar}
                    onChange={(e) => setFormData({ ...formData, field_label_ar: e.target.value })}
                    placeholder="e.g., رقم الهاتف"
                    dir="rtl"
                  />
                </div>

                <div>
                  <Label>Field Type</Label>
                  <Select value={formData.field_type} onValueChange={(value) => setFormData({ ...formData, field_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="textarea">Text Area</SelectItem>
                      <SelectItem value="select">Select/Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Placeholder (English)</Label>
                  <Input
                    value={formData.placeholder_en}
                    onChange={(e) => setFormData({ ...formData, placeholder_en: e.target.value })}
                    placeholder="e.g., Enter your phone number"
                  />
                </div>

                <div>
                  <Label>Placeholder (Arabic)</Label>
                  <Input
                    value={formData.placeholder_ar}
                    onChange={(e) => setFormData({ ...formData, placeholder_ar: e.target.value })}
                    placeholder="e.g., أدخل رقم هاتفك"
                    dir="rtl"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="required"
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked as boolean })}
                  />
                  <Label htmlFor="required">Required Field</Label>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingField ? "Update Field" : "Create Field"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {formFields.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No custom fields yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Field Name</TableHead>
                <TableHead>Label (EN)</TableHead>
                <TableHead>Label (AR)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formFields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{field.field_name}</TableCell>
                  <TableCell>{field.field_label_en}</TableCell>
                  <TableCell dir="rtl">{field.field_label_ar || "-"}</TableCell>
                  <TableCell className="capitalize">{field.field_type}</TableCell>
                  <TableCell>{field.is_required ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(field)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(field.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <Button variant="outline" onClick={() => navigate("/admin/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">Form Fields Editor</h1>
        <p className="text-muted-foreground mb-8">
          Customize form fields for student and teacher registration forms
        </p>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Tabs defaultValue="add_new_student">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="add_new_student">Add New Student</TabsTrigger>
              <TabsTrigger value="add_previous_student">Add Previous Student</TabsTrigger>
              <TabsTrigger value="create_teacher">Create Teacher</TabsTrigger>
            </TabsList>

            <TabsContent value="add_new_student">
              {renderFieldsTable("add_new_student", "New Student Registration Form")}
            </TabsContent>

            <TabsContent value="add_previous_student">
              {renderFieldsTable("add_previous_student", "Previous Student Registration Form")}
            </TabsContent>

            <TabsContent value="create_teacher">
              {renderFieldsTable("create_teacher", "Teacher Creation Form")}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
