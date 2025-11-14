import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CourseAndLevelSelectorProps {
  selectedBranchId: string | null;
  formData: {
    branch: string;
    courses: string[];
    selectedLevels: string[];
  };
  englishLevelOptions: Array<{ id: string; config_key: string; config_value: string; display_order: number }>;
  coursesByCategory: Record<string, Array<{ id: string; value: string; label: string; category: string; price: number }>>;
  filteredOptions: {
    allowedTimings: string[];
    allowedLevels: string[];
    allowedCourses: string[];
    allowedLevelKeys: string[];
  };
  onCourseToggle: (courseValue: string) => void;
  onLevelToggle: (levelValue: string) => void;
  extractLevelKey: (val: string) => string | null;
  normalize: (str: string) => string;
}

export const CourseAndLevelSelector = ({
  selectedBranchId,
  formData,
  englishLevelOptions,
  coursesByCategory,
  filteredOptions,
  onCourseToggle,
  onLevelToggle,
  extractLevelKey,
  normalize,
}: CourseAndLevelSelectorProps) => {
  return (
    <>
      {/* Show selected branch info */}
      {formData.branch && (
        <div className="p-3 bg-primary/10 rounded-lg">
          <p className="text-sm font-medium">Selected Branch: {formData.branch}</p>
          {filteredOptions.allowedTimings.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Available timings for your branch: {filteredOptions.allowedTimings.join(", ")}
            </p>
          )}
        </div>
      )}

      {!selectedBranchId ? (
        <Card className="p-4 text-sm text-muted-foreground">
          Loading branch information...
        </Card>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* English Program Levels */}
            {englishLevelOptions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">English Program (Select your starting level)</h3>
                <div className="space-y-2">
                  {englishLevelOptions.map((level) => {
                    const key = extractLevelKey(level.config_key) || extractLevelKey(level.config_value);
                    const isAvailable = selectedBranchId
                      ? (key
                          ? filteredOptions.allowedLevelKeys.includes(key)
                          : filteredOptions.allowedLevels.some((al) => {
                              const a = normalize(al);
                              const b = normalize(level.config_value);
                              return a.includes(b) || b.includes(a);
                            }))
                      : true;

                    const item = (
                      <div
                        key={level.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          isAvailable ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => isAvailable && onLevelToggle(level.config_value)}
                      >
                        <Checkbox
                          id={`level-${level.id}`}
                          checked={formData.selectedLevels?.includes(level.config_value) || false}
                          onCheckedChange={() => onLevelToggle(level.config_value)}
                          disabled={!isAvailable}
                        />
                        <Label
                          htmlFor={`level-${level.id}`}
                          className={`text-sm flex-1 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          {level.config_value}
                        </Label>
                      </div>
                    );

                    if (!isAvailable) {
                      return (
                        <TooltipProvider key={level.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>{item}</TooltipTrigger>
                            <TooltipContent>
                              <p>This option is not available for your selected branch.</p>
                              <p className="text-xs">هذا الخيار غير متاح في هذا الفرع.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }

                    return item;
                  })}
                </div>
              </div>
            )}

            {/* Courses by Category */}
            {Object.entries(coursesByCategory).map(([category, coursesInCategory]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold">{category}</h3>
                <div className="space-y-2">
                  {coursesInCategory.map((course) => {
                    const isAvailable = selectedBranchId
                      ? filteredOptions.allowedCourses.some(allowedCourse => {
                          const normalizedAllowed = normalize(allowedCourse);
                          const normalizedCourse = normalize(course.value);
                          return normalizedAllowed.includes(normalizedCourse) || 
                                 normalizedCourse.includes(normalizedAllowed);
                        })
                      : true;

                    const courseItem = (
                      <div
                        key={course.value}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          isAvailable ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => isAvailable && onCourseToggle(course.value)}
                      >
                        <Checkbox
                          id={`course-${course.value}`}
                          checked={formData.courses?.includes(course.value) || false}
                          onCheckedChange={() => onCourseToggle(course.value)}
                          disabled={!isAvailable}
                        />
                        <Label
                          htmlFor={`course-${course.value}`}
                          className={`text-sm flex-1 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          {course.label}
                        </Label>
                      </div>
                    );

                    if (!isAvailable) {
                      return (
                        <TooltipProvider key={course.value}>
                          <Tooltip>
                            <TooltipTrigger asChild>{courseItem}</TooltipTrigger>
                            <TooltipContent>
                              <p>This option is not available for your selected branch.</p>
                              <p className="text-xs">هذا الخيار غير متاح في هذا الفرع.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }

                    return courseItem;
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );
};
