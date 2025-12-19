import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Download, Send, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type AttendanceValue = 'P' | 'L' | 'VL' | 'A' | null;

interface StudentAttendanceData {
  id: string;
  student_id: string;
  student_name: string;
  phone: string;
  // Week data
  week1: { su: AttendanceValue; m: AttendanceValue; tu: AttendanceValue; w: AttendanceValue; th: AttendanceValue; wa: number | null };
  week2: { su: AttendanceValue; m: AttendanceValue; tu: AttendanceValue; w: AttendanceValue; th: AttendanceValue; wa: number | null };
  week3: { su: AttendanceValue; m: AttendanceValue; tu: AttendanceValue; w: AttendanceValue; th: AttendanceValue; wa: number | null };
  week4: { su: AttendanceValue; m: AttendanceValue; tu: AttendanceValue; w: AttendanceValue; th: AttendanceValue; wa: number | null };
  // Overall
  overall_v: number | null;
  teachers_evaluation: number | null;
  teachers_evaluation_2: number | null;
  final_grades: number | null;
  equivalent: string | null;
  status: 'Passed' | 'Repeat' | null;
  notes: string | null;
  // Monthly totals (auto-calculated)
  monthly_p: number;
  monthly_l: number;
  monthly_vl: number;
  monthly_a: number;
}

const ATTENDANCE_VALUES: AttendanceValue[] = ['P', 'L', 'VL', 'A'];
const EQUIVALENT_OPTIONS = ['A+', 'A', 'B+', 'B', 'C', 'D'];

const TeacherAttendanceSheet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [students, setStudents] = useState<StudentAttendanceData[]>([]);
  const [teacherId, setTeacherId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/teacher/login');
        return;
      }

      setTeacherId(session.user.id);

      // Get students assigned to this teacher via student_teachers table
      const { data: studentTeachersData } = await supabase
        .from("student_teachers")
        .select("student_id")
        .eq("teacher_id", session.user.id);

      if (!studentTeachersData || studentTeachersData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(studentTeachersData.map(st => st.student_id))];

      // Get student details
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, full_name_en, phone1")
        .in("id", studentIds);

      // Get existing attendance sheet data for this month
      const { data: sheetsData } = await supabase
        .from("teacher_attendance_sheets")
        .select("*")
        .eq("teacher_id", session.user.id)
        .eq("month_year", selectedMonth);

      // Map students with their attendance data
      const mappedStudents: StudentAttendanceData[] = (studentsData || []).map(student => {
        const existingSheet = sheetsData?.find(s => s.student_id === student.id);
        
        const weekData = (weekNum: number) => ({
          su: (existingSheet?.[`week${weekNum}_su` as keyof typeof existingSheet] as AttendanceValue) || null,
          m: (existingSheet?.[`week${weekNum}_m` as keyof typeof existingSheet] as AttendanceValue) || null,
          tu: (existingSheet?.[`week${weekNum}_tu` as keyof typeof existingSheet] as AttendanceValue) || null,
          w: (existingSheet?.[`week${weekNum}_w` as keyof typeof existingSheet] as AttendanceValue) || null,
          th: (existingSheet?.[`week${weekNum}_th` as keyof typeof existingSheet] as AttendanceValue) || null,
          wa: existingSheet?.[`week${weekNum}_wa` as keyof typeof existingSheet] as number | null || null,
        });

        // Calculate monthly totals
        const allDays = [1, 2, 3, 4].flatMap(w => {
          const week = weekData(w);
          return [week.su, week.m, week.tu, week.w, week.th];
        });

        return {
          id: existingSheet?.id || '',
          student_id: student.id,
          student_name: student.full_name_en,
          phone: student.phone1 || '',
          week1: weekData(1),
          week2: weekData(2),
          week3: weekData(3),
          week4: weekData(4),
          overall_v: existingSheet?.overall_v as number | null || null,
          teachers_evaluation: existingSheet?.teachers_evaluation as number | null || null,
          teachers_evaluation_2: (existingSheet as any)?.teachers_evaluation_2 as number | null || null,
          final_grades: existingSheet?.final_grades as number | null || null,
          equivalent: existingSheet?.equivalent || null,
          status: existingSheet?.status as 'Passed' | 'Repeat' | null || null,
          notes: existingSheet?.notes || null,
          monthly_p: allDays.filter(d => d === 'P').length,
          monthly_l: allDays.filter(d => d === 'L').length,
          monthly_vl: allDays.filter(d => d === 'VL').length,
          monthly_a: allDays.filter(d => d === 'A').length,
        };
      });

      setStudents(mappedStudents);
      isInitialLoad.current = true; // Mark as initial load complete
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load attendance data');
    }
    setLoading(false);
  };

  // Auto-save function
  const saveStudentData = useCallback(async (student: StudentAttendanceData) => {
    if (!teacherId) return;
    
    const sheetData = {
      student_id: student.student_id,
      teacher_id: teacherId,
      month_year: selectedMonth,
      week1_su: student.week1.su,
      week1_m: student.week1.m,
      week1_tu: student.week1.tu,
      week1_w: student.week1.w,
      week1_th: student.week1.th,
      week1_wa: student.week1.wa,
      week2_su: student.week2.su,
      week2_m: student.week2.m,
      week2_tu: student.week2.tu,
      week2_w: student.week2.w,
      week2_th: student.week2.th,
      week2_wa: student.week2.wa,
      week3_su: student.week3.su,
      week3_m: student.week3.m,
      week3_tu: student.week3.tu,
      week3_w: student.week3.w,
      week3_th: student.week3.th,
      week3_wa: student.week3.wa,
      week4_su: student.week4.su,
      week4_m: student.week4.m,
      week4_tu: student.week4.tu,
      week4_w: student.week4.w,
      week4_th: student.week4.th,
      week4_wa: student.week4.wa,
      overall_v: student.overall_v,
      teachers_evaluation: student.teachers_evaluation,
      teachers_evaluation_2: student.teachers_evaluation_2,
      final_grades: student.final_grades,
      equivalent: student.equivalent,
      status: student.status,
      notes: student.notes,
    };

    try {
      if (student.id) {
        await supabase
          .from("teacher_attendance_sheets")
          .update(sheetData)
          .eq("id", student.id);
      } else {
        const { data } = await supabase
          .from("teacher_attendance_sheets")
          .insert(sheetData)
          .select()
          .single();
        
        if (data) {
          // Update the student's id in local state
          setStudents(prev => prev.map(s => 
            s.student_id === student.student_id ? { ...s, id: data.id } : s
          ));
          
          // Handle status change - create certificate
          if (student.status === 'Passed') {
            await supabase.from("student_certificates").insert({
              student_id: student.student_id,
              teacher_id: teacherId,
              attendance_sheet_id: data.id,
              issue_date: new Date().toISOString().split('T')[0],
              certificate_type: 'passing',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error saving student data:', error);
    }
  }, [teacherId, selectedMonth]);

  // Auto-save effect with debouncing
  useEffect(() => {
    // Skip the first render (initial load)
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Skip if no students or still loading
    if (students.length === 0 || loading) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1 second delay)
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await Promise.all(students.map(student => saveStudentData(student)));
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
      setSaving(false);
    }, 1000);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [students, saveStudentData, loading]);

  const updateAttendance = (studentIndex: number, week: number, day: keyof StudentAttendanceData['week1'], value: AttendanceValue) => {
    setStudents(prev => {
      const updated = [...prev];
      const weekKey = `week${week}` as 'week1' | 'week2' | 'week3' | 'week4';
      updated[studentIndex] = {
        ...updated[studentIndex],
        [weekKey]: {
          ...updated[studentIndex][weekKey],
          [day]: value,
        }
      };
      
      // Recalculate monthly totals
      const allDays = [1, 2, 3, 4].flatMap(w => {
        const wk = updated[studentIndex][`week${w}` as 'week1' | 'week2' | 'week3' | 'week4'];
        return [wk.su, wk.m, wk.tu, wk.w, wk.th];
      });
      
      updated[studentIndex].monthly_p = allDays.filter(d => d === 'P').length;
      updated[studentIndex].monthly_l = allDays.filter(d => d === 'L').length;
      updated[studentIndex].monthly_vl = allDays.filter(d => d === 'VL').length;
      updated[studentIndex].monthly_a = allDays.filter(d => d === 'A').length;
      
      return updated;
    });
  };

  const updateWA = (studentIndex: number, week: number, value: string) => {
    setStudents(prev => {
      const updated = [...prev];
      const weekKey = `week${week}` as 'week1' | 'week2' | 'week3' | 'week4';
      updated[studentIndex] = {
        ...updated[studentIndex],
        [weekKey]: {
          ...updated[studentIndex][weekKey],
          wa: value ? parseFloat(value) : null,
        }
      };
      return updated;
    });
  };

  const updateOverall = (studentIndex: number, field: string, value: any) => {
    setStudents(prev => {
      const updated = [...prev];
      updated[studentIndex] = {
        ...updated[studentIndex],
        [field]: value,
      };
      return updated;
    });
  };

  const cycleStatus = (studentIndex: number) => {
    setStudents(prev => {
      const updated = [...prev];
      const current = updated[studentIndex].status;
      // 1 click = Passed, 2 clicks = Repeat, 3 clicks = null
      const next = current === null ? 'Passed' : current === 'Passed' ? 'Repeat' : null;
      updated[studentIndex].status = next;
      return updated;
    });
  };


  const getAttendanceColor = (value: AttendanceValue) => {
    switch (value) {
      case 'P': return 'bg-success text-success-foreground';
      case 'L': return 'bg-accent text-accent-foreground';
      case 'VL': return 'bg-secondary text-secondary-foreground';
      case 'A': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: 'Passed' | 'Repeat' | null) => {
    switch (status) {
      case 'Passed': return 'bg-success text-success-foreground';
      case 'Repeat': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderWeekHeader = (weekNum: number) => (
    <th colSpan={6} className="bg-primary text-primary-foreground text-center p-2 border border-border">
      Week {weekNum}
    </th>
  );

  const renderDayHeaders = () => (
    <>
      <th className="p-1 text-xs border border-border bg-muted">Su</th>
      <th className="p-1 text-xs border border-border bg-muted">M</th>
      <th className="p-1 text-xs border border-border bg-muted">Tu</th>
      <th className="p-1 text-xs border border-border bg-muted">W</th>
      <th className="p-1 text-xs border border-border bg-muted">Th</th>
      <th className="p-1 text-xs border border-border bg-accent text-accent-foreground">WA</th>
    </>
  );

  const renderAttendanceCell = (studentIndex: number, week: number, day: 'su' | 'm' | 'tu' | 'w' | 'th') => {
    const weekKey = `week${week}` as 'week1' | 'week2' | 'week3' | 'week4';
    const value = students[studentIndex][weekKey][day];
    
    return (
      <td className="p-0 border border-border">
        <Select
          value={value || ''}
          onValueChange={(v) => updateAttendance(studentIndex, week, day, v as AttendanceValue || null)}
        >
          <SelectTrigger className={`h-8 w-12 text-xs rounded-none border-0 ${getAttendanceColor(value)}`}>
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="P">P</SelectItem>
            <SelectItem value="L">L</SelectItem>
            <SelectItem value="VL">VL</SelectItem>
            <SelectItem value="A">A</SelectItem>
          </SelectContent>
        </Select>
      </td>
    );
  };

  const renderWACell = (studentIndex: number, week: number) => {
    const weekKey = `week${week}` as 'week1' | 'week2' | 'week3' | 'week4';
    const value = students[studentIndex][weekKey].wa;
    
    return (
      <td className="p-0 border border-border bg-accent/20">
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => updateWA(studentIndex, week, e.target.value)}
          className="h-8 w-14 text-xs text-center rounded-none border-0"
        />
      </td>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading attendance sheet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-[1600px] mx-auto py-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/teacher/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Attendance & Grading Sheet</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Auto-saved</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Passing Rule */}
        <Card className="p-4 mb-6 bg-muted/50">
          <p className="text-sm">
            <strong>Passing Rule:</strong> Above 70% = (Pass) then automatically moved to the next level and can see their certificate. 
            Less than 70% = (Repeat) moved automatically to the same level for the next course.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                {/* Week Headers */}
                <tr>
                  <th rowSpan={2} className="p-2 border border-border bg-card sticky left-0 z-10">#</th>
                  <th rowSpan={2} className="p-2 border border-border bg-card min-w-[180px] sticky left-10 z-10">Student Name</th>
                  <th rowSpan={2} className="p-2 border border-border bg-card min-w-[120px]">Phone</th>
                  {renderWeekHeader(1)}
                  {renderWeekHeader(2)}
                  {renderWeekHeader(3)}
                  {renderWeekHeader(4)}
                  <th colSpan={4} className="bg-muted text-center p-2 border border-border">Monthly Totals</th>
                  <th colSpan={7} className="bg-primary text-primary-foreground text-center p-2 border border-border">OVERALL</th>
                </tr>
                <tr>
                  {/* Week 1 days */}
                  {renderDayHeaders()}
                  {/* Week 2 days */}
                  {renderDayHeaders()}
                  {/* Week 3 days */}
                  {renderDayHeaders()}
                  {/* Week 4 days */}
                  {renderDayHeaders()}
                  {/* Monthly totals */}
                  <th className="p-1 text-xs border border-border bg-success text-success-foreground">P</th>
                  <th className="p-1 text-xs border border-border bg-accent text-accent-foreground">L</th>
                  <th className="p-1 text-xs border border-border bg-secondary text-secondary-foreground">VL</th>
                  <th className="p-1 text-xs border border-border bg-destructive text-destructive-foreground">A</th>
                  {/* Overall */}
                  <th className="p-1 text-xs border border-border bg-muted min-w-[50px]">WE</th>
                  <th colSpan={2} className="p-1 text-xs border border-border bg-muted min-w-[100px]">TEACHER'S EVALUATION</th>
                  <th className="p-1 text-xs border border-border bg-muted min-w-[70px]">Final GRADES</th>
                  <th className="p-1 text-xs border border-border bg-muted min-w-[80px]">EQUIVALENT</th>
                  <th className="p-1 text-xs border border-border bg-muted min-w-[70px]">Status</th>
                  <th className="p-1 text-xs border border-border bg-muted min-w-[100px]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={38} className="p-8 text-center text-muted-foreground">
                      No students assigned to your classes yet.
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => (
                    <tr key={student.student_id} className="hover:bg-muted/50">
                      <td className="p-2 border border-border text-center bg-card sticky left-0 z-10">{idx + 1}</td>
                      <td className="p-2 border border-border bg-card sticky left-10 z-10 font-medium">{student.student_name}</td>
                      <td className="p-2 border border-border text-center">{student.phone}</td>
                      
                      {/* Week 1 */}
                      {renderAttendanceCell(idx, 1, 'su')}
                      {renderAttendanceCell(idx, 1, 'm')}
                      {renderAttendanceCell(idx, 1, 'tu')}
                      {renderAttendanceCell(idx, 1, 'w')}
                      {renderAttendanceCell(idx, 1, 'th')}
                      {renderWACell(idx, 1)}
                      
                      {/* Week 2 */}
                      {renderAttendanceCell(idx, 2, 'su')}
                      {renderAttendanceCell(idx, 2, 'm')}
                      {renderAttendanceCell(idx, 2, 'tu')}
                      {renderAttendanceCell(idx, 2, 'w')}
                      {renderAttendanceCell(idx, 2, 'th')}
                      {renderWACell(idx, 2)}
                      
                      {/* Week 3 */}
                      {renderAttendanceCell(idx, 3, 'su')}
                      {renderAttendanceCell(idx, 3, 'm')}
                      {renderAttendanceCell(idx, 3, 'tu')}
                      {renderAttendanceCell(idx, 3, 'w')}
                      {renderAttendanceCell(idx, 3, 'th')}
                      {renderWACell(idx, 3)}
                      
                      {/* Week 4 */}
                      {renderAttendanceCell(idx, 4, 'su')}
                      {renderAttendanceCell(idx, 4, 'm')}
                      {renderAttendanceCell(idx, 4, 'tu')}
                      {renderAttendanceCell(idx, 4, 'w')}
                      {renderAttendanceCell(idx, 4, 'th')}
                      {renderWACell(idx, 4)}
                      
                      {/* Monthly Totals (auto-calculated) */}
                      <td className="p-2 border border-border text-center bg-success/20 font-bold">{student.monthly_p}</td>
                      <td className="p-2 border border-border text-center bg-accent/20 font-bold">{student.monthly_l}</td>
                      <td className="p-2 border border-border text-center bg-secondary/20 font-bold">{student.monthly_vl}</td>
                      <td className="p-2 border border-border text-center bg-destructive/20 font-bold">{student.monthly_a}</td>
                      
                      {/* Overall V (WE) */}
                      <td className="p-0 border border-border">
                        <Input
                          type="number"
                          value={student.overall_v ?? ''}
                          onChange={(e) => updateOverall(idx, 'overall_v', e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-8 w-16 text-xs text-center rounded-none border-0"
                        />
                      </td>
                      
                      {/* Teachers Evaluation 1 */}
                      <td className="p-0 border border-border">
                        <Input
                          type="number"
                          value={student.teachers_evaluation ?? ''}
                          onChange={(e) => updateOverall(idx, 'teachers_evaluation', e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-8 w-14 text-xs text-center rounded-none border-0"
                        />
                      </td>
                      
                      {/* Teachers Evaluation 2 */}
                      <td className="p-0 border border-border">
                        <Input
                          type="number"
                          max={20}
                          value={student.teachers_evaluation_2 ?? ''}
                          onChange={(e) => updateOverall(idx, 'teachers_evaluation_2', e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-8 w-14 text-xs text-center rounded-none border-0"
                        />
                      </td>
                      
                      {/* Final Grades */}
                      <td className="p-0 border border-border">
                        <Input
                          type="number"
                          value={student.final_grades ?? ''}
                          onChange={(e) => updateOverall(idx, 'final_grades', e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-8 w-14 text-xs text-center rounded-none border-0"
                        />
                      </td>
                      
                      {/* Equivalent */}
                      <td className="p-0 border border-border">
                        <Select
                          value={student.equivalent || ''}
                          onValueChange={(v) => updateOverall(idx, 'equivalent', v || null)}
                        >
                          <SelectTrigger className="h-8 w-20 text-xs rounded-none border-0">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {EQUIVALENT_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      
                      {/* Status (click to toggle) */}
                      <td className="p-0 border border-border">
                        <button
                          onClick={() => cycleStatus(idx)}
                          className={`h-8 w-full text-xs font-bold ${getStatusColor(student.status)}`}
                        >
                          {student.status || 'Click'}
                        </button>
                      </td>
                      
                      {/* Notes */}
                      <td className="p-0 border border-border">
                        <Input
                          value={student.notes ?? ''}
                          onChange={(e) => updateOverall(idx, 'notes', e.target.value || null)}
                          className="h-8 w-24 text-xs rounded-none border-0"
                          placeholder="Notes..."
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherAttendanceSheet;
