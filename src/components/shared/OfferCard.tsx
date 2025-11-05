import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";
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
    <div className="relative w-full overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-r from-primary/95 via-secondary/95 to-accent/95 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.01] animate-fade-in">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      
      {/* Decorative sparkle effects */}
      <div className="absolute top-4 left-4 w-16 h-16 bg-white/20 rounded-full blur-2xl" />
      <div className="absolute bottom-4 right-4 w-20 h-20 bg-accent/30 rounded-full blur-3xl" />
      
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8">
        {/* Left section - Discount badge */}
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-3xl blur-xl" />
            <div className="relative px-8 py-6 rounded-3xl bg-white/95 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-black bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
                  {discountPercentage}%
                </div>
                <div className="text-lg font-bold text-foreground/80 mt-1">
                  {language === "ar" ? "خصم" : "OFF"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle section - Offer details */}
        <div className="flex-1 text-center md:text-left text-white">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-white/90" />
            <h3 className="text-2xl md:text-3xl font-bold drop-shadow-lg">
              {offerName}
            </h3>
          </div>
          
          {offerDescription && (
            <p className="text-white/90 text-base md:text-lg mb-3 leading-relaxed drop-shadow-md">
              {offerDescription}
            </p>
          )}
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-white/80">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Calendar className="w-4 h-4" />
              <span>
                {language === "ar" 
                  ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                  : `${formatDate(startDate)} – ${formatDate(endDate)}`}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full font-medium">
              ⏰ {getRemainingTime()}
            </div>
          </div>
        </div>

        {/* Right section - CTA Button */}
        <div className="flex-shrink-0">
          <Button 
            onClick={() => navigate("/student/signup")}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 font-bold px-8 py-6 rounded-2xl text-lg shadow-xl hover:shadow-2xl transition-all duration-300 group"
          >
            <span className="mr-2">
              {language === "ar" ? "احصلي على العرض" : "Claim Offer"}
            </span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Bottom shine effect */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  );
};
