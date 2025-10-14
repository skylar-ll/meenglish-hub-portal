import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
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

interface Student {
  id: string;
  name: string;
  nameAr: string;
  present: boolean;
  phone: string;
}

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarkAttendanceModal = ({ isOpen, onClose }: MarkAttendanceModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStudentsWithAttendance();
    }
  }, [isOpen]);

  const fetchStudentsWithAttendance = async () => {
    setLoading(true);
    try {
      // Ensure authenticated and has teacher role
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

      // If role missing, try to self-assign (allowed by RLS policy)
      if (!roleData) {
        await supabase.from('user_roles').insert({ user_id: session.user.id, role: 'teacher' });
      }

      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name_en, full_name_ar, phone1");

      if (studentsError) throw studentsError;

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("date", today);

      const attendanceMap = new Map(
        attendanceData?.map(a => [a.student_id, a.status === 'present']) || []
      );

      const studentsWithAttendance = studentsData?.map(s => ({
        id: s.id,
        name: s.full_name_en,
        nameAr: s.full_name_ar,
        phone: s.phone1,
        present: attendanceMap.get(s.id) ?? false
      })) || [];

      setStudents(studentsWithAttendance);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (id: string) => {
    setStudents(students.map(s => 
      s.id === id ? { ...s, present: !s.present } : s
    ));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();
      
      // Prepare attendance records
      const attendanceRecords = students.map(student => ({
        student_id: student.id,
        date: today,
        status: student.present ? 'present' : 'absent',
        marked_by: 'teacher',
        class_time: `${currentHour}:00`
      }));

      // Upsert attendance records
      const { error } = await supabase
        .from("attendance")
        .upsert(attendanceRecords, { 
          onConflict: 'student_id,date,class_time',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: t('teacher.attendanceSaved'),
        description: `Attendance marked for ${students.length} students`,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('teacher.markAttendance')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('teacher.studentName')}</TableHead>
                <TableHead className="text-right">{t('teacher.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground" dir="rtl">
                        {student.nameAr}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={student.present ? "text-success" : "text-destructive"}>
                        {student.present ? "✅" : "❌"} {student.present ? t('teacher.present') : t('teacher.absent')}
                      </span>
                      <Switch
                        checked={student.present}
                        onCheckedChange={() => toggleAttendance(student.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1" disabled={loading}>
              <Check className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : t('teacher.saveAttendance')}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1" disabled={loading}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
