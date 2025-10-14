import { useState, useEffect } from "react";
import { X, Calendar, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
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

interface AttendanceRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StudentAttendance {
  student_id: string;
  full_name_en: string;
  full_name_ar: string;
  phone1: string;
  program: string;
  weeks: {
    [weekNumber: number]: {
      [day: string]: string; // 'P', 'A', 'L', etc.
    };
  };
  totalPresent: number;
  totalAbsent: number;
  attendancePercentage: number;
}

export const AttendanceRecordsModal = ({ isOpen, onClose }: AttendanceRecordsModalProps) => {
  const { toast } = useToast();
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [maxWeek, setMaxWeek] = useState(4);

  useEffect(() => {
    if (isOpen) {
      fetchAttendanceRecords();
    }
  }, [isOpen]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("full_name_en");

      if (studentsError) throw studentsError;

      // Fetch all attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .order("date");

      if (attendanceError) throw attendanceError;

      // Find the maximum week number
      const maxWeekNum = Math.max(
        ...(attendanceRecords?.map(r => r.week_number || 0) || [0]),
        4
      );
      setMaxWeek(maxWeekNum);

      // Process data into structured format
      const processedData: StudentAttendance[] = (studentsData || []).map(student => {
        const studentRecords = attendanceRecords?.filter(r => r.student_id === student.id) || [];
        
        const weeks: { [weekNumber: number]: { [day: string]: string } } = {};
        let totalPresent = 0;
        let totalAbsent = 0;

        studentRecords.forEach(record => {
          const weekNum = record.week_number || 1;
          if (!weeks[weekNum]) {
            weeks[weekNum] = {};
          }
          
          const dayOfWeek = new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' });
          
          // Map status to letter code
          let statusCode = 'A'; // Default absent
          if (record.status === 'present') {
            statusCode = 'P';
            totalPresent++;
          } else if (record.status === 'late') {
            statusCode = 'L';
            totalPresent++; // Count late as present for percentage
          } else if (record.status === 'absent') {
            statusCode = 'A';
            totalAbsent++;
          }
          
          weeks[weekNum][dayOfWeek] = statusCode;
        });

        const totalRecords = totalPresent + totalAbsent;
        const attendancePercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

        return {
          student_id: student.id,
          full_name_en: student.full_name_en,
          full_name_ar: student.full_name_ar,
          phone1: student.phone1,
          program: student.program,
          weeks,
          totalPresent,
          totalAbsent,
          attendancePercentage
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

  const exportToCSV = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const headers = [
      "Student Name",
      "Phone",
      "Program",
      ...Array.from({ length: maxWeek }, (_, i) => 
        weekDays.map(day => `Week ${i + 1} ${day}`)
      ).flat(),
      "Total Present",
      "Total Absent", 
      "Attendance %"
    ];

    const rows = attendanceData.map(student => {
      const weekData: string[] = [];
      for (let w = 1; w <= maxWeek; w++) {
        weekDays.forEach(day => {
          weekData.push(student.weeks[w]?.[day] || '-');
        });
      }
      
      return [
        student.full_name_en,
        student.phone1,
        student.program,
        ...weekData,
        student.totalPresent.toString(),
        student.totalAbsent.toString(),
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
      case 'P': return 'text-success font-semibold';
      case 'A': return 'text-destructive font-semibold';
      case 'L': return 'text-warning font-semibold';
      default: return 'text-muted-foreground';
    }
  };

  if (!isOpen) return null;

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const visibleWeeks = [currentWeek];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-[95vw] max-h-[90vh] m-4 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Attendance Sheet</h2>
            <p className="text-sm text-muted-foreground mt-1">
              View-only attendance records for all students
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
            No attendance records found
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Total Students: {attendanceData.length}</Badge>
                <Badge variant="outline">
                  Avg Attendance: {Math.round(attendanceData.reduce((sum, s) => sum + s.attendancePercentage, 0) / attendanceData.length)}%
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                  disabled={currentWeek <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Week
                </Button>
                <span className="text-sm font-medium px-3">Week {currentWeek}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(Math.min(maxWeek, currentWeek + 1))}
                  disabled={currentWeek >= maxWeek}
                >
                  Next Week
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                      Student Name
                    </TableHead>
                    <TableHead className="min-w-[120px]">Phone</TableHead>
                    <TableHead className="min-w-[100px]">Program</TableHead>
                    {visibleWeeks.map(weekNum => (
                      weekDays.map(day => (
                        <TableHead key={`${weekNum}-${day}`} className="text-center min-w-[60px]">
                          <div className="text-xs">
                            <div className="font-semibold">Week {weekNum}</div>
                            <div className="text-muted-foreground">{day}</div>
                          </div>
                        </TableHead>
                      ))
                    ))}
                    <TableHead className="text-center min-w-[80px]">Present</TableHead>
                    <TableHead className="text-center min-w-[80px]">Absent</TableHead>
                    <TableHead className="text-center min-w-[100px]">Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <div>
                          <p className="font-medium text-sm">{student.full_name_en}</p>
                          <p className="text-xs text-muted-foreground" dir="rtl">
                            {student.full_name_ar}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{student.phone1}</TableCell>
                      <TableCell className="text-sm">{student.program}</TableCell>
                      {visibleWeeks.map(weekNum => (
                        weekDays.map(day => {
                          const status = student.weeks[weekNum]?.[day] || '-';
                          return (
                            <TableCell key={`${weekNum}-${day}`} className="text-center">
                              <span className={getStatusColor(status)}>
                                {status}
                              </span>
                            </TableCell>
                          );
                        })
                      ))}
                      <TableCell className="text-center font-semibold">
                        {student.totalPresent}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {student.totalAbsent}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={student.attendancePercentage >= 80 ? "default" : "secondary"}
                          className={student.attendancePercentage >= 80 ? "bg-success" : "bg-warning"}
                        >
                          {student.attendancePercentage}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="mt-4 p-4 bg-muted/30 rounded-lg text-xs">
              <p className="font-semibold mb-2">Legend:</p>
              <div className="flex gap-4 flex-wrap">
                <span><span className="text-success font-bold">P</span> = Present</span>
                <span><span className="text-destructive font-bold">A</span> = Absent</span>
                <span><span className="text-warning font-bold">L</span> = Late</span>
                <span className="text-muted-foreground">- = No record</span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
