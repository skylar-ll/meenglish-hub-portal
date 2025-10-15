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
        await supabase.from('user_roles').insert({ user_id: session.user.id, role: 'teacher' });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2">
      <Card className="w-full max-w-[98vw] max-h-[95vh] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">{t('teacher.markAttendance')}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Weekly attendance records (Sunday - Thursday)
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm" disabled={attendanceData.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
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
          <>
            <ScrollArea className="flex-1 w-full">
              <div className="min-w-max">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead rowSpan={2} className="sticky left-0 bg-background z-20 border-r-2 min-w-[180px]">
                        <div className="font-bold text-center">STUDENTS' NAMES</div>
                      </TableHead>
                      <TableHead rowSpan={2} className="border-r-2 min-w-[120px]">
                        <div className="font-bold text-center">PHONE NUMBER</div>
                      </TableHead>
                      {Array.from({ length: maxWeek }, (_, i) => i + 1).map(weekNum => (
                        <TableHead 
                          key={`week-${weekNum}`} 
                          colSpan={6} 
                          className={`text-center border-r-2 ${getCellBgColor(weekNum)}`}
                        >
                          <div className="font-bold">Week {weekNum}</div>
                        </TableHead>
                      ))}
                      <TableHead rowSpan={2} className="border-l-2 border-r-2 min-w-[80px]">
                        <div className="font-bold text-center">OVERALL TOTAL</div>
                      </TableHead>
                      <TableHead rowSpan={2} className="border-r-2 min-w-[100px]">
                        <div className="font-bold text-center">TEACHER'S EVALUATION</div>
                      </TableHead>
                      <TableHead rowSpan={2} className="border-r-2 min-w-[100px]">
                        <div className="font-bold text-center">FINAL GRADES</div>
                      </TableHead>
                      <TableHead rowSpan={2} className="border-r-2 min-w-[100px]">
                        <div className="font-bold text-center">EQUIVALENT</div>
                      </TableHead>
                      <TableHead rowSpan={2} className="border-r-2 min-w-[120px] bg-primary/10">
                        <div className="font-bold text-center">TODAY'S STATUS</div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      {Array.from({ length: maxWeek }, (_, i) => i + 1).map(weekNum => (
                        <>
                          {weekDays.map(day => (
                            <TableHead 
                              key={`${weekNum}-${day}-header`} 
                              className={`text-center p-1 text-xs ${getCellBgColor(weekNum)}`}
                            >
                              {day}
                            </TableHead>
                          ))}
                          <TableHead 
                            key={`${weekNum}-total-header`}
                            className={`text-center p-1 text-xs font-bold border-r-2 ${getCellBgColor(weekNum)}`}
                          >
                            WE
                          </TableHead>
                        </>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData.map((student, index) => {
                      // Determine the background color for the row based on the current week
                      const currentDate = new Date();
                      const startOfWeek = new Date(currentDate);
                      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                      const currentWeekKey = startOfWeek.toISOString().split('T')[0];
                      
                      // Find the current week number
                      let currentWeekNum = 1;
                      for (let w = 1; w <= maxWeek; w++) {
                        // Check if any attendance record exists for this week
                        const hasRecordInWeek = Object.keys(student.weeks[w] || {}).length > 0;
                        if (hasRecordInWeek) {
                          currentWeekNum = w;
                        }
                      }
                      
                      return (
                        <TableRow key={student.student_id}>
                          <TableCell className="sticky left-0 bg-background z-10 border-r-2 p-2">
                            <div className="text-xs">
                              <p className="font-medium">{student.full_name_en}</p>
                            </div>
                          </TableCell>
                          <TableCell className="border-r-2 text-xs p-1 text-center">
                            {student.phone1}
                          </TableCell>
                          {Array.from({ length: maxWeek }, (_, i) => i + 1).map(weekNum => (
                            <>
                              {weekDays.map(day => {
                                const status = student.weeks[weekNum]?.[day] || '';
                                return (
                                  <TableCell 
                                    key={`${weekNum}-${day}`} 
                                    className={`text-center p-1 ${getCellBgColor(weekNum)}`}
                                  >
                                    <span className={status ? getStatusColor(status) : 'text-muted-foreground text-xs'}>
                                      {status || '-'}
                                    </span>
                                  </TableCell>
                                );
                              })}
                              <TableCell 
                                key={`${weekNum}-total`}
                                className={`text-center p-1 font-bold border-r-2 ${getCellBgColor(weekNum)}`}
                              >
                                {student.weekTotals[weekNum] || 0}
                              </TableCell>
                            </>
                          ))}
                          <TableCell className="text-center font-bold border-l-2 border-r-2 p-1">
                            {student.overallTotal}
                          </TableCell>
                          <TableCell className="text-center border-r-2 p-1">
                            <Badge 
                              variant={student.attendancePercentage >= 80 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {student.attendancePercentage}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center border-r-2 p-1 text-xs font-semibold">
                            {student.attendancePercentage >= 90 ? 'A+' :
                             student.attendancePercentage >= 80 ? 'A' :
                             student.attendancePercentage >= 70 ? 'B+' :
                             student.attendancePercentage >= 60 ? 'B' : 'C'}
                          </TableCell>
                          <TableCell className="text-center border-r-2 p-1 text-xs">
                            {student.attendancePercentage >= 80 ? 'next level' : 'repeat'}
                          </TableCell>
                          <TableCell className="text-center border-r-2 p-1 bg-primary/5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAttendance(student.student_id)}
                              className={`h-8 px-2 ${getTodayStatusColor(student.todayStatus)}`}
                            >
                              {getTodayStatusText(student.todayStatus)}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>

            <div className="mt-3 flex gap-3">
              <Button onClick={handleSave} className="flex-1" disabled={loading}>
                <Check className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Mark Attendance"}
              </Button>
              <Button onClick={onClose} variant="outline" className="flex-1" disabled={loading}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
