import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, AlertCircle, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
}

interface ClassData {
  id: string;
  class_name: string;
  timing: string;
  levels: string[];
  courses: string[];
  start_date: string | null;
  end_date: string | null;
  branch_id: string;
  teacher_id: string;
  status: string;
  teacher_name: string;
  branch_name: string;
  branch_name_ar: string;
}

interface DailyStatus {
  class_id: string;
  is_completed: boolean;
}

interface RemovalNotification {
  id: string;
  schedule_id: string;
  teacher_id: string;
  branch_id: string;
  end_date: string;
  status: string;
  teacher_name?: string;
  branch_name?: string;
}

const TeacherScheduleManagement = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus[]>([]);
  const [notifications, setNotifications] = useState<RemovalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchData();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
        fetchClasses();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_class_status' }, () => {
        fetchDailyStatus();
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
      fetchClasses(),
      fetchDailyStatus(),
      fetchNotifications(),
    ]);
    setLoading(false);
  };

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("*")
      .order("name_en");
    setBranches(data || []);
  };

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select(`
        id,
        class_name,
        timing,
        levels,
        courses,
        start_date,
        end_date,
        branch_id,
        teacher_id,
        status,
        teachers!classes_teacher_id_fkey (full_name),
        branches!classes_branch_id_fkey (name_en, name_ar)
      `)
      .not("teacher_id", "is", null)
      .eq("status", "active")
      .order("timing");

    if (error) {
      console.error("Error fetching classes:", error);
      return;
    }

    const formattedClasses: ClassData[] = (data || []).map((c: any) => ({
      id: c.id,
      class_name: c.class_name,
      timing: c.timing,
      levels: c.levels || [],
      courses: c.courses || [],
      start_date: c.start_date,
      end_date: c.end_date,
      branch_id: c.branch_id,
      teacher_id: c.teacher_id,
      status: c.status,
      teacher_name: c.teachers?.full_name || "Unknown",
      branch_name: c.branches?.name_en || "Unknown",
      branch_name_ar: c.branches?.name_ar || "",
    }));

    setClasses(formattedClasses);
  };

  const fetchDailyStatus = async () => {
    const { data } = await supabase
      .from("daily_class_status")
      .select("class_id, is_completed")
      .eq("date", today);
    setDailyStatus(data || []);
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("schedule_removal_notifications")
      .select("*")
      .eq("status", "pending")
      .order("end_date");
    setNotifications(data || []);
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
    fetchClasses();
  };

  const handleRejectRemoval = async (notification: RemovalNotification) => {
    await supabase
      .from("schedule_removal_notifications")
      .update({ status: "rejected", admin_approved: false })
      .eq("id", notification.id);

    toast.success("Removal rejected - teacher will remain active");
    fetchNotifications();
  };

  const isClassCompleted = (classId: string): boolean => {
    return dailyStatus.some(s => s.class_id === classId && s.is_completed);
  };

  const getTeacherName = (teacherId: string) => {
    const cls = classes.find(c => c.teacher_id === teacherId);
    return cls?.teacher_name || "Unknown";
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? `${branch.name_en} / ${branch.name_ar}` : "Unknown";
  };

  // Group classes by branch
  const classesByBranch = branches.reduce((acc, branch) => {
    acc[branch.id] = classes.filter(c => c.branch_id === branch.id);
    return acc;
  }, {} as Record<string, ClassData[]>);

  // Check if all classes for a teacher are completed today
  const areAllTeacherClassesCompleted = (branchId: string, teacherId: string): boolean => {
    const teacherClasses = classes.filter(
      c => c.branch_id === branchId && c.teacher_id === teacherId
    );
    if (teacherClasses.length === 0) return false;
    return teacherClasses.every(c => isClassCompleted(c.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
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
              <p className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Today: {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
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
                      {getBranchName(notification.branch_id)} - Course Ended: {notification.end_date}
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

        {/* Branch Tables */}
        {branches.map((branch) => {
          const branchClasses = classesByBranch[branch.id] || [];
          if (branchClasses.length === 0) return null;

          // Get unique teachers and timings for this branch
          const teacherIds = [...new Set(branchClasses.map(c => c.teacher_id))];
          const timings = [...new Set(branchClasses.map(c => c.timing))].sort();

          return (
            <Card key={branch.id} className="mb-6 overflow-hidden">
              {/* Branch Header */}
              <div className="bg-primary p-4 text-primary-foreground">
                <h3 className="font-bold text-xl text-center">
                  {branch.name_ar} / {branch.name_en}
                </h3>
              </div>

              {/* Date Header */}
              <div className="bg-muted/50 p-3 text-center border-b">
                <span className="font-semibold text-lg">{today}</span>
              </div>

              {/* Schedule Table */}
              <ScrollArea className="w-full">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="p-3 text-left font-semibold min-w-[120px] border-r">
                          Time
                        </th>
                        {teacherIds.map((teacherId) => {
                          const allCompleted = areAllTeacherClassesCompleted(branch.id, teacherId);
                          const teacherName = branchClasses.find(c => c.teacher_id === teacherId)?.teacher_name || "Unknown";
                          return (
                            <th 
                              key={teacherId} 
                              className={`p-3 text-center font-semibold min-w-[150px] border-r transition-colors ${
                                allCompleted ? 'bg-green-500/20 text-green-700' : ''
                              }`}
                            >
                              {teacherName}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {timings.map((timing) => (
                        <tr key={timing} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium border-r bg-muted/10">{timing}</td>
                          {teacherIds.map((teacherId) => {
                            const classAtTiming = branchClasses.find(
                              c => c.timing === timing && c.teacher_id === teacherId
                            );
                            
                            if (!classAtTiming) {
                              return <td key={teacherId} className="p-3 text-center border-r">-</td>;
                            }

                            const completed = isClassCompleted(classAtTiming.id);
                            
                            return (
                              <td 
                                key={teacherId} 
                                className={`p-3 text-center border-r transition-colors ${
                                  completed ? 'bg-green-500/30' : 'bg-yellow-500/10'
                                }`}
                              >
                                <div className="flex flex-col gap-1 items-center">
                                  {/* Levels */}
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    {classAtTiming.levels?.map((level, i) => {
                                      // Extract short level name (e.g., "pre1" from "level-1 (pre1) مستوى اول")
                                      const match = level.match(/\(([^)]+)\)/);
                                      const shortName = match ? match[1] : level.split(' ')[0];
                                      return (
                                        <Badge 
                                          key={i} 
                                          variant={completed ? "default" : "secondary"} 
                                          className={`text-xs ${completed ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                        >
                                          {shortName}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                  
                                  {/* Courses */}
                                  {classAtTiming.courses?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {classAtTiming.courses.map((course, i) => {
                                        const shortCourse = course.split(' ')[0];
                                        return (
                                          <span key={i} className="text-xs text-muted-foreground">
                                            {shortCourse}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Completion indicator */}
                                  {completed && (
                                    <Check className="w-4 h-4 text-green-600 mt-1" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>

              {/* Date Range Info */}
              <div className="p-3 bg-muted/20 border-t text-center text-sm text-muted-foreground">
                {(() => {
                  const startDates = branchClasses.filter(c => c.start_date).map(c => c.start_date);
                  const endDates = branchClasses.filter(c => c.end_date).map(c => c.end_date);
                  const minStart = startDates.length > 0 ? startDates.sort()[0] : null;
                  const maxEnd = endDates.length > 0 ? endDates.sort().reverse()[0] : null;
                  
                  if (minStart || maxEnd) {
                    return (
                      <span>
                        Course Period: {minStart || 'N/A'} → {maxEnd || 'Ongoing'}
                      </span>
                    );
                  }
                  return <span>No date range set</span>;
                })()}
              </div>
            </Card>
          );
        })}

        {/* Empty State */}
        {classes.length === 0 && (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No classes with assigned teachers found. Add classes in the Class Management page.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/admin/classes")}
            >
              Go to Class Management
            </Button>
          </Card>
        )}

        {/* Legend */}
        <Card className="p-4 mt-6">
          <h4 className="font-semibold mb-3">Legend</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500/30 rounded" />
              <span>Class pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/30 rounded" />
              <span>Class completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/20 rounded border border-green-500" />
              <span>All teacher classes done for today</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherScheduleManagement;
