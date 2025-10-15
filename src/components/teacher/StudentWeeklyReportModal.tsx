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
    vocabulary_rating: 0,
    grammar_rating: 0,
    reading_rating: 0,
    writing_rating: 0,
    speaking_rating: 0,
    attendance_rating: 0,
    exam_1_score: "",
    exam_2_score: "",
    exam_3_score: "",
    exam_4_score: "",
    teacher_comments: "",
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
    
    // Validate that all ratings are filled
    if (!formData.vocabulary_rating || !formData.grammar_rating || !formData.reading_rating || 
        !formData.writing_rating || !formData.speaking_rating || !formData.attendance_rating) {
      toast.error("Please fill all skill ratings");
      return;
    }

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
        vocabulary_rating: formData.vocabulary_rating,
        grammar_rating: formData.grammar_rating,
        reading_rating: formData.reading_rating,
        writing_rating: formData.writing_rating,
        speaking_rating: formData.speaking_rating,
        attendance_rating: formData.attendance_rating,
        exam_1_score: formData.exam_1_score ? parseFloat(formData.exam_1_score) : null,
        exam_2_score: formData.exam_2_score ? parseFloat(formData.exam_2_score) : null,
        exam_3_score: formData.exam_3_score ? parseFloat(formData.exam_3_score) : null,
        exam_4_score: formData.exam_4_score ? parseFloat(formData.exam_4_score) : null,
        teacher_comments: formData.teacher_comments,
      };

      const { error } = await supabase
        .from("student_weekly_reports")
        .insert(reportData);

      if (error) throw error;

      toast.success("Weekly report submitted successfully! Report is now available to admin and student.");
      onClose();
      
      // Reset form
      setFormData({
        vocabulary_rating: 0,
        grammar_rating: 0,
        reading_rating: 0,
        writing_rating: 0,
        speaking_rating: 0,
        attendance_rating: 0,
        exam_1_score: "",
        exam_2_score: "",
        exam_3_score: "",
        exam_4_score: "",
        teacher_comments: "",
      });
      setWeekNumber(1);
    } catch (error: any) {
      console.error("Error saving report:", error);
      toast.error(error.message || "Failed to save report");
    } finally {
      setLoading(false);
    }
  };

  const RatingCell = ({ skillName, value, onChange }: any) => (
    <tr>
      <td className="border border-gray-400 p-2 font-bold bg-gray-50">{skillName}</td>
      {[1, 2, 3, 4, 5].map((rating) => (
        <td 
          key={rating} 
          className="border border-gray-400 p-2 text-center cursor-pointer hover:bg-blue-50"
          onClick={() => onChange(rating)}
        >
          {value === rating ? "●" : ""}
        </td>
      ))}
    </tr>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            MODERN EDUCATION LANGUAGE CENTER
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Info Grid - Exactly like PDF */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm border-2 border-black p-4">
            <div className="flex items-baseline">
              <span className="font-bold mr-2">NAME:</span>
              <span className="flex-1 border-b border-black pb-1">{student?.full_name_en}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold mr-2">WEEK:</span>
              <Input
                type="number"
                min="1"
                value={weekNumber}
                onChange={(e) => setWeekNumber(parseInt(e.target.value))}
                className="flex-1 h-7 border-0 border-b border-black rounded-none px-2"
                required
              />
            </div>
            <div className="flex items-baseline">
              <span className="font-bold mr-2">PHONE NUMBER:</span>
              <span className="flex-1 border-b border-black pb-1">{student?.phone1}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold mr-2">LEVEL:</span>
              <span className="flex-1 border-b border-black pb-1">{student?.course_level || "N/A"}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold mr-2">DATE:</span>
              <span className="flex-1 border-b border-black pb-1">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold mr-2">TIME:</span>
              <span className="flex-1 border-b border-black pb-1">{student?.class_type || "N/A"}</span>
            </div>
          </div>

          {/* Skills Rating Table - Exactly like PDF */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center">NEEDS IMPROVEMENT</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-black">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-400 p-2 text-left font-bold">SCORE</th>
                    <th className="border border-gray-400 p-2 text-center font-bold w-[15%]">POOR</th>
                    <th className="border border-gray-400 p-2 text-center font-bold w-[15%]">BELOW AVERAGE</th>
                    <th className="border border-gray-400 p-2 text-center font-bold w-[15%]">AVERAGE</th>
                    <th className="border border-gray-400 p-2 text-center font-bold w-[15%]">VERY GOOD</th>
                    <th className="border border-gray-400 p-2 text-center font-bold w-[15%]">EXCELLENT</th>
                  </tr>
                </thead>
                <tbody>
                  <RatingCell 
                    skillName="VOCABULARY" 
                    value={formData.vocabulary_rating} 
                    onChange={(val: number) => setFormData({ ...formData, vocabulary_rating: val })}
                  />
                  <RatingCell 
                    skillName="GRAMMAR" 
                    value={formData.grammar_rating} 
                    onChange={(val: number) => setFormData({ ...formData, grammar_rating: val })}
                  />
                  <RatingCell 
                    skillName="READING" 
                    value={formData.reading_rating} 
                    onChange={(val: number) => setFormData({ ...formData, reading_rating: val })}
                  />
                  <RatingCell 
                    skillName="WRITING" 
                    value={formData.writing_rating} 
                    onChange={(val: number) => setFormData({ ...formData, writing_rating: val })}
                  />
                  <RatingCell 
                    skillName="SPEAKING" 
                    value={formData.speaking_rating} 
                    onChange={(val: number) => setFormData({ ...formData, speaking_rating: val })}
                  />
                  <RatingCell 
                    skillName="ATTENDANCE" 
                    value={formData.attendance_rating} 
                    onChange={(val: number) => setFormData({ ...formData, attendance_rating: val })}
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Exam Scores - Exactly like PDF */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center">Exam Scores</h2>
            <table className="w-full border-2 border-black mb-3">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 p-2 text-left font-bold">{student?.course_level || "Level"}</th>
                  <th className="border border-gray-400 p-2 text-center font-bold">1st Exam</th>
                  <th className="border border-gray-400 p-2 text-center font-bold">2nd Exam</th>
                  <th className="border border-gray-400 p-2 text-center font-bold">3rd Exam</th>
                  <th className="border border-gray-400 p-2 text-center font-bold">4th Exam</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 p-2 font-bold">{student?.program || "Course"}</td>
                  <td className="border border-gray-400 p-2 text-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.exam_1_score}
                      onChange={(e) => setFormData({ ...formData, exam_1_score: e.target.value })}
                      placeholder="- / 100"
                      className="w-24 mx-auto text-center"
                    />
                  </td>
                  <td className="border border-gray-400 p-2 text-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.exam_2_score}
                      onChange={(e) => setFormData({ ...formData, exam_2_score: e.target.value })}
                      placeholder="- / 100"
                      className="w-24 mx-auto text-center"
                    />
                  </td>
                  <td className="border border-gray-400 p-2 text-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.exam_3_score}
                      onChange={(e) => setFormData({ ...formData, exam_3_score: e.target.value })}
                      placeholder="- / 100"
                      className="w-24 mx-auto text-center"
                    />
                  </td>
                  <td className="border border-gray-400 p-2 text-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.exam_4_score}
                      onChange={(e) => setFormData({ ...formData, exam_4_score: e.target.value })}
                      placeholder="- / 100"
                      className="w-24 mx-auto text-center"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-center text-gray-600">
              100 - 90 = excellent | 89 - 85 = very good | 84 – 80 = good | 79 – 70 = fair | 69 below = failed
            </p>
          </div>

          {/* Comments - Exactly like PDF */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold">COMMENTS</h2>
            <Textarea
              value={formData.teacher_comments}
              onChange={(e) => setFormData({ ...formData, teacher_comments: e.target.value })}
              placeholder="Enter your comments here..."
              rows={8}
              className="border-2 border-black resize-none"
            />
          </div>

          {/* Footer Messages - Like PDF */}
          <div className="text-center space-y-2">
            <p className="font-semibold">Keep up the good work!</p>
            <p className="font-semibold">He needs to try harder to get better results.</p>
          </div>

          {/* Teacher Name */}
          <div className="text-right">
            <p className="text-sm">
              <span className="font-bold">Prepared by:</span> {teacherName}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
