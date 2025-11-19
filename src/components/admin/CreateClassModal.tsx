import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";

interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

interface CreateClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExistingClass {
  id: string;
  class_name: string;
  courses: string[];
  levels: string[];
  timing: string;
  teacher_id: string | null;
  teacher_name: string;
  student_count: number;
}

// Fixed timing options
const TIMING_OPTIONS = [
  "10:30 AM – 12:00 PM",
  "3:00 PM – 4:30 PM",
  "4:30 PM – 6:00 PM",
  "6:00 PM – 7:30 PM",
];

// Dynamic course and level options - fetched from form_configurations

export const CreateClassModal = ({ open, onOpenChange }: CreateClassModalProps) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [className, setClassName] = useState("");
  const [timing, setTiming] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [existingClasses, setExistingClasses] = useState<ExistingClass[]>([]);
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [courseOptions, setCourseOptions] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [levelOptions, setLevelOptions] = useState<MultiSelectOption[]>([]);
  const [timingOptions, setTimingOptions] = useState<string[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchData();
      fetchExistingClasses();
    }
  }, [open]);

  const fetchData = async () => {
    setFetchingData(true);
    try {
      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("id, full_name, email")
        .order("full_name");

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Fetch courses from form_configurations
      const { data: coursesData } = await supabase
        .from("form_configurations")
        .select("*")
        .eq("config_type", "course")
        .eq("is_active", true)
        .order("display_order");
      
      setCourseOptions((coursesData || []).map(c => ({
        id: c.id,
        label: c.config_value,
        value: c.config_value
      })));

      // Fetch levels from form_configurations
      const { data: levelsData } = await supabase
        .from("form_configurations")
        .select("*")
        .eq("config_type", "level")
        .eq("is_active", true)
        .order("display_order");
      
      setLevelOptions((levelsData || []).map(l => ({
        label: l.config_value,
        value: l.config_value
      })));

      // Fetch timings from form_configurations
      const { data: timingsData } = await supabase
        .from("form_configurations")
        .select("*")
        .eq("config_type", "timing")
        .eq("is_active", true)
        .order("display_order");
      
      setTimingOptions((timingsData || []).map(t => t.config_value));

      // Fetch branches
      const { data: branchesData } = await supabase
        .from("branches")
        .select("id, name_en, name_ar")
        .order("name_en");
      
      setBranches((branchesData || []).map(b => ({
        id: b.id,
        label: `${b.name_en} - ${b.name_ar}`,
        value: b.name_en
      })));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load form data");
    } finally {
      setFetchingData(false);
    }
  };

  const fetchExistingClasses = async () => {
    try {
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          courses,
          levels,
          timing,
          teacher_id,
          teachers (full_name)
        `);

      if (classesError) throw classesError;

      const classesWithStudentCount = await Promise.all(
        (classesData || []).map(async (cls) => {
          const { count } = await supabase
            .from("class_students")
            .select("*", { count: "exact", head: true })
            .eq("class_id", cls.id);

          return {
            id: cls.id,
            class_name: cls.class_name,
            courses: cls.courses || [],
            levels: cls.levels || [],
            timing: cls.timing,
            teacher_id: cls.teacher_id,
            teacher_name: (cls.teachers as any)?.full_name || "No teacher assigned",
            student_count: count || 0,
          };
        })
      );

      setExistingClasses(classesWithStudentCount);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to load classes");
    }
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      toast.error("Please enter a class name");
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
    if (!timing.trim()) {
      toast.error("Please select timing");
      return;
    }
    // Teacher is now optional
    if (!selectedBranch) {
      toast.error("Please select a branch");
      return;
    }

    setLoading(true);
    try {
      // If a teacher is selected, check if they're already assigned to another class
      if (selectedTeacher) {
        const { data: existingClass } = await supabase
          .from("classes")
          .select("id, class_name")
          .eq("teacher_id", selectedTeacher)
          .eq("status", "active")
          .maybeSingle();

        if (existingClass) {
          toast.error(`This teacher is already assigned to "${existingClass.class_name}". Please unassign them first or select a different teacher.`);
          setLoading(false);
          return;
        }
      }

      // Get branch ID
      const branch = branches.find(b => b.value === selectedBranch);
      const branchId = branch?.id;

      // Create the class
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .insert({
          teacher_id: selectedTeacher || null,
          class_name: className,
          timing: timing,
          courses: selectedCourses,
          levels: selectedLevels,
          branch_id: branchId,
          start_date: startDate || null,
          status: 'active'
        })
        .select()
        .single();

      if (classError) throw classError;

      // Auto-enroll matching students
      await autoEnrollStudents(classData.id, selectedCourses, selectedLevels);

      toast.success("Class created successfully!");
      
      // Reset form
      resetForm();
      fetchExistingClasses();
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  const autoEnrollStudents = async (classId: string, courses: string[], levels: string[]) => {
    try {
      // Find students whose program matches the course and whose course_level matches any of the class levels
      const { data: matchingStudents } = await supabase
        .from("students")
        .select("id, course_level");

      if (!matchingStudents || matchingStudents.length === 0) return;

      // Filter students where their level overlaps with class levels
      const studentsToEnroll = matchingStudents.filter((student) => {
        // Check if student's program matches any of the class courses
        const programMatch = courses.some(course => 
          student.course_level?.toLowerCase().includes(course.toLowerCase())
        );
        
        // Check if any of the student's levels match any class level
        if (!student.course_level) return false;
        
        // Student levels might be comma-separated or single value
        const studentLevels = student.course_level.split(',').map(l => l.trim());
        const hasLevelMatch = studentLevels.some(studentLevel => 
          levels.some(classLevel => 
            studentLevel.toLowerCase().includes(classLevel.toLowerCase().replace('level ', ''))
          )
        );
        
        return programMatch && hasLevelMatch;
      });

      if (studentsToEnroll.length > 0) {
        // Check which students are not already enrolled
        const { data: existingEnrollments } = await supabase
          .from("class_students")
          .select("student_id")
          .eq("class_id", classId)
          .in("student_id", studentsToEnroll.map(s => s.id));

        const enrolledIds = new Set(existingEnrollments?.map(e => e.student_id) || []);
        
        const newEnrollments = studentsToEnroll
          .filter(s => !enrolledIds.has(s.id))
          .map(s => ({
            class_id: classId,
            student_id: s.id,
          }));

        if (newEnrollments.length > 0) {
          await supabase.from("class_students").insert(newEnrollments);
        }
      }
    } catch (error) {
      console.error("Error auto-enrolling students:", error);
      // Don't fail the class creation if auto-enrollment fails
    }
  };

  const resetForm = () => {
    setSelectedTeacher("");
    setClassName("");
    setTiming("");
    setSelectedCourses([]);
    setSelectedLevels([]);
    setSelectedBranch("");
    setStartDate("");
    setEditingClass(null);
  };

  const handleEditClass = (cls: ExistingClass) => {
    setEditingClass(cls.id);
    setClassName(cls.class_name);
    setSelectedCourses(cls.courses);
    setSelectedLevels(cls.levels);
    setTiming(cls.timing);
    setSelectedTeacher(cls.teacher_id);
  };

  const handleCancelEdit = () => {
    setEditingClass(null);
    resetForm();
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;

    if (!className.trim() || selectedCourses.length === 0 || selectedLevels.length === 0 || !timing.trim() || !selectedTeacher) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Update class
      const { error: classError } = await supabase
        .from("classes")
        .update({
          class_name: className,
          courses: selectedCourses,
          levels: selectedLevels,
          timing: timing,
          teacher_id: selectedTeacher,
        })
        .eq("id", editingClass);

      if (classError) throw classError;

      toast.success("Class updated successfully!");
      resetForm();
      fetchExistingClasses();
    } catch (error) {
      console.error("Error updating class:", error);
      toast.error("Failed to update class");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      const { error } = await supabase.from("classes").delete().eq("id", classId);

      if (error) throw error;

      toast.success("Class deleted successfully!");
      fetchExistingClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class");
    }
  };

  const isLoading = fetchingData;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Classes</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">
                {editingClass ? "Edit Class" : "Create New Class"}
              </TabsTrigger>
              <TabsTrigger value="manage">Existing Classes</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 mt-4">
              {/* Class Name */}
              <div>
                <Label htmlFor="className">Class Name</Label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g., English Level 1 - Morning Group"
                />
              </div>

              {/* Branch */}
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.value}>
                        {branch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div>
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* Course (Multi-select) */}
              <div>
                <Label>Courses</Label>
                <MultiSelect
                  options={courseOptions}
                  selected={selectedCourses}
                  onChange={setSelectedCourses}
                  placeholder="Select courses..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select one or more courses for this class
                </p>
              </div>

              {/* Level (Multi-select) */}
              <div>
                <Label>Levels</Label>
                <MultiSelect
                  options={levelOptions}
                  selected={selectedLevels}
                  onChange={setSelectedLevels}
                  placeholder="Select levels..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select one or more levels for this class
                </p>
              </div>

              {/* Timing */}
              <div>
                <Label htmlFor="timing">Timing</Label>
                <Select value={timing} onValueChange={setTiming}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timing" />
                  </SelectTrigger>
                  <SelectContent>
                    {timingOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Teacher */}
              <div>
                <Label htmlFor="teacher">Select Teacher (Optional)</Label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a teacher (optional)" />
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => editingClass ? handleCancelEdit() : onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={editingClass ? handleUpdateClass : handleCreateClass} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingClass ? "Update Class" : "Create Class"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manage" className="space-y-4 mt-4">
              {existingClasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No classes created yet
                </div>
              ) : (
                <div className="space-y-3">
                  {existingClasses.map((cls) => (
                    <Card key={cls.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{cls.class_name}</h3>
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p><span className="font-medium">Courses:</span> {cls.courses.join(", ") || "None"}</p>
                              <p><span className="font-medium">Levels:</span> {cls.levels.join(", ") || "None"}</p>
                              <p><span className="font-medium">Timing:</span> {cls.timing}</p>
                              <p><span className="font-medium">Teacher:</span> {cls.teacher_name}</p>
                              <p><span className="font-medium">Students:</span> {cls.student_count}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClass(cls)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClass(cls.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
