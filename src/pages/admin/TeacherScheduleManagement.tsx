import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Calendar, AlertCircle, Check, X, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Branch {
  id: string;
  name_en: string;
  name_ar: string;
}

interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

interface ScheduleEntry {
  id: string;
  branch_id: string;
  teacher_id: string;
  timing: string;
  levels: string[];
  courses: string[];
  start_date: string;
  end_date: string;
  status: string;
  teacher?: Teacher;
  branch?: Branch;
}

interface RemovalNotification {
  id: string;
  schedule_id: string;
  teacher_id: string;
  branch_id: string;
  end_date: string;
  status: string;
  schedule?: ScheduleEntry;
  teacher?: Teacher;
  branch?: Branch;
}

const TeacherScheduleManagement = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [notifications, setNotifications] = useState<RemovalNotification[]>([]);
  const [timings, setTimings] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEntry | null>(null);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    branch_id: "",
    teacher_id: "",
    timing: "",
    levels: [] as string[],
    courses: [] as string[],
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
  });

  useEffect(() => {
    fetchData();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_branch_schedules' }, () => {
        fetchSchedules();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_removal_notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchBranches(),
      fetchTeachers(),
      fetchSchedules(),
      fetchNotifications(),
      fetchTimings(),
      fetchLevels(),
      fetchCourses(),
    ]);
    setLoading(false);
  };

  const fetchBranches = async () => {
    const { data } = await supabase.from("branches").select("*").order("name_en");
    setBranches(data || []);
  };

  const fetchTeachers = async () => {
    const { data } = await supabase.from("teachers").select("id, full_name, email").order("full_name");
    setTeachers(data || []);
  };

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from("teacher_branch_schedules")
      .select("*")
      .order("start_date", { ascending: false });
    
    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }
    
    setSchedules(data || []);
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("schedule_removal_notifications")
      .select("*")
      .eq("status", "pending")
      .order("end_date");
    setNotifications(data || []);
  };

  const fetchTimings = async () => {
    const { data } = await supabase
      .from("form_configurations")
      .select("config_value")
      .eq("config_type", "timing")
      .eq("is_active", true);
    setTimings(data?.map(t => t.config_value) || []);
  };

  const fetchLevels = async () => {
    const { data } = await supabase
      .from("form_configurations")
      .select("config_value")
      .eq("config_type", "level")
      .eq("is_active", true)
      .order("display_order");
    setLevels(data?.map(l => l.config_value) || []);
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from("form_configurations")
      .select("config_value")
      .eq("config_type", "course")
      .eq("is_active", true);
    setCourses(data?.map(c => c.config_value) || []);
  };

  const handleAddSchedule = async () => {
    if (!formData.branch_id || !formData.teacher_id || !formData.timing || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase.from("teacher_branch_schedules").insert({
      branch_id: formData.branch_id,
      teacher_id: formData.teacher_id,
      timing: formData.timing,
      levels: formData.levels,
      courses: formData.courses,
      start_date: formData.start_date,
      end_date: formData.end_date,
      status: "active",
    });

    if (error) {
      toast.error("Failed to add schedule: " + error.message);
      return;
    }

    toast.success("Schedule added successfully");
    setIsAddModalOpen(false);
    resetForm();
    fetchSchedules();
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    const { error } = await supabase
      .from("teacher_branch_schedules")
      .update({
        branch_id: formData.branch_id,
        teacher_id: formData.teacher_id,
        timing: formData.timing,
        levels: formData.levels,
        courses: formData.courses,
        start_date: formData.start_date,
        end_date: formData.end_date,
      })
      .eq("id", editingSchedule.id);

    if (error) {
      toast.error("Failed to update schedule: " + error.message);
      return;
    }

    toast.success("Schedule updated successfully");
    setEditingSchedule(null);
    resetForm();
    fetchSchedules();
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    const { error } = await supabase.from("teacher_branch_schedules").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete schedule");
      return;
    }
    toast.success("Schedule deleted");
    fetchSchedules();
  };

  const handleApproveRemoval = async (notification: RemovalNotification) => {
    // Update notification status
    await supabase
      .from("schedule_removal_notifications")
      .update({ 
        status: "approved", 
        admin_approved: true,
        admin_approved_at: new Date().toISOString()
      })
      .eq("id", notification.id);

    // Update schedule status to completed
    await supabase
      .from("teacher_branch_schedules")
      .update({ status: "completed" })
      .eq("id", notification.schedule_id);

    toast.success("Teacher removal approved");
    fetchNotifications();
    fetchSchedules();
  };

  const handleRejectRemoval = async (notification: RemovalNotification) => {
    await supabase
      .from("schedule_removal_notifications")
      .update({ status: "rejected", admin_approved: false })
      .eq("id", notification.id);

    toast.success("Removal rejected - teacher will remain active");
    fetchNotifications();
  };

  const resetForm = () => {
    setFormData({
      branch_id: "",
      teacher_id: "",
      timing: "",
      levels: [],
      courses: [],
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
    });
  };

  const openEditModal = (schedule: ScheduleEntry) => {
    setEditingSchedule(schedule);
    setFormData({
      branch_id: schedule.branch_id,
      teacher_id: schedule.teacher_id,
      timing: schedule.timing,
      levels: schedule.levels || [],
      courses: schedule.courses || [],
      start_date: schedule.start_date,
      end_date: schedule.end_date,
    });
  };

  const getTeacherName = (teacherId: string) => {
    return teachers.find(t => t.id === teacherId)?.full_name || "Unknown";
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? `${branch.name_en} / ${branch.name_ar}` : "Unknown";
  };

  const filteredSchedules = selectedBranch === "all" 
    ? schedules 
    : schedules.filter(s => s.branch_id === selectedBranch);

  // Group schedules by branch and date range
  const groupedSchedules = filteredSchedules.reduce((acc, schedule) => {
    const key = `${schedule.branch_id}-${schedule.start_date}-${schedule.end_date}`;
    if (!acc[key]) {
      acc[key] = {
        branch_id: schedule.branch_id,
        start_date: schedule.start_date,
        end_date: schedule.end_date,
        schedules: [],
      };
    }
    acc[key].schedules.push(schedule);
    return acc;
  }, {} as Record<string, { branch_id: string; start_date: string; end_date: string; schedules: ScheduleEntry[] }>);

  // Get unique timings from current schedules for display
  const uniqueTimings = [...new Set(filteredSchedules.map(s => s.timing))].sort();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Teacher Schedule Management
              </h1>
              <p className="text-muted-foreground">
                Manage teacher assignments by branch, timing, and course period
              </p>
            </div>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Schedule</DialogTitle>
                </DialogHeader>
                <ScheduleForm
                  formData={formData}
                  setFormData={setFormData}
                  branches={branches}
                  teachers={teachers}
                  timings={timings}
                  levels={levels}
                  courses={courses}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSchedule}>Add Schedule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Pending Notifications */}
        {notifications.length > 0 && (
          <Card className="p-6 mb-6 border-warning bg-warning/10">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-warning" />
              <h2 className="text-lg font-semibold">Pending Removal Approvals</h2>
              <Badge variant="secondary">{notifications.length}</Badge>
            </div>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium">{getTeacherName(notification.teacher_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      {getBranchName(notification.branch_id)} - Ended: {format(new Date(notification.end_date), "PPP")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRejectRemoval(notification)}>
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => handleApproveRemoval(notification)}>
                      <Check className="w-4 h-4 mr-1" />
                      Approve Removal
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Filter */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <Label>Filter by Branch:</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name_en} / {branch.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Schedule Grid */}
        {Object.values(groupedSchedules).length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No schedules found. Add a new schedule to get started.</p>
          </Card>
        ) : (
          Object.values(groupedSchedules).map((group, groupIndex) => (
            <Card key={groupIndex} className="mb-6 overflow-hidden">
              {/* Group Header */}
              <div className="bg-primary/10 p-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{getBranchName(group.branch_id)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(group.start_date), "yyyy-MM-dd")} → {format(new Date(group.end_date), "yyyy-MM-dd")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule Table */}
              <ScrollArea className="w-full">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium min-w-[120px]">Time</th>
                        {[...new Set(group.schedules.map(s => s.teacher_id))].map((teacherId) => (
                          <th key={teacherId} className="p-3 text-center font-medium min-w-[150px]">
                            {getTeacherName(teacherId)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...new Set(group.schedules.map(s => s.timing))].sort().map((timing) => (
                        <tr key={timing} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{timing}</td>
                          {[...new Set(group.schedules.map(s => s.teacher_id))].map((teacherId) => {
                            const schedule = group.schedules.find(
                              s => s.timing === timing && s.teacher_id === teacherId
                            );
                            return (
                              <td key={teacherId} className="p-3 text-center">
                                {schedule ? (
                                  <div className="flex flex-col gap-1 items-center">
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {schedule.levels?.map((level, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {level}
                                        </Badge>
                                      ))}
                                    </div>
                                    {schedule.courses?.length > 0 && (
                                      <div className="flex flex-wrap gap-1 justify-center">
                                        {schedule.courses.map((course, i) => (
                                          <Badge key={i} variant="outline" className="text-xs">
                                            {course}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    <div className="flex gap-1 mt-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => openEditModal(schedule)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-destructive"
                                        onClick={() => handleDeleteSchedule(schedule.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </Card>
          ))
        )}

        {/* Edit Modal */}
        <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Schedule</DialogTitle>
            </DialogHeader>
            <ScheduleForm
              formData={formData}
              setFormData={setFormData}
              branches={branches}
              teachers={teachers}
              timings={timings}
              levels={levels}
              courses={courses}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSchedule(null)}>Cancel</Button>
              <Button onClick={handleUpdateSchedule}>Update Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Schedule Form Component
interface ScheduleFormData {
  branch_id: string;
  teacher_id: string;
  timing: string;
  levels: string[];
  courses: string[];
  start_date: string;
  end_date: string;
}

interface ScheduleFormProps {
  formData: ScheduleFormData;
  setFormData: React.Dispatch<React.SetStateAction<ScheduleFormData>>;
  branches: Branch[];
  teachers: Teacher[];
  timings: string[];
  levels: string[];
  courses: string[];
}

const ScheduleForm = ({ formData, setFormData, branches, teachers, timings, levels, courses }: ScheduleFormProps) => {
  const toggleLevel = (level: string) => {
    setFormData(prev => ({
      ...prev,
      levels: prev.levels.includes(level)
        ? prev.levels.filter(l => l !== level)
        : [...prev.levels, level]
    }));
  };

  const toggleCourse = (course: string) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.includes(course)
        ? prev.courses.filter(c => c !== course)
        : [...prev.courses, course]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Branch *</Label>
          <Select value={formData.branch_id} onValueChange={(v) => setFormData(prev => ({ ...prev, branch_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select branch" />
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

        <div className="space-y-2">
          <Label>Teacher *</Label>
          <Select value={formData.teacher_id} onValueChange={(v) => setFormData(prev => ({ ...prev, teacher_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select teacher" />
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
      </div>

      <div className="space-y-2">
        <Label>Timing *</Label>
        <Select value={formData.timing} onValueChange={(v) => setFormData(prev => ({ ...prev, timing: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select timing" />
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Levels</Label>
        <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
          {levels.map((level) => (
            <div key={level} className="flex items-center space-x-2">
              <Checkbox
                id={`level-${level}`}
                checked={formData.levels.includes(level)}
                onCheckedChange={() => toggleLevel(level)}
              />
              <label htmlFor={`level-${level}`} className="text-sm cursor-pointer">
                {level}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Courses</Label>
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
          {courses.map((course) => (
            <div key={course} className="flex items-center space-x-2">
              <Checkbox
                id={`course-${course}`}
                checked={formData.courses.includes(course)}
                onCheckedChange={() => toggleCourse(course)}
              />
              <label htmlFor={`course-${course}`} className="text-sm cursor-pointer">
                {course}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherScheduleManagement;
