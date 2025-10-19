import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Course {
  id: string;
  label: string;
  category: string;
  value: string;
  price: number;
}

export const CoursesManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    category: "",
    price: "0",
  });

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("form_configurations")
        .select("*")
        .eq("config_type", "course")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;

      const parsedCourses = data.map((item) => {
        try {
          const parsed = JSON.parse(item.config_value);
          return {
            id: item.id,
            label: parsed.label || item.config_value,
            category: parsed.category || "General",
            value: item.config_key,
            price: item.price || 0,
          };
        } catch {
          return {
            id: item.id,
            label: item.config_value,
            category: "General",
            value: item.config_key,
            price: item.price || 0,
          };
        }
      });

      setCourses(parsedCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAdd = async () => {
    if (!formData.label.trim() || !formData.category.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const configValue = JSON.stringify({
        label: formData.label,
        category: formData.category,
      });

      const { error } = await supabase
        .from("form_configurations")
        .insert({
          config_type: "course",
          config_key: formData.label.toLowerCase().replace(/\s+/g, "_"),
          config_value: configValue,
          price: parseFloat(formData.price) || 0,
        });

      if (error) throw error;

      toast.success("Course added successfully");
      setShowAddModal(false);
      setFormData({ label: "", category: "", price: "0" });
      fetchCourses();
    } catch (error) {
      console.error("Error adding course:", error);
      toast.error("Failed to add course");
    }
  };

  const handleEdit = async () => {
    if (!selectedCourse || !formData.label.trim() || !formData.category.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const configValue = JSON.stringify({
        label: formData.label,
        category: formData.category,
      });

      const { error } = await supabase
        .from("form_configurations")
        .update({
          config_value: configValue,
          price: parseFloat(formData.price) || 0,
        })
        .eq("id", selectedCourse.id);

      if (error) throw error;

      toast.success("Course updated successfully");
      setShowEditModal(false);
      setSelectedCourse(null);
      setFormData({ label: "", category: "", price: "0" });
      fetchCourses();
    } catch (error) {
      console.error("Error updating course:", error);
      toast.error("Failed to update course");
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
      const { error } = await supabase
        .from("form_configurations")
        .update({ is_active: false })
        .eq("id", courseId);

      if (error) throw error;

      toast.success("Course deleted successfully");
      fetchCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    }
  };

  const openEditModal = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      label: course.label,
      category: course.category,
      price: course.price.toString(),
    });
    setShowEditModal(true);
  };

  const groupedCourses = courses.reduce((acc, course) => {
    if (!acc[course.category]) {
      acc[course.category] = [];
    }
    acc[course.category].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Courses Management</h2>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Course
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedCourses).map((category) => (
            <Card key={category} className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-primary">{category}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedCourses[category].map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.label}</TableCell>
                      <TableCell>${course.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(course)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(course.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      {/* Add Course Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name *</Label>
              <Input
                id="courseName"
                placeholder="e.g., General English"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                placeholder="e.g., General"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <Button onClick={handleAdd} className="w-full">
              Add Course
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Course Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editCourseName">Course Name *</Label>
              <Input
                id="editCourseName"
                placeholder="e.g., General English"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategory">Category *</Label>
              <Input
                id="editCategory"
                placeholder="e.g., General"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPrice">Price *</Label>
              <Input
                id="editPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <Button onClick={handleEdit} className="w-full">
              Update Course
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
