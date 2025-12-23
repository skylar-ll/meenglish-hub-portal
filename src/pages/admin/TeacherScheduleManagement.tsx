import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, AlertCircle, Check, X, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parse, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";

interface Branch {
  id: string;
  name_en: string;
  name_ar: string;
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
  
  // Filter states
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  
  const today = format(new Date(), "yyyy-MM-dd");

  // Generate months for the dropdown (current year and next year)
  const availableMonths = useMemo(() => {
    const months = [];
    const currentDate = new Date();
    for (let i = -6; i <= 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy")
      });
    }
    return months;
  }, []);

  // Generate dates based on selected month or from all classes
  const availableDates = useMemo(() => {
    const dates: { value: string; label: string }[] = [];
    
    if (selectedMonth !== "all") {
      // Generate all days in the selected month
      const monthStart = parse(selectedMonth + "-01", "yyyy-MM-dd", new Date());
      const monthEnd = endOfMonth(monthStart);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      daysInMonth.forEach(date => {
        dates.push({
          value: format(date, "yyyy-MM-dd"),
          label: format(date, "EEEE, MMMM d, yyyy")
        });
      });
    } else {
      // Get unique dates from all classes (start_date and end_date)
      const uniqueDates = new Set<string>();
      classes.forEach(cls => {
        if (cls.start_date) uniqueDates.add(cls.start_date);
        if (cls.end_date) uniqueDates.add(cls.end_date);
      });
      
      Array.from(uniqueDates).sort().forEach(dateStr => {
        const date = parseISO(dateStr);
        if (isValid(date)) {
          dates.push({
            value: dateStr,
            label: format(date, "EEEE, MMMM d, yyyy")
          });
        }
      });
    }
    
    return dates;
  }, [selectedMonth, classes]);

  // Filter classes based on selected filters
  const filteredClasses = useMemo(() => {
    let result = [...classes];
    
    // Filter by branch
    if (selectedBranchId !== "all") {
      result = result.filter(c => c.branch_id === selectedBranchId);
    }
    
    // Filter by month
    if (selectedMonth !== "all") {
      result = result.filter(c => {
        if (!c.start_date && !c.end_date) return false;
        
        const monthStart = parse(selectedMonth + "-01", "yyyy-MM-dd", new Date());
        const monthEnd = endOfMonth(monthStart);
        
        // Check if class is active during the selected month
        const startDate = c.start_date ? parseISO(c.start_date) : null;
        const endDate = c.end_date ? parseISO(c.end_date) : null;
        
        // Class is active if it starts before month end AND (has no end date OR ends after month start)
        if (startDate && startDate <= monthEnd) {
          if (!endDate || endDate >= monthStart) {
            return true;
          }
        }
        return false;
      });
    }
    
    // Filter by specific date
    if (selectedDate !== "all") {
      const targetDate = parseISO(selectedDate);
      result = result.filter(c => {
        if (!c.start_date) return false;
        
        const startDate = parseISO(c.start_date);
        const endDate = c.end_date ? parseISO(c.end_date) : null;
        
        // Class is active on this date if start_date <= targetDate AND (no end_date OR end_date >= targetDate)
        if (startDate <= targetDate) {
          if (!endDate || endDate >= targetDate) {
            return true;
          }
        }
        return false;
      });
    }
    
    return result;
  }, [classes, selectedBranchId, selectedMonth, selectedDate]);

  // Reset date when month changes
  useEffect(() => {
    if (selectedMonth !== "all" && selectedDate !== "all") {
      // Check if selected date is in the selected month
      if (!selectedDate.startsWith(selectedMonth)) {
        setSelectedDate("all");
      }
    }
  }, [selectedMonth, selectedDate]);

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
    await supabase
      .from("schedule_removal_notifications")
      .update({ 
        status: "approved", 
        admin_approved: true,
        admin_approved_at: new Date().toISOString()
      })
      .eq("id", notification.id);

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

  // Group filtered classes by branch for display
  const classesByBranch = useMemo(() => {
    return branches.reduce((acc, branch) => {
      acc[branch.id] = filteredClasses.filter(c => c.branch_id === branch.id);
      return acc;
    }, {} as Record<string, ClassData[]>);
  }, [branches, filteredClasses]);

  // Get branches that have classes after filtering
  const branchesWithClasses = useMemo(() => {
    if (selectedBranchId !== "all") {
      return branches.filter(b => b.id === selectedBranchId);
    }
    return branches.filter(b => (classesByBranch[b.id] || []).length > 0);
  }, [branches, classesByBranch, selectedBranchId]);

  // Check if all classes for a teacher are completed today
  const areAllTeacherClassesCompleted = (branchId: string, teacherId: string): boolean => {
    const teacherClasses = filteredClasses.filter(
      c => c.branch_id === branchId && c.teacher_id === teacherId
    );
    if (teacherClasses.length === 0) return false;
    return teacherClasses.every(c => isClassCompleted(c.id));
  };

  const clearFilters = () => {
    setSelectedBranchId("all");
    setSelectedMonth("all");
    setSelectedDate("all");
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
          <Button variant="ghost" onClick={() => navigate("/admin/dashboard")} className="mb-4">
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

        {/* Filters Section */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Filters</h2>
            {(selectedBranchId !== "all" || selectedMonth !== "all" || selectedDate !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-muted-foreground">
                Clear All
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Branch Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Branch</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Branch" />
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

            {/* Month Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Specific Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Date" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Dates in Month</SelectItem>
                  {availableDates.map((date) => (
                    <SelectItem key={date.value} value={date.value}>
                      {date.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedBranchId !== "all" || selectedMonth !== "all" || selectedDate !== "all") && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedBranchId !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Branch: {branches.find(b => b.id === selectedBranchId)?.name_en}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBranchId("all")} />
                </Badge>
              )}
              {selectedMonth !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Month: {availableMonths.find(m => m.value === selectedMonth)?.label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedMonth("all")} />
                </Badge>
              )}
              {selectedDate !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Date: {format(parseISO(selectedDate), "MMM d, yyyy")}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDate("all")} />
                </Badge>
              )}
            </div>
          )}

          {/* Results Summary */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredClasses.length} of {classes.length} classes
          </div>
        </Card>

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
        {branchesWithClasses.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No classes found matching the selected filters.
            </p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear Filters
            </Button>
          </Card>
        ) : (
          branchesWithClasses.map((branch) => {
            const branchClasses = classesByBranch[branch.id] || [];
            if (branchClasses.length === 0) return null;

            // Get unique teachers and timings for this branch
            const teacherIds = [...new Set(branchClasses.map(c => c.teacher_id))];
            const timings = [...new Set(branchClasses.map(c => c.timing))].sort();

            // Get earliest start date for each teacher in this branch
            const getTeacherStartDate = (teacherId: string): string | null => {
              const teacherClasses = branchClasses.filter(c => c.teacher_id === teacherId && c.start_date);
              if (teacherClasses.length === 0) return null;
              const startDates = teacherClasses.map(c => c.start_date!).sort();
              return startDates[0];
            };

            return (
              <Card key={branch.id} className="mb-6 overflow-hidden">
                {/* Branch Header */}
                <div className="bg-primary p-4 text-primary-foreground">
                  <div className="flex justify-center">
                    <h2 className="font-bold text-xl">{branch.name_ar} / {branch.name_en}</h2>
                  </div>
                </div>

                {/* Schedule Table */}
                <div className="overflow-x-auto overflow-y-visible -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      {/* Start Date Row */}
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium min-w-[120px] border-r text-muted-foreground text-xs">
                          Start Date
                        </th>
                        {teacherIds.map((teacherId) => {
                          const startDate = getTeacherStartDate(teacherId);
                          return (
                            <th 
                              key={teacherId} 
                              className="p-2 text-center font-semibold min-w-[150px] border-r text-sm"
                            >
                              {startDate ? format(new Date(startDate), "MMM d, yyyy") : "N/A"}
                            </th>
                          );
                        })}
                      </tr>
                      {/* Teacher Names Row */}
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
              </Card>
            );
          })
        )}

        {/* Empty State */}
        {classes.length === 0 && (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No classes with assigned teachers found. Create classes and assign teachers in Class Management.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeacherScheduleManagement;