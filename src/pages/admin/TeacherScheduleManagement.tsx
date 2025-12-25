import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, AlertCircle, Check, X, RefreshCw } from "lucide-react";
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
import { format, parse, isValid, endOfMonth, eachDayOfInterval } from "date-fns";

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
  branch_id: string | null;
  teacher_id: string | null;
  status: string | null;
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
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedTime, setSelectedTime] = useState<string>("all");
  
  const today = format(new Date(), "yyyy-MM-dd");

  const normalizeTiming = (s: string) =>
    (s || "").toLowerCase().replace(/\s+/g, "").replace(/–/g, "-");

  const parseDateOnly = (value: string) => parse(value, "yyyy-MM-dd", new Date());

  const branchFilteredClasses = useMemo(() => {
    if (selectedBranchId === "all") return classes;
    return classes.filter((c) => c.branch_id === selectedBranchId);
  }, [classes, selectedBranchId]);

  // Build a list of ONLY the dates that actually exist in created classes
  // (based on class start_date → end_date, respecting the selected branch)
  const availableDatesCompact = useMemo(() => {
    const allDatesSet = new Set<string>();

    branchFilteredClasses.forEach((cls) => {
      if (!cls.start_date) return;

      const startDate = parseDateOnly(cls.start_date);
      const endDate = cls.end_date ? parseDateOnly(cls.end_date) : startDate;
      if (!isValid(startDate) || !isValid(endDate)) return;

      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      allDays.forEach((day) => {
        allDatesSet.add(format(day, "yyyy-MM-dd"));
      });
    });

    const sorted = Array.from(allDatesSet).sort();

    return sorted.map((dateStr) => {
      const date = parseDateOnly(dateStr);
      return {
        value: dateStr,
        label: format(date, "MMM d"), // e.g., "Jan 12", "Mar 15"
      };
    });
  }, [branchFilteredClasses]);

  const classesAfterBranchDate = useMemo(() => {
    let result = [...branchFilteredClasses];

    // Filter: classes that are active on the selected date (between start_date and end_date)
    if (selectedDate !== "all") {
      result = result.filter((c) => {
        if (!c.start_date) return false;
        const startDate = parseDateOnly(c.start_date);
        const endDate = c.end_date ? parseDateOnly(c.end_date) : startDate;
        const selectedDateObj = parseDateOnly(selectedDate);
        return selectedDateObj >= startDate && selectedDateObj <= endDate;
      });
    }

    return result;
  }, [branchFilteredClasses, selectedDate]);

  const availableTimes = useMemo(() => {
    const times = new Set<string>();
    classesAfterBranchDate.forEach((c) => {
      if (c.timing) times.add(c.timing);
    });
    return Array.from(times).sort();
  }, [classesAfterBranchDate]);

  // Final filtered classes (includes time filter)
  const filteredClasses = useMemo(() => {
    let result = [...classesAfterBranchDate];

    if (selectedTime !== "all") {
      const selected = normalizeTiming(selectedTime);
      result = result.filter((c) => normalizeTiming(c.timing) === selected);
    }

    return result;
  }, [classesAfterBranchDate, selectedTime]);

  // Reset date if it no longer exists for the current branch/classes
  useEffect(() => {
    if (selectedDate !== "all" && !availableDatesCompact.some((d) => d.value === selectedDate)) {
      setSelectedDate("all");
    }
  }, [availableDatesCompact, selectedDate]);

  // Reset time if it no longer exists for the current branch/month/date selection
  useEffect(() => {
    if (selectedTime !== "all" && !availableTimes.includes(selectedTime)) {
      setSelectedTime("all");
    }
  }, [availableTimes, selectedTime]);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("schedule-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classes" },
        () => {
          fetchClasses();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_class_status" },
        () => {
          fetchDailyStatus();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_removal_notifications" },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    // Fallback polling (in case realtime isn't available in the current environment)
    const poll = window.setInterval(() => {
      fetchClasses();
    }, 15000);

    return () => {
      window.clearInterval(poll);
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
      teacher_name: c.teachers?.full_name || "Unassigned",
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

  const teacherIds = useMemo(() => {
    return [...new Set(
      filteredClasses
        .map((c) => c.teacher_id)
        .filter((id): id is string => Boolean(id))
    )];
  }, [filteredClasses]);

  const unassignedClasses = useMemo(() => {
    return filteredClasses.filter((c) => !c.teacher_id);
  }, [filteredClasses]);


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
    setSelectedDate("all");
    setSelectedTime("all");
  };

  const shouldGroupByBranch = selectedBranchId === "all";


  const renderScheduleGrid = (tableClasses: ClassData[], opts?: { showTimeFilter?: boolean; showBranchColumn?: boolean }) => {
    const teacherIdsLocal = Array.from(
      new Set(
        tableClasses
          .map((c) => c.teacher_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const timingsLocal = Array.from(new Set(tableClasses.map((c) => c.timing).filter(Boolean))).sort();

    return (
      <div
        className="overflow-x-auto overflow-y-visible -webkit-overflow-scrolling-touch"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              {opts?.showBranchColumn && (
                <th className="p-2 text-left font-medium min-w-[100px] border-r bg-primary/10">
                  <span className="text-muted-foreground text-xs">Branch</span>
                </th>
              )}
              <th className="p-2 text-left font-medium min-w-[120px] border-r">
                <span className="text-muted-foreground text-xs">Start Date</span>
              </th>

              {teacherIdsLocal.map((teacherId) => {
                const teacherClasses = tableClasses.filter((c) => c.teacher_id === teacherId && c.start_date);
                const startDates = teacherClasses.map((c) => c.start_date!).sort();
                const earliestDate = startDates[0];

                return (
                  <th key={teacherId} className="p-2 text-center font-semibold min-w-[150px] border-r text-sm">
                    {earliestDate ? format(parseDateOnly(earliestDate), "MMM d, yyyy") : "N/A"}
                  </th>
                );
              })}
            </tr>

            <tr className="border-b bg-muted/30">
              {opts?.showBranchColumn && (
                <th className="p-3 text-left font-semibold min-w-[100px] border-r bg-primary/10">
                  <span className="text-muted-foreground text-xs">فرع</span>
                </th>
              )}
              <th className="p-3 text-left font-semibold min-w-[140px] border-r">
                <div className="flex flex-col gap-2">
                  <span className="text-muted-foreground text-xs">Time</span>

                  {opts?.showTimeFilter ? (
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All times" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">All Times</SelectItem>
                        {availableTimes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              </th>

              {teacherIdsLocal.map((teacherId) => {
                const teacherClasses = tableClasses.filter((c) => c.teacher_id === teacherId);
                const allCompleted = teacherClasses.length > 0 && teacherClasses.every((c) => isClassCompleted(c.id));
                const teacherName = teacherClasses[0]?.teacher_name || "Unknown";

                return (
                  <th
                    key={teacherId}
                    className={`p-3 text-center font-semibold min-w-[150px] border-r transition-colors ${
                      allCompleted ? "bg-green-500/20 text-green-700" : ""
                    }`}
                  >
                    {teacherName}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {timingsLocal.map((timing) => (
              <tr key={timing} className="border-b hover:bg-muted/20">
                {opts?.showBranchColumn && (
                  <td className="p-3 font-medium border-r bg-primary/5 text-xs">
                    {(() => {
                      const classAtTiming = tableClasses.find(
                        (c) => normalizeTiming(c.timing) === normalizeTiming(timing)
                      );
                      return classAtTiming ? (
                        <div className="flex flex-col">
                          <span className="font-semibold">{classAtTiming.branch_name}</span>
                          <span className="text-muted-foreground">{classAtTiming.branch_name_ar}</span>
                        </div>
                      ) : "-";
                    })()}
                  </td>
                )}
                <td className="p-3 font-medium border-r bg-muted/10">{timing}</td>

                {teacherIdsLocal.map((teacherId) => {
                  const classAtTiming = tableClasses.find(
                    (c) =>
                      normalizeTiming(c.timing) === normalizeTiming(timing) &&
                      c.teacher_id === teacherId
                  );

                  if (!classAtTiming) {
                    return <td key={teacherId} className="p-3 text-center border-r">-</td>;
                  }

                  const completed = isClassCompleted(classAtTiming.id);

                  return (
                    <td
                      key={teacherId}
                      className={`p-3 text-center border-r transition-colors ${
                        completed ? "bg-green-500/30" : "bg-yellow-500/10"
                      }`}
                    >
                      <div className="flex flex-col gap-1 items-center">
                        {/* Levels */}
                        <div className="flex flex-wrap gap-1 justify-center">
                          {classAtTiming.levels?.map((level, i) => {
                            const match = level.match(/\(([^)]+)\)/);
                            const shortName = match ? match[1] : level.split(" ")[0];
                            return (
                              <Badge
                                key={i}
                                variant={completed ? "default" : "secondary"}
                                className={`text-xs ${completed ? "bg-green-600 hover:bg-green-700" : ""}`}
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
                              const shortCourse = course.split(" ")[0];
                              return (
                                <span key={i} className="text-xs text-muted-foreground">
                                  {shortCourse}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Completion indicator */}
                        {completed && <Check className="w-4 h-4 text-green-600 mt-1" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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

        {/* Results Summary */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredClasses.length} of {classes.length} classes
        </div>

        {unassignedClasses.length > 0 && (
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Unassigned classes</h2>
                <p className="text-xs text-muted-foreground">
                  These are active classes from Class Management that don’t have a teacher yet.
                </p>
              </div>
              <Badge variant="secondary">{unassignedClasses.length}</Badge>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {unassignedClasses.map((c) => (
                <div key={c.id} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.class_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.branch_name} • {c.timing}
                      </p>
                    </div>
                    <Badge variant="outline">Unassigned</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

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

        {/* Schedule Table with Inline Filters */}
        <Card className="overflow-hidden">
          {/* Branch Header with Dropdown */}
          <div className="bg-primary p-4 text-primary-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="flex justify-center items-center gap-4 flex-wrap">
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="w-auto min-w-[250px] bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
                    <SelectValue>
                      {selectedBranchId === "all"
                        ? "All Branches / جميع الفروع"
                        : (() => {
                            const branch = branches.find((b) => b.id === selectedBranchId);
                            return branch
                              ? `${branch.name_ar} / ${branch.name_en}`
                              : "Select Branch";
                          })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches / جميع الفروع</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name_ar} / {branch.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  Clear
                </Button>
              </div>

              {/* Combined Date dropdown (Jan 12, Mar 15 format) */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-xs text-primary-foreground/80">Date</span>

                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="h-9 w-[160px] bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
                    <SelectValue placeholder="Select Date">
                      {selectedDate === "all" ? "All Dates" : availableDatesCompact.find(d => d.value === selectedDate)?.label || "All Dates"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Dates</SelectItem>
                    {availableDatesCompact.map((date) => (
                      <SelectItem key={date.value} value={date.value}>
                        {date.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>


            {branchesWithClasses.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No classes found matching the selected filters.</p>
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : shouldGroupByBranch ? (
              <div className="divide-y">
                {branchesWithClasses.map((branch) => {
                  const branchClasses = classesByBranch[branch.id] || [];

                  return (
                    <section key={branch.id}>
                      <div className="px-4 py-3 border-b bg-muted/40">
                        <h2 className="font-semibold">
                          {branch.name_ar} / {branch.name_en}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Showing {branchClasses.length} classes
                        </p>
                      </div>

                      {renderScheduleGrid(branchClasses, { showTimeFilter: false, showBranchColumn: false })}
                    </section>
                  );
                })}
              </div>
            ) : (
              renderScheduleGrid(filteredClasses, { showTimeFilter: true, showBranchColumn: selectedBranchId === "all" })
            )}

        </Card>

        {/* Empty State */}
        {classes.length === 0 && (
          <Card className="p-8 text-center mt-6">
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