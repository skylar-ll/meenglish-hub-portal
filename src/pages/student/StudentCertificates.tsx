import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Award, ArrowLeft, Download, AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { generateCertificatePDF, getGradeLetter, CertificateData } from "@/components/certificate/CertificatePDFGenerator";
import { downloadPdfBlob } from "@/lib/pdfDownload";
import { toast } from "sonner";

interface Certificate {
  id: string;
  course_name: string | null;
  level: string | null;
  issue_date: string;
  certificate_type: string;
  final_grade: number | null;
  grade_letter: string | null;
  attendance_sheet_id: string | null;
}

interface StudentData {
  id: string;
  full_name_en: string;
  full_name_ar: string;
  national_id: string;
  nationality: string | null;
  date_of_birth: string | null;
  gender: string | null;
  program: string;
  course_level: string | null;
  total_levels: number | null;
  completed_levels: number | null;
}

interface AttendanceSheet {
  id: string;
  status: string | null;
  month_year: string;
  final_grades: number | null;
  equivalent: string | null;
}

const StudentCertificates = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [hasRepeatStatus, setHasRepeatStatus] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchStudentDataAndCertificates();
  }, []);

  const fetchStudentDataAndCertificates = async () => {
    try {
      const studentEmail = sessionStorage.getItem('studentEmail');
      if (!studentEmail) {
        toast.error('Please login first');
        navigate('/student/login');
        return;
      }

      // Fetch student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name_en, full_name_ar, national_id, nationality, date_of_birth, gender, program, course_level, total_levels, completed_levels')
        .eq('email', studentEmail)
        .single();

      if (studentError || !student) {
        console.error('Error fetching student:', studentError);
        toast.error('Failed to load student data');
        return;
      }

      setStudentData(student);

      // Fetch certificates (only for passing grades ≥70%)
      const { data: certs, error: certsError } = await supabase
        .from('student_certificates')
        .select('*')
        .eq('student_id', student.id)
        .order('issue_date', { ascending: false });

      if (certsError) {
        console.error('Error fetching certificates:', certsError);
      } else {
        // Filter certificates to only show those with grades ≥70%
        const validCerts = (certs || []).filter(cert => 
          cert.final_grade === null || cert.final_grade >= 70
        );
        setCertificates(validCerts);
      }

      // Check for repeat status in attendance sheets
      const { data: sheets } = await supabase
        .from('teacher_attendance_sheets')
        .select('status, final_grades')
        .eq('student_id', student.id);

      if (sheets) {
        const hasRepeat = sheets.some(sheet => 
          sheet.status === 'Repeat' || (sheet.final_grades !== null && sheet.final_grades < 70)
        );
        setHasRepeatStatus(hasRepeat);
      }

    } catch (error) {
      console.error('Error in fetchStudentDataAndCertificates:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (cert: Certificate) => {
    if (!studentData) {
      toast.error('Student data not available');
      return;
    }

    setIsDownloading(true);
    try {
      // Get the grade from attendance sheet if not on certificate
      let finalGrade = cert.final_grade || 0;
      let gradeLetter = cert.grade_letter || '';

      if (cert.attendance_sheet_id) {
        const { data: sheet } = await supabase
          .from('teacher_attendance_sheets')
          .select('final_grades, equivalent')
          .eq('id', cert.attendance_sheet_id)
          .single();

        if (sheet) {
          finalGrade = sheet.final_grades || finalGrade;
          gradeLetter = sheet.equivalent || gradeLetter;
        }
      }

      // Only generate certificate if grade is ≥70%
      if (finalGrade < 70) {
        toast.error('Certificate not available for grades below 70%');
        return;
      }

      const gradeLetters = getGradeLetter(finalGrade);
      
      // Prepare certificate data
      const certificateData: CertificateData = {
        studentNameEn: studentData.full_name_en,
        studentNameAr: studentData.full_name_ar,
        nationalId: studentData.national_id,
        nationality: studentData.nationality || 'Saudi',
        dateOfBirth: studentData.date_of_birth 
          ? format(new Date(studentData.date_of_birth), 'dd/MM/yyyy')
          : 'N/A',
        courseName: cert.course_name || studentData.program || 'English Language',
        levelsCompleted: cert.level || '1 to 6',
        totalHours: 240, // Default hours per the reference
        finalGrade: finalGrade,
        gradeLetterEn: gradeLetter || gradeLetters.en,
        gradeLetterAr: gradeLetters.ar,
        issueDate: format(new Date(cert.issue_date), 'dd/MM/yyyy'),
        issueDateHijri: new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(new Date(cert.issue_date)),
        gender: (studentData.gender === 'male' ? 'male' : 'female') as 'male' | 'female',
      };

      const pdfBlob = await generateCertificatePDF(certificateData);
      const fileName = `${studentData.full_name_en.replace(/\s+/g, '_')}_Certificate.pdf`;
      downloadPdfBlob(pdfBlob, fileName);
      
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate');
    } finally {
      setIsDownloading(false);
    }
  };

  // Calculate progress
  const totalLevels = studentData?.total_levels || 6;
  const completedLevels = studentData?.completed_levels || certificates.length;
  const progressPercentage = totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;
  const remainingLevels = totalLevels - completedLevels;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/student/course')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Certificates</h1>
            <p className="text-muted-foreground">View and download your earned certificates</p>
          </div>
        </div>

        {/* Progress Tracking Card */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Level Progress
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Completed: {completedLevels} / {totalLevels} levels</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            
            <Progress value={progressPercentage} className="h-3" />
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">{totalLevels}</p>
                <p className="text-xs text-muted-foreground">Total Levels</p>
              </div>
              <div className="text-center p-3 bg-success/10 rounded-lg">
                <p className="text-2xl font-bold text-success">{completedLevels}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{remainingLevels}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Repeat Status Warning */}
        {hasRepeatStatus && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Level Not Passed</p>
                <p className="text-sm text-muted-foreground">
                  You have failed and you need to repeat. A grade of 70% or higher is required to receive a certificate.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Certificates List */}
        {certificates.length === 0 ? (
          <Card className="p-8 text-center">
            <Award className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Certificates Yet</h3>
            <p className="text-muted-foreground">
              Complete your levels with a grade of 70% or higher to earn certificates.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Earned Certificates</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.map(cert => (
                <Card 
                  key={cert.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => setSelectedCert(cert)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-success/20">
                      <Award className="w-8 h-8 text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Certificate of Completion</h3>
                      {cert.course_name && (
                        <p className="text-muted-foreground">{cert.course_name}</p>
                      )}
                      {cert.level && (
                        <p className="text-sm text-muted-foreground">Level: {cert.level}</p>
                      )}
                      {cert.final_grade && (
                        <p className="text-sm font-medium text-success mt-1">
                          Grade: {cert.final_grade}% ({cert.grade_letter || getGradeLetter(cert.final_grade).en})
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        Issued: {format(new Date(cert.issue_date), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Certificate Detail Modal */}
        <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-center">Certificate of Completion</DialogTitle>
            </DialogHeader>
            
            {selectedCert && (
              <div className="space-y-6">
                {/* Certificate Preview */}
                <div className="relative p-8 bg-gradient-to-br from-card via-background to-muted rounded-lg border-4 border-double border-primary/30">
                  {/* Decorative corners */}
                  <div className="absolute top-0 left-0 w-16 h-16 bg-primary/10 rounded-br-full" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-destructive/10 rounded-tl-full" />
                  
                  <div className="text-center relative z-10">
                    <p className="text-sm text-muted-foreground mb-2">Modern Education Institute</p>
                    
                    <h2 className="text-3xl font-serif font-bold text-primary mb-2">
                      CERTIFICATE
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6">of Completion</p>
                    
                    <p className="text-muted-foreground mb-2">This is to certify that</p>
                    
                    <h3 className="text-2xl font-bold mb-1">
                      {studentData?.full_name_en}
                    </h3>
                    <p className="text-lg text-muted-foreground mb-4" dir="rtl">
                      {studentData?.full_name_ar}
                    </p>
                    
                    <p className="text-muted-foreground mb-2">
                      has successfully completed
                    </p>
                    
                    {selectedCert.course_name && (
                      <p className="text-xl font-semibold text-primary mb-1">
                        {selectedCert.course_name}
                      </p>
                    )}
                    
                    {selectedCert.level && (
                      <p className="text-lg mb-4">
                        Level: {selectedCert.level}
                      </p>
                    )}
                    
                    {selectedCert.final_grade && (
                      <p className="text-xl font-bold text-success mb-4">
                        Grade: {selectedCert.final_grade}% ({selectedCert.grade_letter || getGradeLetter(selectedCert.final_grade).en})
                      </p>
                    )}
                    
                    <div className="pt-6 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Date of Issue: {format(new Date(selectedCert.issue_date), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => handleDownloadCertificate(selectedCert)}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Download Certificate (PDF)
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentCertificates;
