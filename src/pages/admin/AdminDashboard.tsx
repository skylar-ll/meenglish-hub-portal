import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, GraduationCap, CreditCard, TrendingUp, LogOut, UserCheck, UserPlus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExportDataModal } from "@/components/admin/ExportDataModal";
import AddPreviousStudentModal from "@/components/admin/AddPreviousStudentModal";
import { AttendanceRecordsModal } from "@/components/admin/AttendanceRecordsModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (studentsError) {
        console.error("Error fetching students:", studentsError);
      } else {
        setStudents(studentsData || []);
      }

      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("*")
        .order("created_at", { ascending: false });

      if (teachersError) {
        console.error("Error fetching teachers:", teachersError);
      } else {
        setTeachers(teachersData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // 1. Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }

      // 2. Verify admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        const { toast } = await import("sonner");
        toast.error('Unauthorized access');
        navigate('/admin/login');
        return;
      }

      // 3. Only then fetch data
      fetchData();
    };

    checkAuthAndFetch();
  }, []);

  const handleLogout = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    navigate("/");
  };

  const stats = [
    { labelKey: "admin.totalStudents", value: students.length.toString(), icon: Users, change: "+12%", color: "from-primary to-secondary" },
    { labelKey: "admin.totalTeachers", value: teachers.length.toString(), icon: UserCheck, change: "+2", color: "from-secondary to-accent" },
    { labelKey: "admin.revenue", value: "125,400", icon: CreditCard, change: "+8%", color: "from-accent to-primary" },
    { labelKey: "admin.activeClasses", value: "78%", icon: GraduationCap, change: "+5%", color: "from-primary to-accent" },
  ];

  const payments = [
    { id: 1, student: "Ahmed Al-Rashid", method: "Tamara", amount: "2,400", status: "paid", date: "2024-01-15" },
    { id: 2, student: "Fatima Hassan", method: "Card", amount: "2,400", status: "paid", date: "2024-01-14" },
    { id: 3, student: "Mohammed Ali", method: "Cash", amount: "2,400", status: "pending", date: "2024-01-13" },
  ];

  const enrollmentData = [
    { month: "Sep", students: 45 },
    { month: "Oct", students: 62 },
    { month: "Nov", students: 78 },
    { month: "Dec", students: 95 },
    { month: "Jan", students: 120 },
  ];

  const performanceData = [
    { month: "Sep", graduated: 12, failing: 3 },
    { month: "Oct", graduated: 18, failing: 2 },
    { month: "Nov", graduated: 25, failing: 4 },
    { month: "Dec", graduated: 32, failing: 3 },
    { month: "Jan", graduated: 40, failing: 2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in flex justify-between items-start">
          <div>
            <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('admin.backHome')}
            </Button>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              {t('admin.dashboard')}
            </h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            {t('admin.logout')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={stat.labelKey} className="p-6 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <Badge variant="secondary" className="text-success">
                  {stat.change}
                </Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{t(stat.labelKey)}</p>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Card className="p-6">
          <Tabs defaultValue="students">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="students">{t('admin.studentsInfo')}</TabsTrigger>
              <TabsTrigger value="teachers">{t('admin.teachersInfo')}</TabsTrigger>
              <TabsTrigger value="payments">{t('student.paymentMethod')}</TabsTrigger>
              <TabsTrigger value="analytics">{t('admin.analytics')}</TabsTrigger>
              <TabsTrigger value="reports">{t('admin.reports')}</TabsTrigger>
            </TabsList>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t('admin.studentsInfo')}</h2>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowAttendanceModal(true)}
                    variant="default"
                    className="gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    View Attendance Records
                  </Button>
                  <Button 
                    onClick={() => setShowAddStudentModal(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Previous Students
                  </Button>
                  <Button 
                    onClick={() => setIsExportModalOpen(true)}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {t('admin.exportData')}
                  </Button>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No students registered yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.nameEn')}</TableHead>
                        <TableHead>{t('admin.nameAr')}</TableHead>
                        <TableHead>{t('student.phone')}</TableHead>
                        <TableHead>{t('student.email')}</TableHead>
                        <TableHead>{t('teacher.course')}</TableHead>
                        <TableHead>{t('admin.branch')}</TableHead>
                        <TableHead>{t('admin.payment')}</TableHead>
                        <TableHead>{t('admin.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.full_name_en}</TableCell>
                          <TableCell dir="rtl">{student.full_name_ar}</TableCell>
                          <TableCell className="text-sm">{student.phone1}</TableCell>
                          <TableCell className="text-sm">{student.email}</TableCell>
                          <TableCell>{student.program}</TableCell>
                          <TableCell>{student.branch}</TableCell>
                          <TableCell>{student.payment_method}</TableCell>
                          <TableCell>
                            <Badge variant={student.subscription_status === "active" ? "default" : "secondary"}>
                              {student.subscription_status === "active" ? t('student.active') : student.subscription_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Teachers Tab */}
            <TabsContent value="teachers" className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">{t('admin.teachersInfo')}</h2>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No teachers registered yet</div>
              ) : (
                <div className="grid gap-4">
                  {teachers.map((teacher) => (
                    <Card key={teacher.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{teacher.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{teacher.email}</p>
                          <p className="text-sm mt-2">{t('admin.assignedCourses')}: {teacher.courses_assigned || "Not assigned"}</p>
                        </div>
                        <Badge variant="secondary">{teacher.student_count} {t('admin.students')}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">{t('admin.paymentManagement')}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.student')}</TableHead>
                    <TableHead>{t('student.paymentMethod')}</TableHead>
                    <TableHead>{t('admin.amount')}</TableHead>
                    <TableHead>{t('admin.status')}</TableHead>
                    <TableHead>{t('admin.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.student}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>{payment.amount}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                          {payment.status === "paid" ? t('admin.paid') : t('admin.pending')}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">{t('admin.analyticsInsights')}</h2>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">{t('admin.enrollmentTrend')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={enrollmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="students" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">{t('admin.studentPerformance')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="graduated" fill="hsl(var(--success))" />
                    <Bar dataKey="failing" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">{t('admin.reportsExport')}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-2">{t('admin.studentDataReport')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('admin.studentDataReportDesc')}
                  </p>
                  <Button className="w-full">{t('admin.exportCSV')}</Button>
                </Card>
                
                <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-2">{t('admin.paymentReport')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('admin.paymentReportDesc')}
                  </p>
                  <Button className="w-full">{t('admin.exportPDF')}</Button>
                </Card>
                
                <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-2">{t('admin.teacherPerformanceReport')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('admin.teacherPerformanceReportDesc')}
                  </p>
                  <Button className="w-full">{t('admin.exportCSV')}</Button>
                </Card>
                
                <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-2">{t('admin.analyticsSummary')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('admin.analyticsSummaryDesc')}
                  </p>
                  <Button className="w-full">{t('admin.exportPDF')}</Button>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Export Modal */}
      <ExportDataModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
      />

      {/* Add Previous Student Modal */}
      <AddPreviousStudentModal
        open={showAddStudentModal}
        onOpenChange={setShowAddStudentModal}
        onStudentAdded={fetchData}
      />

      {/* Attendance Records Modal */}
      <AttendanceRecordsModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
      />
    </div>
  );
};

export default AdminDashboard;
