import { GraduationCap, Users, BarChart3, Languages } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import logo from "@/assets/logo.jpeg";

const Index = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  const portals = [
    {
      title: t('home.studentPortal'),
      icon: GraduationCap,
      description: t('home.studentDesc'),
      path: "/student/signup",
      gradient: "from-primary to-secondary",
    },
    {
      title: t('home.teacherPortal'),
      icon: Users,
      description: t('home.teacherDesc'),
      path: "/teacher/login",
      gradient: "from-secondary to-accent",
    },
    {
      title: t('home.adminPortal'),
      icon: BarChart3,
      description: t('home.adminDesc'),
      path: "/admin/login",
      gradient: "from-accent to-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Top Logo Bar */}
      <div className="bg-card/50 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <img 
              src={logo} 
              alt="Modern Education Center" 
              className="h-24 object-contain"
            />
            <div className="text-left">
              <p className="text-lg md:text-xl text-foreground/80">
                {t('home.instituteName')}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-background">
                <Languages className="h-4 w-4" />
                {language === 'en' ? 'English' : 'العربية'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background z-50">
              <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('ar')} className="cursor-pointer">
                العربية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" />
        <div className="relative container mx-auto px-4 py-12 text-center">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t('home.welcome')}
            </h1>
          </div>
        </div>
      </div>

      {/* Portals Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12 animate-slide-up">
          {t('home.choosePortal')}
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
              
              <h3 className="text-2xl font-bold mb-4 text-center">{portal.title}</h3>
              
              <p className="text-sm text-center text-muted-foreground">
                {portal.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p>{t('home.copyright')}</p>
      </div>
    </div>
  );
};

export default Index;
