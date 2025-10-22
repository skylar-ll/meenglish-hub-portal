import { useState, useEffect } from "react";
import { X, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DayAttendance {
  [day: string]: string;
}

interface WeekAttendance {
  [weekNumber: number]: DayAttendance;
}

interface StudentAttendance {
  student_id: string;
  full_name_en: string;
  full_name_ar: string;
  phone1: string;
  program: string;
  weeks: WeekAttendance;
  weekTotals: { [weekNumber: number]: number };
  overallTotal: number;
  attendancePercentage: number;
  todayStatus: 'present' | 'absent' | 'late' | null;
}

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarkAttendanceModal = ({ isOpen, onClose }: MarkAttendanceModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [maxWeek, setMaxWeek] = useState(4);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAttendanceRecords();
    }
  }, [isOpen]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Auth required", description: "Please log in as a teacher.", variant: "destructive" });
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'teacher')
        .maybeSingle();

      if (!roleData) {
        toast({ title: "Unauthorized", description: "Teacher role must be assigned by admin.", variant: "destructive" });
        return;
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("full_name_en");

      if (studentsError) throw studentsError;

      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .order("date");

      if (attendanceError) throw attendanceError;

      const today = new Date().toISOString().split('T')[0];

      const weekMap = new Map<string, number>();
      const sortedRecords = [...(attendanceRecords || [])].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      sortedRecords.forEach(record => {
        const date = new Date(record.date);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const weekKey = startOfWeek.toISOString().split('T')[0];
        
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, weekMap.size + 1);
        }
      });

      const maxWeekNum = Math.max(...Array.from(weekMap.values()), 4);
      setMaxWeek(maxWeekNum);

      const processedData: StudentAttendance[] = (studentsData || []).map(student => {
        const studentRecords = attendanceRecords?.filter(r => r.student_id === student.id) || [];
        const todayRecord = studentRecords.find(r => r.date === today);
        
        const weeks: WeekAttendance = {};
        const weekTotals: { [weekNumber: number]: number } = {};
        let overallTotal = 0;

        studentRecords.forEach(record => {
          const date = new Date(record.date);
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          const weekKey = startOfWeek.toISOString().split('T')[0];
          const weekNum = weekMap.get(weekKey) || 1;
          
          if (!weeks[weekNum]) {
            weeks[weekNum] = {};
            weekTotals[weekNum] = 0;
          }
          
          const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
          
          let statusCode = 'A';
          if (record.status === 'present') {
            statusCode = 'P';
            weekTotals[weekNum]++;
            overallTotal++;
          } else if (record.status === 'late') {
            statusCode = 'L';
            weekTotals[weekNum]++;
            overallTotal++;
          } else if (record.status === 'absent') {
            statusCode = 'A';
          }
          
          weeks[weekNum][dayOfWeek] = statusCode;
        });

        const totalDays = studentRecords.length;
        const attendancePercentage = totalDays > 0 ? Math.round((overallTotal / totalDays) * 100) : 0;

        return {
          student_id: student.id,
          full_name_en: student.full_name_en,
          full_name_ar: student.full_name_ar,
          phone1: student.phone1,
          program: student.program,
          weeks,
          weekTotals,
          overallTotal,
          attendancePercentage,
          todayStatus: todayRecord ? (todayRecord.status as any) : null
        };
      });

      setAttendanceData(processedData);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendanceData(prev => prev.map(s => {
      if (s.student_id === studentId) {
        let newStatus: 'present' | 'absent' | 'late' | null;
        if (s.todayStatus === null) newStatus = 'present';
        else if (s.todayStatus === 'present') newStatus = 'late';
        else if (s.todayStatus === 'late') newStatus = 'absent';
        else newStatus = 'present';
        
        return { ...s, todayStatus: newStatus };
      }
      return s;
    }));
  };

  const toggleCellAttendance = (studentId: string, weekNum: number, day: string) => {
    if (!editMode) return;
    
    setAttendanceData(prev => prev.map(s => {
      if (s.student_id === studentId) {
        const currentStatus = s.weeks[weekNum]?.[day] || '';
        let newStatus = '';
        
        if (currentStatus === '') newStatus = 'P';
        else if (currentStatus === 'P') newStatus = 'L';
        else if (currentStatus === 'L') newStatus = 'A';
        else newStatus = 'P';
        
        const updatedWeeks = { ...s.weeks };
        if (!updatedWeeks[weekNum]) updatedWeeks[weekNum] = {};
        updatedWeeks[weekNum][day] = newStatus;
        
        // Recalculate week totals
        const weekTotals: { [weekNumber: number]: number } = {};
        let overallTotal = 0;
        
        Object.keys(updatedWeeks).forEach(wk => {
          const weekNumber = parseInt(wk);
          weekTotals[weekNumber] = 0;
          Object.values(updatedWeeks[weekNumber]).forEach(status => {
            if (status === 'P' || status === 'L') {
              weekTotals[weekNumber]++;
              overallTotal++;
            }
          });
        });
        
        const totalDays = Object.values(updatedWeeks).reduce((acc, week) => 
          acc + Object.keys(week).length, 0);
        const attendancePercentage = totalDays > 0 ? Math.round((overallTotal / totalDays) * 100) : 0;
        
        return { 
          ...s, 
          weeks: updatedWeeks,
          weekTotals,
          overallTotal,
          attendancePercentage
        };
      }
      return s;
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();
      
      const attendanceRecords = attendanceData
        .filter(s => s.todayStatus !== null)
        .map(student => ({
          student_id: student.student_id,
          date: today,
          status: student.todayStatus,
          marked_by: 'teacher',
          class_time: `${currentHour}:00`
        }));

      const { error } = await supabase
        .from("attendance")
        .upsert(attendanceRecords, { 
          onConflict: 'student_id,date,class_time',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: t('teacher.attendanceSaved'),
        description: `Attendance marked for ${attendanceRecords.length} students`,
      });
      onClose();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({
        title: "Error",
        description: "Failed to save attendance",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const headers = [
      "Student Name",
      "Phone Number",
      ...Array.from({ length: maxWeek }, (_, i) => 
        [...weekDays.map(day => `Week ${i + 1} - ${day}`), `Week ${i + 1} Total`]
      ).flat(),
      "Overall Total",
      "Attendance %"
    ];

    const rows = attendanceData.map(student => {
      const weekData: string[] = [];
      for (let w = 1; w <= maxWeek; w++) {
        weekDays.forEach(day => {
          weekData.push(student.weeks[w]?.[day] || '');
        });
        weekData.push(student.weekTotals[w]?.toString() || '0');
      }
      
      return [
        student.full_name_en,
        student.phone1,
        ...weekData,
        student.overallTotal.toString(),
        `${student.attendancePercentage}%`
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-sheet-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Export Successful",
      description: "Attendance sheet exported to CSV"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'P': return 'bg-success/20 text-success font-bold';
      case 'A': return 'bg-destructive/20 text-destructive font-bold';
      case 'L': return 'bg-warning/20 text-warning font-bold';
      default: return 'text-muted-foreground';
    }
  };

  const getCellBgColor = (weekNum: number) => {
    const colors = ['bg-blue-50', 'bg-green-50', 'bg-red-50', 'bg-yellow-50'];
    return colors[(weekNum - 1) % colors.length];
  };

  const getTodayStatusColor = (status: 'present' | 'absent' | 'late' | null) => {
    if (!status) return 'text-muted-foreground';
    switch (status) {
      case 'present': return 'text-success font-bold';
      case 'absent': return 'text-destructive font-bold';
      case 'late': return 'text-warning font-bold';
      default: return 'text-muted-foreground';
    }
  };

  const getTodayStatusText = (status: 'present' | 'absent' | 'late' | null) => {
    if (!status) return '-';
    return status.charAt(0).toUpperCase();
  };

  if (!isOpen) return null;

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2">
      <Card className="w-full max-w-[98vw] h-[96vh] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-xl font-bold mb-0.5">{currentMonth}</h2>
            <p className="text-sm font-medium text-muted-foreground">{t('teacher.markAttendance')}</p>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span><span className="font-bold text-green-600">P</span>=Present</span>
              <span><span className="font-bold text-yellow-600">L</span>=Late</span>
              <span><span className="font-bold text-red-600">A</span>=Absent</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setEditMode(!editMode)} 
              variant={editMode ? "default" : "outline"} 
              size="sm"
            >
              {editMode ? "Editing" : "Edit Attendance"}
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm" disabled={attendanceData.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading attendance data...</div>
        ) : attendanceData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No students found
          </div>
        ) : (
          <div className="flex-1 overflow-hidden border rounded-md">
            <div className="overflow-auto h-full">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-background">
                    <th rowSpan={2} className="sticky left-0 bg-background border border-border p-2 font-bold text-center align-middle w-[200px] min-w-[200px] z-30">
                      STUDENTS'<br/>NAMES
                    </th>
                    <th rowSpan={2} className="sticky left-[200px] bg-background border border-border p-2 font-bold text-center align-middle w-[120px] min-w-[120px] z-30">
                      PHONE<br/>NUMBER
                    </th>
                    {Array.from({ length: maxWeek }, (_, i) => i + 1).map(weekNum => {
                      const weekColors = [
                        'bg-blue-100 dark:bg-blue-950',
                        'bg-green-100 dark:bg-green-950', 
                        'bg-red-100 dark:bg-red-950',
                        'bg-orange-100 dark:bg-orange-950'
                      ];
                      return (
                        <th 
                          key={`week-${weekNum}`} 
                          colSpan={6} 
                          className={`border border-border p-2 font-bold text-center ${weekColors[(weekNum - 1) % 4]}`}
                        >
                          Week {weekNum}
                        </th>
                      );
                    })}
                    <th rowSpan={2} className="border border-border p-2 font-bold text-center align-middle w-[80px] min-w-[80px]">
                      OVERALL<br/>WE
                    </th>
                    <th rowSpan={2} className="border border-border p-2 font-bold text-center align-middle w-[90px] min-w-[90px]">
                      TEACHER'S<br/>EVALUATION
                    </th>
                    <th rowSpan={2} className="border border-border p-2 font-bold text-center align-middle w-[80px] min-w-[80px]">
                      FINAL<br/>GRADES
                    </th>
                    <th rowSpan={2} className="border border-border p-2 font-bold text-center align-middle w-[90px] min-w-[90px]">
                      EQUIVALENT
                    </th>
                  </tr>
                  <tr className="bg-background">
                    {Array.from({ length: maxWeek }, (_, i) => i + 1).map(weekNum => {
                      const weekColors = [
                        'bg-blue-100 dark:bg-blue-950',
                        'bg-green-100 dark:bg-green-950',
                        'bg-red-100 dark:bg-red-950',
                        'bg-orange-100 dark:bg-orange-950'
                      ];
                      return (
                        <>
                          {weekDays.map(day => (
                            <th 
                              key={`${weekNum}-${day}`}
                              className={`border border-border p-1 font-semibold text-center w-[50px] min-w-[50px] ${weekColors[(weekNum - 1) % 4]}`}
                            >
                              {day}
                            </th>
                          ))}
                          <th 
                            key={`${weekNum}-we`}
                            className={`border border-border p-1 font-bold text-center w-[50px] min-w-[50px] ${weekColors[(weekNum - 1) % 4]}`}
                          >
                            WE
                          </th>
                        </>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((student, index) => (
                    <tr key={student.student_id} className="hover:bg-muted/20">
                      <td className="sticky left-0 bg-background border border-border p-2 text-xs z-20">
                        {student.full_name_en}
                      </td>
                      <td className="sticky left-[200px] bg-background border border-border p-2 text-xs text-center z-20">
                        {student.phone1}
                      </td>
                      {Array.from({ length: maxWeek }, (_, i) => i + 1).map(weekNum => {
                        const weekColors = [
                          'bg-blue-50 dark:bg-blue-950/30',
                          'bg-green-50 dark:bg-green-950/30',
                          'bg-red-50 dark:bg-red-950/30',
                          'bg-orange-50 dark:bg-orange-950/30'
                        ];
                        return (
                          <>
                            {weekDays.map(day => {
                              const status = student.weeks[weekNum]?.[day] || '';
                              const statusColors = {
                                'P': 'text-green-600 font-bold',
                                'L': 'text-yellow-600 font-bold',
                                'A': 'text-red-600 font-bold'
                              };
                              return (
                                <td 
                                  key={`${weekNum}-${day}`}
                                  className={`border border-border p-1 text-xs text-center ${weekColors[(weekNum - 1) % 4]} ${editMode ? 'cursor-pointer hover:brightness-95' : ''}`}
                                  onClick={() => toggleCellAttendance(student.student_id, weekNum, day)}
                                >
                                  <span className={status ? statusColors[status as keyof typeof statusColors] : ''}>
                                    {status || ''}
                                  </span>
                                </td>
                              );
                            })}
                            <td 
                              key={`${weekNum}-we`}
                              className={`border border-border p-1 text-xs text-center font-bold ${weekColors[(weekNum - 1) % 4]}`}
                            >
                              {student.weekTotals[weekNum] || 0}
                            </td>
                          </>
                        );
                      })}
                      <td className="border border-border p-1 text-xs text-center font-bold">
                        {student.overallTotal}
                      </td>
                      <td className="border border-border p-1 text-xs text-center">
                        {student.attendancePercentage}
                      </td>
                      <td className="border border-border p-1 text-xs text-center font-semibold">
                        {student.attendancePercentage >= 90 ? 'A+' :
                         student.attendancePercentage >= 80 ? 'A' :
                         student.attendancePercentage >= 70 ? 'B+' :
                         student.attendancePercentage >= 60 ? 'B' : 'C'}
                      </td>
                      <td className="border border-border p-1 text-xs text-center">
                        {student.attendancePercentage >= 80 ? 'next level' : 'repeat'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && attendanceData.length > 0 && (
          <div className="mt-3 flex gap-3 pt-3 border-t">
            <Button onClick={handleSave} className="flex-1" disabled={loading}>
              <Check className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Attendance"}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1" disabled={loading}>
              Cancel
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
