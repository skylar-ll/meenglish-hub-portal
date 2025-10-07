import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const StudentSignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullNameAr: "",
    fullNameEn: "",
    phone1: "",
    phone2: "",
    email: "",
    id: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Validate required fields
    if (!formData.fullNameAr || !formData.fullNameEn || !formData.phone1 || !formData.email || !formData.id) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Store data in sessionStorage for the registration flow
    sessionStorage.setItem("studentRegistration", JSON.stringify(formData));
    navigate("/student/course-selection");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Student Registration
          </h1>
          <p className="text-xl text-muted-foreground" dir="rtl">
            تسجيل الطالب
          </p>
        </div>

        {/* Registration Form */}
        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullNameAr">Full Name (Arabic) *</Label>
              <Input
                id="fullNameAr"
                dir="rtl"
                placeholder="الاسم الكامل"
                value={formData.fullNameAr}
                onChange={(e) => handleInputChange("fullNameAr", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullNameEn">Full Name (English) *</Label>
              <Input
                id="fullNameEn"
                placeholder="Full Name"
                value={formData.fullNameEn}
                onChange={(e) => handleInputChange("fullNameEn", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone1">Primary Phone *</Label>
                <Input
                  id="phone1"
                  type="tel"
                  placeholder="+966 XXX XXX XXX"
                  value={formData.phone1}
                  onChange={(e) => handleInputChange("phone1", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone2">Secondary Phone</Label>
                <Input
                  id="phone2"
                  type="tel"
                  placeholder="+966 XXX XXX XXX"
                  value={formData.phone2}
                  onChange={(e) => handleInputChange("phone2", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id">National ID / Iqama *</Label>
              <Input
                id="id"
                placeholder="ID Number"
                value={formData.id}
                onChange={(e) => handleInputChange("id", e.target.value)}
              />
            </div>

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

export default StudentSignUp;
