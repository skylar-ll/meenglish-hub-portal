import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

const BranchSelection = () => {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState("");

  const branches = [
    {
      value: "online",
      label: "Online Classes",
      labelAr: "الفصول الافتراضية",
      description: "Learn from anywhere with our virtual classrooms",
      descriptionAr: "تعلم من أي مكان مع فصولنا الافتراضية",
    },
    {
      value: "dammam",
      label: "Dammam Branch",
      labelAr: "فرع الدمام",
      description: "Main campus in Dammam",
      descriptionAr: "الحرم الرئيسي في الدمام",
    },
    {
      value: "dhahran",
      label: "Dhahran Branch",
      labelAr: "فرع الظهران",
      description: "Located in Dhahran",
      descriptionAr: "يقع في الظهران",
    },
    {
      value: "khobar",
      label: "Khobar Branch",
      labelAr: "فرع الخبر",
      description: "Located in Khobar",
      descriptionAr: "يقع في الخبر",
    },
  ];

  const handleNext = () => {
    if (!selectedBranch) {
      toast.error("Please select a branch");
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    const branchData = {
      ...registration,
      branch: selectedBranch,
    };
    sessionStorage.setItem("studentRegistration", JSON.stringify(branchData));
    navigate("/student/payment");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/course-selection")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Branch Selection
          </h1>
          <p className="text-xl text-muted-foreground" dir="rtl">
            اختيار الفرع
          </p>
        </div>

        {/* Branch Selection Form */}
        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <Label>Select Your Preferred Branch</Label>
            <RadioGroup value={selectedBranch} onValueChange={setSelectedBranch}>
              <div className="space-y-4">
                {branches.map((branch) => (
                  <Card
                    key={branch.value}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedBranch === branch.value
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedBranch(branch.value)}
                  >
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value={branch.value} id={branch.value} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-primary" />
                          <Label
                            htmlFor={branch.value}
                            className="text-base font-semibold cursor-pointer"
                          >
                            {branch.label}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {branch.description}
                        </p>
                        <p className="text-sm text-muted-foreground" dir="rtl">
                          {branch.labelAr} - {branch.descriptionAr}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>

            <Button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
              size="lg"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BranchSelection;
