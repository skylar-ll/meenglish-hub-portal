import { GraduationCap, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import logo from "@/assets/logo-new.png";

const Index = () => {
  const navigate = useNavigate();

  const portals = [
    {
      title: "Student Portal",
      titleAr: "بوابة الطالب",
      icon: GraduationCap,
      description: "Register, select courses, and track your progress",
      descriptionAr: "سجل، اختر الدورات، وتتبع تقدمك",
      path: "/student/signup",
      gradient: "from-primary to-secondary",
    },
    {
      title: "Teacher Portal",
      titleAr: "بوابة المعلم",
      icon: Users,
      description: "Manage students, mark attendance, and upload lessons",
      descriptionAr: "إدارة الطلاب، تسجيل الحضور، ورفع الدروس",
      path: "/teacher/login",
      gradient: "from-secondary to-accent",
    },
    {
      title: "Admin Portal",
      titleAr: "بوابة الإدارة",
      icon: BarChart3,
      description: "View analytics, manage payments, and oversee operations",
      descriptionAr: "عرض التحليلات، إدارة المدفوعات، والإشراف على العمليات",
      path: "/admin/login",
      gradient: "from-accent to-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Top Logo Bar */}
      <div className="bg-card/50 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-center items-center gap-6">
          <img 
            src={logo} 
            alt="Modern Education Center" 
            className="h-24 object-contain"
          />
          <div className="text-left">
            <p className="text-lg md:text-xl text-foreground/80">
              Modern Education Institute of Languages
            </p>
            <p className="text-base md:text-lg text-foreground/60" dir="rtl">
              المعهد الحديث للتعليم واللغات
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" />
        <div className="relative container mx-auto px-4 py-12 text-center">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Welcome to Modern Education Center
            </h1>
          </div>
        </div>
      </div>

      {/* Portals Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12 animate-slide-up">
          Choose Your Portal
          <span className="block text-xl text-muted-foreground mt-2" dir="rtl">
            اختر بوابتك
          </span>
        </h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {portals.map((portal, index) => (
            <Card
              key={portal.title}
              className="card-interactive p-8 bg-card hover:bg-gradient-to-br hover:from-card hover:to-muted/50 animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(portal.path)}
            >
              <div className={`w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br ${portal.gradient} flex items-center justify-center mx-auto`}>
                <portal.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-2 text-center">{portal.title}</h3>
              <p className="text-lg text-center mb-4 text-muted-foreground" dir="rtl">
                {portal.titleAr}
              </p>
              
              <p className="text-sm text-center text-muted-foreground mb-2">
                {portal.description}
              </p>
              <p className="text-sm text-center text-muted-foreground" dir="rtl">
                {portal.descriptionAr}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p>© 2024 Modern Education Institute of Languages. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Index;
