import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminStudentReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, teachersRes] = await Promise.all([
          supabase.from("students").select("*").order("full_name_en"),
          supabase.from("teachers").select("*").order("full_name")
        ]);

        if (studentsRes.error) throw studentsRes.error;
        if (teachersRes.error) throw teachersRes.error;
        
        setStudents(studentsRes.data || []);
        setTeachers(teachersRes.data || []);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchReports();
    }
  }, [selectedStudent]);

  const fetchReports = async () => {
    if (!selectedStudent) return;

    try {
      setLoading(true);
      
      const student = students.find(s => s.id === selectedStudent);
      setStudentInfo(student);

      const { data: reportsData, error } = await supabase
        .from("student_weekly_reports")
        .select("*")
        .eq("student_id", selectedStudent)
        .order("week_number", { ascending: false });

      if (error) throw error;
      setReports(reportsData || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="container max-w-5xl mx-auto py-8">
        <Button variant="ghost" onClick={() => navigate("/admin/dashboard")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">Student Reports</h1>

        {/* Student Selector */}
        <Card className="p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Select Student</label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a student..." />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.full_name_en} - {student.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Reports Display */}
        {!selectedStudent ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Select a student to view their reports</p>
            </div>
          </Card>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-lg">Loading...</p>
          </div>
        ) : reports.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No reports available for this student</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Section */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{studentInfo?.full_name_en}</h2>
                  <p className="text-muted-foreground">{studentInfo?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Reports</p>
                  <p className="text-3xl font-bold">{reports.length}</p>
                </div>
              </div>
            </Card>

            {/* Group reports by teacher */}
            {(() => {
              const reportsByTeacher = reports.reduce((acc: any, report: any) => {
                const teacherName = report.teacher_name || "Unknown Teacher";
                if (!acc[teacherName]) {
                  acc[teacherName] = [];
                }
                acc[teacherName].push(report);
                return acc;
              }, {});

              return Object.entries(reportsByTeacher).map(([teacherName, teacherReports]: [string, any]) => (
                <div key={teacherName} className="space-y-4">
                  {/* Teacher Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{teacherName}</h3>
                      <p className="text-sm text-muted-foreground">{teacherReports.length} report{teacherReports.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Reports from this teacher */}
                  {teacherReports.map((report: any) => (
                    <div key={report.id} className="bg-white border-2 border-black p-8 ml-12 print:ml-0 print:border-0">
                      {/* Header */}
                      <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold mb-2">MODERN EDUCATION LANGUAGE CENTER</h1>
                        <Badge variant="outline" className="text-sm">
                          <User className="w-3 h-3 mr-1" />
                          Teacher: {report.teacher_name}
                        </Badge>
                      </div>

                      {/* Student Info Grid */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
                        <div className="flex items-baseline">
                          <span className="font-bold mr-2">NAME:</span>
                          <span className="flex-1 border-b border-black pb-1">{studentInfo?.full_name_en}</span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="font-bold mr-2">WEEK:</span>
                          <span className="flex-1 border-b border-black pb-1">{report.week_number}</span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="font-bold mr-2">PHONE NUMBER:</span>
                          <span className="flex-1 border-b border-black pb-1">{studentInfo?.phone1}</span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="font-bold mr-2">LEVEL:</span>
                          <span className="flex-1 border-b border-black pb-1">{report.level}</span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="font-bold mr-2">DATE:</span>
                          <span className="flex-1 border-b border-black pb-1">
                            {new Date(report.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="font-bold mr-2">TIME:</span>
                          <span className="flex-1 border-b border-black pb-1">{report.schedule || "N/A"}</span>
                        </div>
                      </div>

                      {/* Skills Rating Table */}
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-center mb-4">NEEDS IMPROVEMENT</h2>
                        <table className="w-full border-2 border-black">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-black p-2 text-left font-bold">SCORE</th>
                              <th className="border border-black p-2 text-center font-bold">POOR</th>
                              <th className="border border-black p-2 text-center font-bold">BELOW AVERAGE</th>
                              <th className="border border-black p-2 text-center font-bold">AVERAGE</th>
                              <th className="border border-black p-2 text-center font-bold">VERY GOOD</th>
                              <th className="border border-black p-2 text-center font-bold">EXCELLENT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: "VOCABULARY", value: report.vocabulary_rating },
                              { label: "GRAMMAR", value: report.grammar_rating },
                              { label: "READING", value: report.reading_rating },
                              { label: "WRITING", value: report.writing_rating },
                              { label: "SPEAKING", value: report.speaking_rating },
                              { label: "ATTENDANCE", value: report.attendance_rating },
                            ].map((skill) => (
                              <tr key={skill.label}>
                                <td className="border border-black p-2 font-bold">{skill.label}</td>
                                <td className="border border-black p-2 text-center">
                                  {skill.value === 1 ? "●" : ""}
                                </td>
                                <td className="border border-black p-2 text-center">
                                  {skill.value === 2 ? "●" : ""}
                                </td>
                                <td className="border border-black p-2 text-center">
                                  {skill.value === 3 ? "●" : ""}
                                </td>
                                <td className="border border-black p-2 text-center">
                                  {skill.value === 4 ? "●" : ""}
                                </td>
                                <td className="border border-black p-2 text-center">
                                  {skill.value === 5 ? "●" : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Exam Scores */}
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-center mb-4">Exam Scores</h2>
                        <table className="w-full border-2 border-black mb-3">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-black p-2 text-left font-bold">{report.level || "Level"}</th>
                              <th className="border border-black p-2 text-center font-bold">1st Exam</th>
                              <th className="border border-black p-2 text-center font-bold">2nd Exam</th>
                              <th className="border border-black p-2 text-center font-bold">3rd Exam</th>
                              <th className="border border-black p-2 text-center font-bold">4th Exam</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-black p-2 font-bold">{report.course_name || report.level}</td>
                              <td className="border border-black p-2 text-center">
                                {report.exam_1_score ? `${report.exam_1_score} / 100` : "- / 100"}
                              </td>
                              <td className="border border-black p-2 text-center">
                                {report.exam_2_score ? `${report.exam_2_score} / 100` : "- / 100"}
                              </td>
                              <td className="border border-black p-2 text-center">
                                {report.exam_3_score ? `${report.exam_3_score} / 100` : "- / 100"}
                              </td>
                              <td className="border border-black p-2 text-center">
                                {report.exam_4_score ? `${report.exam_4_score} / 100` : "- / 100"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-xs text-center text-gray-600">
                          100 - 90 = excellent | 89 - 85 = very good | 84 – 80 = good | 79 – 70 = fair | 69 below = failed
                        </p>
                      </div>

                      {/* Comments */}
                      <div className="mb-6">
                        <h2 className="text-xl font-bold mb-3">COMMENTS</h2>
                        <div className="border-2 border-black p-4 min-h-[150px] bg-white">
                          {report.teacher_comments ? (
                            <div className="whitespace-pre-wrap text-sm">{report.teacher_comments}</div>
                          ) : (
                            <p className="text-gray-400 italic">No comments provided</p>
                          )}
                        </div>
                      </div>

                      {/* Teacher Name */}
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="font-bold">Prepared by:</span> {report.teacher_name}
                        </p>
                      </div>

                      {/* Export Button */}
                      <div className="mt-6 text-center print:hidden">
                        <Button variant="outline" onClick={() => window.print()}>
                          <Download className="w-4 h-4 mr-2" />
                          Export PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStudentReports;
