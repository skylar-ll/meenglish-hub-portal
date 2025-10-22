import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const TimingSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Registration Steps Complete
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            You have completed all registration steps
          </p>
        </div>

        {/* Home Button Card */}
        <Card className="p-8 animate-slide-up">
          <div className="space-y-6 text-center">
            <p className="text-lg text-muted-foreground">
              Please return to the home page
            </p>
            <Button
              onClick={() => navigate("/")}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('student.home')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TimingSelection;
