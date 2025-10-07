import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Users, GraduationCap, CreditCard, TrendingUp, LogOut, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminSession");
    navigate("/");
  };

  const stats = [
    { label: "Total Students", value: students.length.toString(), icon: Users, change: "+12%", color: "from-primary to-secondary" },
    { label: "Active Teachers", value: teachers.length.toString(), icon: UserCheck, change: "+2", color: "from-secondary to-accent" },
    { label: "Revenue (SAR)", value: "125,400", icon: CreditCard, change: "+8%", color: "from-accent to-primary" },
    { label: "Course Completion", value: "78%", icon: GraduationCap, change: "+5%", color: "from-primary to-accent" },
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
              Back to Home
            </Button>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-xl text-muted-foreground" dir="rtl">
              لوحة الإدارة
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={stat.label} className="p-6 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <Badge variant="secondary" className="text-success">
                  {stat.change}
                </Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Card className="p-6">
          <Tabs defaultValue="students">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Students Management</h2>
                <Button className="bg-gradient-to-r from-primary to-secondary">
                  Export Data
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name (EN)</TableHead>
                      <TableHead>Name (AR)</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">No students registered yet</TableCell>
                      </TableRow>
                    ) : (
                      students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.full_name_en}</TableCell>
                          <TableCell dir="rtl">{student.full_name_ar}</TableCell>
                          <TableCell className="text-sm">{student.phone1}</TableCell>
                          <TableCell className="text-sm">{student.email}</TableCell>
                          <TableCell>{student.course_level || student.program}</TableCell>
                          <TableCell className="capitalize">{student.branch}</TableCell>
                          <TableCell className="capitalize">{student.payment_method}</TableCell>
                          <TableCell>
                            <Badge variant={student.subscription_status === "active" ? "default" : "secondary"}>
                              {student.subscription_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">0/8</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Teachers Tab */}
            <TabsContent value="teachers" className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">Teachers Management</h2>
              {loading ? (
                <Card className="p-8 text-center">Loading...</Card>
              ) : teachers.length === 0 ? (
                <Card className="p-8 text-center">No teachers registered yet</Card>
              ) : (
                <div className="grid gap-4">
                  {teachers.map((teacher) => (
                    <Card key={teacher.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{teacher.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{teacher.email}</p>
                          <p className="text-sm mt-2">Courses: {teacher.courses_assigned || 'Not assigned yet'}</p>
                        </div>
                        <Badge variant="secondary">{teacher.student_count} Students</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">Payment Management</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Amount (SAR)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
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
                          {payment.status}
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
              <h2 className="text-2xl font-bold mb-4">Analytics & Insights</h2>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Student Enrollment Trend</h3>
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
                <h3 className="text-lg font-semibold mb-4">Student Performance</h3>
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
              <h2 className="text-2xl font-bold mb-4">Reports & Export</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-2">Student Data Report</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export complete student information including attendance and progress
                  </p>
                  <Button className="w-full">Export CSV</Button>
                </Card>
                
                <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-2">Payment Report</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export payment history and transaction details
                  </p>
                  <Button className="w-full">Export PDF</Button>
                </Card>
                
                <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-2">Teacher Performance Report</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export teacher statistics and student outcomes
                  </p>
                  <Button className="w-full">Export CSV</Button>
                </Card>
                
                <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <h3 className="font-semibold mb-2">Analytics Summary</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export comprehensive analytics and trends
                  </p>
                  <Button className="w-full">Export PDF</Button>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
