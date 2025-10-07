import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const CourseSelection = () => {
  const navigate = useNavigate();
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const englishLevels = [
    { value: "level-1", label: "Level 1 - المستوى الأول" },
    { value: "level-2", label: "Level 2 - المستوى الثاني" },
    { value: "level-3", label: "Level 3 - المستوى الثالث" },
    { value: "level-4", label: "Level 4 - المستوى الرابع" },
    { value: "level-5", label: "Level 5 - المستوى الخامس" },
    { value: "level-6", label: "Level 6 - المستوى السادس" },
    { value: "level-7", label: "Level 7 - المستوى السابع" },
    { value: "level-8", label: "Level 8 - المستوى الثامن" },
    { value: "level-9", label: "Level 9 - المستوى التاسع" },
    { value: "level-10", label: "Level 10 - المستوى العاشر" },
    { value: "level-11", label: "Level 11 - المستوى الحادي عشر" },
    { value: "level-12", label: "Level 12 - المستوى الثاني عشر" },
  ];

  const classTypes = [
    { value: "speaking", label: "Speaking Class - فصل المحادثة" },
    { value: "private", label: "Private Class - فصل خاص" },
    { value: "french", label: "French Language - اللغة الفرنسية" },
    { value: "spanish", label: "Spanish Language - اللغة الإسبانية" },
    { value: "german", label: "German Language - اللغة الألمانية" },
  ];

  const handleNext = () => {
    if (!selectedProgram || !selectedClass) {
      toast.error("Please select both program level and class type");
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    const courseData = {
      ...registration,
      program: selectedProgram,
      classType: selectedClass,
    };
    sessionStorage.setItem("studentRegistration", JSON.stringify(courseData));
    navigate("/student/branch-selection");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/signup")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Course Selection
          </h1>
          <p className="text-xl text-muted-foreground" dir="rtl">
            اختيار الدورة
          </p>
        </div>

        {/* Course Selection Form */}
        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>English Program Level</Label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your level" />
                </SelectTrigger>
                <SelectContent>
                  {englishLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class Type / Other Languages</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class type" />
                </SelectTrigger>
                <SelectContent>
                  {classTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Course Information</h3>
                <p className="text-sm text-muted-foreground">
                  Each English course consists of 8 parts. Your progress will be tracked throughout the program.
                </p>
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
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CourseSelection;
