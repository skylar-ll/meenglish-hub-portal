import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentWeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
}

export const StudentWeeklyReportModal = ({ isOpen, onClose, student }: StudentWeeklyReportModalProps) => {
  const [loading, setLoading] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [formData, setFormData] = useState({
    vocabulary_rating: 3,
    grammar_rating: 3,
    reading_rating: 3,
    writing_rating: 3,
    speaking_rating: 3,
    attendance_rating: 3,
    exam_1_score: "",
    exam_2_score: "",
    exam_3_score: "",
    exam_4_score: "",
    teacher_comments: "",
    teacher_notes: "",
  });

  useEffect(() => {
    const loadTeacherInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("full_name")
          .eq("email", session.user.email)
          .single();
        
        if (teacher) {
          setTeacherName(teacher.full_name);
        }
      }
    };
    loadTeacherInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const reportData = {
        student_id: student.id,
        teacher_id: session.user.id,
        week_number: weekNumber,
        course_name: student.program,
        level: student.course_level,
        schedule: student.class_type,
        registration_date: student.registration_date,
        expiration_date: student.expiration_date,
        current_grade: student.total_grade,
        teacher_name: teacherName,
        ...formData,
        exam_1_score: formData.exam_1_score ? parseFloat(formData.exam_1_score) : null,
        exam_2_score: formData.exam_2_score ? parseFloat(formData.exam_2_score) : null,
        exam_3_score: formData.exam_3_score ? parseFloat(formData.exam_3_score) : null,
        exam_4_score: formData.exam_4_score ? parseFloat(formData.exam_4_score) : null,
      };

      const { error } = await supabase
        .from("student_weekly_reports")
        .upsert(reportData, {
          onConflict: "student_id,week_number,report_date",
        });

      if (error) throw error;

      toast.success("Weekly report saved successfully");
      onClose();
    } catch (error: any) {
      console.error("Error saving report:", error);
      toast.error(error.message || "Failed to save report");
    } finally {
      setLoading(false);
    }
  };

  const RatingInput = ({ label, value, onChange }: any) => (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`w-10 h-10 rounded-full border-2 font-medium ${
              value === rating
                ? "bg-primary text-primary-foreground border-primary"
                : "border-muted-foreground/30 hover:border-primary"
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Weekly Report - {student?.full_name_en}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Auto-filled Course Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold mb-2">Course Information (Auto-filled)</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Course Name</p>
                <p className="font-medium">{student?.program}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Level</p>
                <p className="font-medium">{student?.course_level || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Schedule</p>
                <p className="font-medium">{student?.class_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Registration Date</p>
                <p className="font-medium">{student?.registration_date || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expiration Date</p>
                <p className="font-medium">{student?.expiration_date || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Grade</p>
                <p className="font-medium">{student?.total_grade ? `${student.total_grade}%` : "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Week Number */}
          <div>
            <Label>Week Number</Label>
            <Input
              type="number"
              min="1"
              value={weekNumber}
              onChange={(e) => setWeekNumber(parseInt(e.target.value))}
              required
            />
          </div>

          {/* Skill Ratings */}
          <div className="space-y-4">
            <h3 className="font-semibold">Skill Ratings (1-5)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <RatingInput
                label="Vocabulary"
                value={formData.vocabulary_rating}
                onChange={(val: number) => setFormData({ ...formData, vocabulary_rating: val })}
              />
              <RatingInput
                label="Grammar"
                value={formData.grammar_rating}
                onChange={(val: number) => setFormData({ ...formData, grammar_rating: val })}
              />
              <RatingInput
                label="Reading"
                value={formData.reading_rating}
                onChange={(val: number) => setFormData({ ...formData, reading_rating: val })}
              />
              <RatingInput
                label="Writing"
                value={formData.writing_rating}
                onChange={(val: number) => setFormData({ ...formData, writing_rating: val })}
              />
              <RatingInput
                label="Speaking"
                value={formData.speaking_rating}
                onChange={(val: number) => setFormData({ ...formData, speaking_rating: val })}
              />
              <RatingInput
                label="Attendance"
                value={formData.attendance_rating}
                onChange={(val: number) => setFormData({ ...formData, attendance_rating: val })}
              />
            </div>
          </div>

          {/* Exam Scores */}
          <div className="space-y-4">
            <h3 className="font-semibold">Exam Scores</h3>
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num}>
                  <Label>Exam {num}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={(formData as any)[`exam_${num}_score`]}
                    onChange={(e) =>
                      setFormData({ ...formData, [`exam_${num}_score`]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Comments and Notes */}
          <div className="space-y-4">
            <div>
              <Label>Teacher Comments</Label>
              <Textarea
                value={formData.teacher_comments}
                onChange={(e) => setFormData({ ...formData, teacher_comments: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Teacher Notes</Label>
              <Textarea
                value={formData.teacher_notes}
                onChange={(e) => setFormData({ ...formData, teacher_notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          {/* Teacher Name */}
          <div>
            <Label>Teacher Name (Auto-filled)</Label>
            <Input value={teacherName} disabled />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
