import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: any;
  onSuccess: () => void;
  teachers: Array<{ id: string; full_name: string }>;
  branches: Array<{ id: string; name_en: string }>;
  timings: string[];
  courseOptions: Array<{ label: string; value: string }>;
  levelOptions: string[];
}

export const EditClassModal = ({
  isOpen,
  onClose,
  classData,
  onSuccess,
  teachers,
  branches,
  timings,
  courseOptions,
  levelOptions,
}: EditClassModalProps) => {
  const [className, setClassName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedTiming, setSelectedTiming] = useState("");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (classData) {
      setClassName(classData.class_name || "");
      setSelectedBranch(classData.branch_id || "");
      setSelectedCourses(classData.courses || []);
      setSelectedLevels(classData.levels || []);
      setSelectedTeacher(classData.teacher_id || "");
      setSelectedTiming(classData.timing || "");
      setStartDate(classData.start_date || "");
    }
  }, [classData]);

  const toggleCourse = (course: string) => {
    setSelectedCourses((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]
    );
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleSave = async () => {
    if (!className.trim()) {
      toast.error("Please enter a class name");
      return;
    }
    if (!selectedBranch) {
      toast.error("Please select a branch");
      return;
    }
    if (selectedCourses.length === 0) {
      toast.error("Please select at least one course");
      return;
    }
    if (selectedLevels.length === 0) {
      toast.error("Please select at least one level");
      return;
    }
    if (!selectedTeacher) {
      toast.error("Please select a teacher");
      return;
    }
    if (!selectedTiming) {
      toast.error("Please select a timing");
      return;
    }
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("classes")
        .update({
          class_name: className,
          branch_id: selectedBranch,
          courses: selectedCourses,
          levels: selectedLevels,
          teacher_id: selectedTeacher,
          timing: selectedTiming,
          start_date: startDate,
        })
        .eq("id", classData.id);

      if (error) throw error;

      toast.success("Class updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating class:", error);
      toast.error(error.message || "Failed to update class");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit Class</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="edit-className">Class Name</Label>
            <Input
              id="edit-className"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Enter class name"
            />
          </div>

          <div>
            <Label htmlFor="edit-branch">Branch</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger id="edit-branch">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Courses</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {courseOptions.map((course) => (
                <Badge
                  key={course.value}
                  variant={selectedCourses.includes(course.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCourse(course.value)}
                >
                  {course.label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Levels</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {levelOptions.map((level) => (
                <Badge
                  key={level}
                  variant={selectedLevels.includes(level) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleLevel(level)}
                >
                  {level}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="edit-teacher">Teacher</Label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger id="edit-teacher">
                <SelectValue placeholder="Select Teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-timing">Timing</Label>
            <Select value={selectedTiming} onValueChange={setSelectedTiming}>
              <SelectTrigger id="edit-timing">
                <SelectValue placeholder="Select Timing" />
              </SelectTrigger>
              <SelectContent>
                {timings.map((timing) => (
                  <SelectItem key={timing} value={timing}>
                    {timing}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-startDate">Start Date</Label>
            <Input
              id="edit-startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
