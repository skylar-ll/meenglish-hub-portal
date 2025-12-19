import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Certificate {
  id: string;
  course_name: string | null;
  level: string | null;
  issue_date: string;
  certificate_type: string;
}

interface AttendanceSheet {
  status: string | null;
  month_year: string;
}

const StudentCertificates = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [studentName, setStudentName] = useState("");
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [hasRepeatStatus, setHasRepeatStatus] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/student/login');
        return;
      }

      // Get student info
      const { data: studentData } = await supabase
        .from("students")
        .select("id, full_name_en, course_level, program")
        .eq("email", session.user.email)
        .single();

      if (!studentData) {
        toast.error("Student record not found");
        navigate('/student/login');
        return;
      }

      setStudentName(studentData.full_name_en);

      // Get certificates
      const { data: certsData } = await supabase
        .from("student_certificates")
        .select("*")
        .eq("student_id", studentData.id)
        .order("issue_date", { ascending: false });

      // Get attendance sheets to check for any "Repeat" status
      const { data: sheetsData } = await supabase
        .from("teacher_attendance_sheets")
        .select("status, month_year")
        .eq("student_id", studentData.id);

      if (sheetsData) {
        const hasRepeat = sheetsData.some(s => s.status === 'Repeat');
        setHasRepeatStatus(hasRepeat);
      }

      setCertificates(certsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load certificates');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading certificates...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/student/course")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Certificates</h1>
        </div>

        {/* Repeat Warning */}
        {hasRepeatStatus && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertDescription className="text-destructive font-medium">
              You have failed and you need to repeat. Please contact your teacher for more information.
            </AlertDescription>
          </Alert>
        )}

        {/* Certificates List */}
        {certificates.length === 0 ? (
          <Card className="p-8 text-center">
            <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Certificates Yet</h2>
            <p className="text-muted-foreground">
              Complete your courses with a passing grade (70%+) to receive certificates.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.map(cert => (
              <Card 
                key={cert.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedCert(cert)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-success/20">
                    <Award className="w-8 h-8 text-success" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Certificate of Passing</h3>
                    {cert.course_name && (
                      <p className="text-muted-foreground">{cert.course_name}</p>
                    )}
                    {cert.level && (
                      <p className="text-sm text-muted-foreground">Level: {cert.level}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      Issued: {format(new Date(cert.issue_date), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCert(cert);
                  }}
                >
                  <Award className="w-4 h-4 mr-2" />
                  See my certificate
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* Certificate Modal */}
        <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-center">Certificate of Passing</DialogTitle>
            </DialogHeader>
            
            {selectedCert && (
              <div className="p-8 text-center border-4 border-double border-primary rounded-lg bg-gradient-to-b from-card to-muted/30">
                <div className="mb-6">
                  <Award className="w-20 h-20 mx-auto text-primary" />
                </div>
                
                <h2 className="text-3xl font-bold text-primary mb-4">
                  Certificate of Passing
                </h2>
                
                <p className="text-lg text-muted-foreground mb-6">
                  This is to certify that
                </p>
                
                <h3 className="text-2xl font-bold mb-6">
                  {studentName}
                </h3>
                
                <p className="text-lg text-muted-foreground mb-4">
                  has successfully completed and passed
                </p>
                
                {selectedCert.course_name && (
                  <p className="text-xl font-semibold text-primary mb-2">
                    {selectedCert.course_name}
                  </p>
                )}
                
                {selectedCert.level && (
                  <p className="text-lg mb-6">
                    Level: {selectedCert.level}
                  </p>
                )}
                
                <p className="text-2xl font-bold text-success mb-8">
                  You passed. Congratulations!
                </p>
                
                <div className="pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Date of Issue: {format(new Date(selectedCert.issue_date), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentCertificates;
