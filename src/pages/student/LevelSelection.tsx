import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNavigationButton } from "@/components/shared/FloatingNavigationButton";
import { useBranchFiltering } from "@/hooks/useBranchFiltering";
import { useFormConfigurations } from "@/hooks/useFormConfigurations";
import { useTeacherCourseMapping } from "@/hooks/useTeacherCourseMapping";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LevelOption {
  id: string;
  config_key: string;
  config_value: string;
  display_order: number;
}

const LevelSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [levelOptions, setLevelOptions] = useState<LevelOption[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const { filteredOptions } = useBranchFiltering(branchId);
  const { courses } = useFormConfigurations();
  const { getTeacherForLevel, getTeacherForCourse } = useTeacherCourseMapping(branchId);

  useEffect(() => {
    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    setBranchId(registration.branch_id || null);
    fetchLevelOptions();
  }, []);

  const fetchLevelOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('form_configurations')
        .select('*')
        .eq('config_type', 'level')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      setLevelOptions(data || []);
    } catch (error: any) {
      toast.error("Failed to load level options");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Helpers for matching
  const extractLevelKey = (val: string): string | null => {
    if (!val) return null;
    const m = val.toLowerCase().match(/level[\s\-_]?(\d{1,2})/i);
    return m ? `level-${m[1]}` : null;
  };

  const normalize = (str: string) =>
    (str || "")
      .toLowerCase()
      .trim()
      .replace(/[\s\-_]/g, "")
      .replace(/[أإآا]/g, "ا")
      .replace(/[ىي]/g, "ي");

  const handleNext = () => {
    if (!selectedChoice) {
      toast.error("Please select your starting level or course");
      return;
    }

    const registration = JSON.parse(sessionStorage.getItem("studentRegistration") || "{}");
    registration.course_level = selectedChoice;
    sessionStorage.setItem("studentRegistration", JSON.stringify(registration));

    navigate("/student/timing-selection");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 flex items-center justify-center">
        <p className="text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <div className="mb-8 text-center animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/course-selection")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('student.back')}
          </Button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Choose your starting level or course
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Select one option based on your branch availability
          </p>
        </div>

        <Card className="p-8 animate-slide-up">
          <div className="space-y-6">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Select one option
            </Label>

            <Select value={selectedChoice} onValueChange={setSelectedChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select level or course" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>English program</SelectLabel>
                  {levelOptions
                    .filter((lvl) => {
                      if (!branchId || filteredOptions.allowedLevelKeys.length === 0) return true;
                      const key = extractLevelKey(lvl.config_key);
                      return key ? filteredOptions.allowedLevelKeys.includes(key) : false;
                    })
                    .map((lvl) => {
                      const teacherName = getTeacherForLevel(lvl.config_value);
                      return (
                        <SelectItem key={lvl.id} value={lvl.config_value}>
                          {lvl.config_value}{teacherName ? ` — ${teacherName}` : ''}
                        </SelectItem>
                      );
                    })}
                </SelectGroup>

                <SelectSeparator />

                <SelectGroup>
                  <SelectLabel>Speaking program</SelectLabel>
                  <SelectItem
                    value="Speaking class"
                    disabled={branchId ? !filteredOptions.allowedCourses.some((ac) => {
                      const a = normalize(ac); const b = normalize('Speaking class');
                      return a.includes(b) || b.includes(a);
                    }) : false}
                  >
                    Speaking class
                  </SelectItem>
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>Private class</SelectLabel>
                  <SelectItem
                    value="1:1 class - private class كلاس فردي"
                    disabled={branchId ? !filteredOptions.allowedCourses.some((ac) => {
                      const a = normalize(ac); const b = normalize('1:1 class - private class كلاس فردي');
                      return a.includes(b) || b.includes(a);
                    }) : false}
                  >
                    1:1 class - private class كلاس فردي
                  </SelectItem>
                </SelectGroup>

                <SelectSeparator />

                <SelectGroup>
                  <SelectLabel>Other languages</SelectLabel>
                  {courses
                    .filter((c) => c.category === 'Other languages')
                    .map((c) => {
                      const disabled = branchId ? !filteredOptions.allowedCourses.some((ac) => {
                        const a = normalize(ac); const b = normalize(c.value);
                        return a.includes(b) || b.includes(a);
                      }) : false;
                      const teacherName = !disabled ? getTeacherForCourse(c.value) : null;
                      return (
                        <SelectItem key={c.id} value={c.label} disabled={disabled}>
                          {c.label}{teacherName ? ` — ${teacherName}` : ''}
                        </SelectItem>
                      );
                    })}
                </SelectGroup>
              </SelectContent>
            </Select>

            {branchId && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Available timings for your branch: {filteredOptions.allowedTimings.join(', ') || '—'}
                </p>
              </div>
            )}

            <Button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity md:hidden"
              size="lg"
            >
              {t('student.next')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
        
        <FloatingNavigationButton
          onNext={handleNext}
          onBack={() => navigate("/student/course-selection")}
          nextLabel={t('student.next')}
          backLabel={t('student.back')}
          showBack={true}
          showNext={true}
        />
      </div>
    </div>
  );
};

export default LevelSelection;
