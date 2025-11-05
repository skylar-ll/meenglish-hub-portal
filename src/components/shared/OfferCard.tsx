import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OfferCardProps {
  offerName: string;
  offerDescription: string | null;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  language: string;
}

export const OfferCard = ({
  offerName,
  offerDescription,
  discountPercentage,
  startDate,
  endDate,
  language,
}: OfferCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return language === "ar"
      ? date.toLocaleDateString("ar-EG")
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getRemainingTime = () => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return language === "ar" 
        ? `ينتهي خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}`
        : `Ends in ${days} ${days === 1 ? 'day' : 'days'}`;
    }
    return language === "ar"
      ? `ينتهي خلال ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`
      : `Ends in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  };

  return (
    <Card className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-background via-primary/5 to-secondary/10 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-fade-in">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
      
      <div className="relative p-8">
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-secondary">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {offerName}
            </h3>
          </div>
        </div>

        {/* Description */}
        {offerDescription && (
          <p className="text-muted-foreground mb-6 text-base md:text-lg leading-relaxed">
            {offerDescription}
          </p>
        )}

        {/* Date range */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Calendar className="w-4 h-4" />
          <span>
            {language === "ar" 
              ? `من ${formatDate(startDate)} إلى ${formatDate(endDate)}`
              : `${formatDate(startDate)} – ${formatDate(endDate)}`}
          </span>
        </div>

        {/* Discount badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="inline-block">
            <div className="relative px-8 py-4 rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              <span className="relative text-4xl md:text-5xl font-black text-white drop-shadow-lg">
                {discountPercentage}%
              </span>
              <span className="relative text-xl md:text-2xl font-bold text-white/90 ml-2">
                {language === "ar" ? "خصم" : "OFF"}
              </span>
            </div>
          </div>
        </div>

        {/* Countdown timer */}
        <div className="mb-6 p-3 rounded-xl bg-muted/50 backdrop-blur-sm">
          <p className="text-sm font-medium text-center text-foreground/80">
            ⏰ {getRemainingTime()}
          </p>
        </div>

        {/* CTA Button */}
        <Button 
          onClick={() => navigate("/student/signup")}
          className="w-full bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 text-white font-bold py-6 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {language === "ar" ? "احصلي على العرض" : "Claim Offer"}
        </Button>
      </div>

      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/30 to-transparent rounded-bl-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary/30 to-transparent rounded-tr-full blur-2xl" />
    </Card>
  );
};
