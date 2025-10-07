import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Student {
  id: number;
  name: string;
  nameAr: string;
  present: boolean;
}

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarkAttendanceModal = ({ isOpen, onClose }: MarkAttendanceModalProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([
    { id: 1, name: "Ahmed Al-Saudi", nameAr: "أحمد السعودي", present: true },
    { id: 2, name: "Lina Hassan", nameAr: "لينا حسن", present: false },
    { id: 3, name: "Omar Khalid", nameAr: "عمر خالد", present: true },
    { id: 4, name: "Rania Al-Zahrani", nameAr: "رانيا الزهراني", present: true },
  ]);

  const toggleAttendance = (id: number) => {
    setStudents(students.map(s => 
      s.id === id ? { ...s, present: !s.present } : s
    ));
  };

  const handleSave = () => {
    toast({
      title: t('teacher.attendanceSaved'),
      description: `${t('teacher.attendanceSavedDesc')} (Demo mode)`,
    });
    onClose();
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
            <Button onClick={handleSave} className="flex-1">
              <Check className="w-4 h-4 mr-2" />
              {t('teacher.saveAttendance')}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
