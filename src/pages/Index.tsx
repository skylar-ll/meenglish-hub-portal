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
import { supabase } from "@/integrations/supabase/client";
import { OfferCard } from "@/components/shared/OfferCard";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.jpeg";

interface Offer {
  id: string;
  offer_name: string;
  offer_description: string | null;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  status: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOffers();
  }, []);

  const fetchActiveOffers = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("status", "active")
        .lte("start_date", now)
        .gte("end_date", now)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActiveOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const portals = [
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

      {/* Active Offers Section */}
      {!loading && activeOffers.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 animate-fade-in">
            {language === "ar" ? "✨ عروضنا الحالية" : "✨ Current Offers"}
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            {language === "ar" 
              ? "لا تفوتي هذه العروض الخاصة!" 
              : "Don't miss these special offers!"}
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {activeOffers.map((offer, index) => (
              <div
                key={offer.id}
                className="animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <OfferCard
                  offerName={offer.offer_name}
                  offerDescription={offer.offer_description}
                  discountPercentage={offer.discount_percentage}
                  startDate={offer.start_date}
                  endDate={offer.end_date}
                  language={language}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeOffers.length === 0 && (
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground text-lg">
            {language === "ar" 
              ? "✨ لا توجد عروض حالياً — ترقبي عروضنا القادمة!" 
              : "✨ No offers right now — check back soon for something special!"}
          </p>
        </div>
      )}

      {/* Student Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-8 animate-slide-up">
          {t('home.studentPortal')}
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          {t('home.studentDesc')}
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16">
          <Card
            className="card-interactive p-8 bg-card hover:bg-gradient-to-br hover:from-card hover:to-muted/50 animate-scale-in"
            onClick={() => navigate("/student/login")}
          >
            <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-center">{t('home.studentLogin')}</h3>
            
            <p className="text-sm text-center text-muted-foreground mb-4">
              {t('home.studentLoginDesc')}
            </p>

            <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              {t('common.login')}
            </Button>
          </Card>

          <Card
            className="card-interactive p-8 bg-card hover:bg-gradient-to-br hover:from-card hover:to-muted/50 animate-scale-in"
            style={{ animationDelay: "100ms" }}
            onClick={() => navigate("/student/signup")}
          >
            <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-center">{t('home.newStudentRegistration')}</h3>
            
            <p className="text-sm text-center text-muted-foreground mb-4">
              {t('home.newStudentRegistrationDesc')}
            </p>

            <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              {t('common.signup')}
            </Button>
          </Card>
        </div>
      </div>

      {/* Teacher Section */}
      <div className="container mx-auto px-4 py-12 bg-muted/30">
        <h2 className="text-3xl font-bold text-center mb-8 animate-slide-up">
          {t('home.teacherPortal')}
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          {t('home.teacherDesc')}
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16">
          <Card
            className="card-interactive p-8 bg-card hover:bg-gradient-to-br hover:from-card hover:to-muted/50 animate-scale-in"
            onClick={() => navigate("/teacher/login")}
          >
            <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-center">{t('home.teacherLogin')}</h3>
            
            <p className="text-sm text-center text-muted-foreground mb-4">
              {t('home.teacherLoginDesc')}
            </p>

            <Button className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90">
              {t('common.login')}
            </Button>
          </Card>

          <Card
            className="card-interactive p-8 bg-card hover:bg-gradient-to-br hover:from-card hover:to-muted/50 animate-scale-in"
            style={{ animationDelay: "100ms" }}
            onClick={() => navigate("/teacher/login?signup=true")}
          >
            <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-center">{t('home.newTeacherRegistration')}</h3>
            
            <p className="text-sm text-center text-muted-foreground mb-4">
              {t('home.newTeacherRegistrationDesc')}
            </p>

            <Button className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90">
              {t('common.signup')}
            </Button>
          </Card>
        </div>
      </div>

      {/* Admin Portal Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12 animate-slide-up">
          {t('home.administration')}
        </h2>

        <div className="grid md:grid-cols-1 gap-6 max-w-md mx-auto">
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
