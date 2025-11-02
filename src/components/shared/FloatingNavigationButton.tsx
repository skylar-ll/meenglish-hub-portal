import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingNavigationButtonProps {
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  showBack?: boolean;
  showNext?: boolean;
  className?: string;
}

export const FloatingNavigationButton = ({
  onNext,
  onBack,
  nextLabel = "Next",
  backLabel = "Back",
  loading = false,
  disabled = false,
  showBack = false,
  showNext = true,
  className,
}: FloatingNavigationButtonProps) => {
  return (
    <>
      {/* Mobile: Floating circles in bottom-right corner */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col gap-3 md:hidden",
        className
      )}>
        {showNext && (
          <Button
            onClick={onNext}
            disabled={loading || disabled}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all hover:scale-105"
            aria-label={nextLabel}
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <ArrowRight className="h-6 w-6" />
            )}
          </Button>
        )}
        
        {showBack && (
          <Button
            onClick={onBack}
            disabled={loading}
            size="icon"
            variant="outline"
            className="h-12 w-12 rounded-full shadow-lg bg-background hover:bg-muted transition-all hover:scale-105"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Desktop: Sticky footer bar with buttons */}
      <div className={cn(
        "hidden md:block fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t",
        className
      )}>
        <div className="container max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {showBack ? (
              <Button
                onClick={onBack}
                disabled={loading}
                variant="outline"
                size="lg"
                className="transition-all hover:scale-105"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {backLabel}
              </Button>
            ) : (
              <div /> /* Spacer for flex layout */
            )}
            
            {showNext && (
              <Button
                onClick={onNext}
                disabled={loading || disabled}
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all hover:scale-105 min-w-[120px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    {nextLabel}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Add padding to page content to prevent overlap with sticky footer on desktop */}
      <div className="hidden md:block h-20" />
    </>
  );
};
