import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Calendar, BookOpen, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const TeacherDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("teacherSession");
    navigate("/");
  };

  // Mock students data
  const students = [
    { id: 1, name: "Ahmed Al-Rashid", nameAr: "أحمد الراشد", course: "Level 5", progress: 5, branch: "Dammam" },
    { id: 2, name: "Fatima Hassan", nameAr: "فاطمة حسن", course: "Level 3", progress: 2, branch: "Online" },
    { id: 3, name: "Mohammed Ali", nameAr: "محمد علي", course: "Level 7", progress: 6, branch: "Khobar" },
    { id: 4, name: "Sarah Abdullah", nameAr: "سارة عبدالله", course: "Speaking Class", progress: 4, branch: "Dhahran" },
    { id: 5, name: "Omar Ibrahim", nameAr: "عمر إبراهيم", course: "Level 2", progress: 1, branch: "Dammam" },
  ];

  const stats = [
    { label: "Total Students", value: students.length, icon: Users, color: "from-primary to-secondary" },
    { label: "Active Classes", value: "3", icon: BookOpen, color: "from-secondary to-accent" },
    { label: "Pending Attendance", value: "12", icon: Calendar, color: "from-accent to-primary" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in flex justify-between items-start">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              Teacher Dashboard
            </h1>
            <p className="text-xl text-muted-foreground" dir="rtl">
              لوحة المعلم
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={stat.label}
              className="p-6 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Button className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-secondary to-accent hover:opacity-90">
            <Calendar className="w-6 h-6" />
            <span>Mark Attendance</span>
          </Button>
          <Button className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-accent to-primary hover:opacity-90">
            <BookOpen className="w-6 h-6" />
            <span>Upload Lessons</span>
          </Button>
          <Button className="p-6 h-auto flex-col gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            <FileText className="w-6 h-6" />
            <span>Create Quiz</span>
          </Button>
        </div>

        {/* Students List */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">My Students</h2>
          <div className="space-y-4">
            {students.map((student) => (
              <Card key={student.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{student.name}</h3>
                    <p className="text-sm text-muted-foreground" dir="rtl">
                      {student.nameAr}
                    </p>
                  </div>
                  <Badge variant="secondary">{student.branch}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Course</p>
                    <p className="font-medium">{student.course}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="font-medium">{student.progress} / 8 parts</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Course Progress</span>
                    <span className="font-medium">{Math.round((student.progress / 8) * 100)}%</span>
                  </div>
                  <Progress value={(student.progress / 8) * 100} className="h-2" />
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
