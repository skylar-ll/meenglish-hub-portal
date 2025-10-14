import { useState, useEffect } from "react";
import { X, Calendar, Download } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AttendanceRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttendanceRecordsModal = ({ isOpen, onClose }: AttendanceRecordsModalProps) => {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      fetchAttendanceRecords();
    }
  }, [isOpen, selectedDate]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const { data: attendanceData, error } = await supabase
        .from("attendance")
        .select(`
          *,
          students (
            full_name_en,
            full_name_ar,
            phone1,
            branch,
            program
          )
        `)
        .eq("date", selectedDate)
        .order("marked_at", { ascending: false });

      if (error) throw error;

      setRecords(attendanceData || []);
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
    const headers = ["Student Name", "Student Name (AR)", "Phone", "Branch", "Program", "Status", "Marked By", "Time"];
    const rows = records.map(r => [
      r.students.full_name_en,
      r.students.full_name_ar,
      r.students.phone1,
      r.students.branch,
      r.students.program,
      r.status,
      r.marked_by,
      new Date(r.marked_at).toLocaleTimeString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();

    toast({
      title: "Export Successful",
      description: "Attendance records exported to CSV"
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Attendance Records</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
          </div>
          <Button onClick={exportToCSV} variant="outline" disabled={records.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No attendance records found for this date
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marked By</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{record.students.full_name_en}</p>
                      <p className="text-sm text-muted-foreground" dir="rtl">
                        {record.students.full_name_ar}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{record.students.phone1}</TableCell>
                  <TableCell>{record.students.branch}</TableCell>
                  <TableCell>{record.students.program}</TableCell>
                  <TableCell>
                    <span className={record.status === 'present' ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                      {record.status === 'present' ? '✅ Present' : '❌ Absent'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{record.marked_by}</span>
                  </TableCell>
                  <TableCell>
                    {new Date(record.marked_at).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
