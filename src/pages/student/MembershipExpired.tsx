import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import logo from "@/assets/logo-new.png";

const MembershipExpired = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleRenew = () => {
    navigate("/student/renew");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <img 
          src={logo} 
          alt="Modern Education Center" 
          className="h-16 mx-auto object-contain"
        />
        
        <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-destructive">
            {language === 'ar' ? 'انتهت صلاحية العضوية' : 'Membership Expired'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'لا يمكنك الوصول إلى هذا الحساب إلا إذا قمت بتجديد عضويتك.'
              : 'You cannot access this account unless you renew your membership.'}
          </p>
        </div>

        <Button 
          onClick={handleRenew} 
          size="lg" 
          className="w-full gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          {language === 'ar' ? 'تجديد العضوية' : 'Renew Membership'}
        </Button>
      </Card>
    </div>
  );
};

export default MembershipExpired;
