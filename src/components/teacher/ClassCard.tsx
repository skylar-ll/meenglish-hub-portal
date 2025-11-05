import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, BookOpen } from "lucide-react";

interface ClassCardProps {
  className: string;
  timing: string;
  courses?: string[];
  levels?: string[];
  students: Array<{
    id: string;
    full_name_en: string;
  }>;
}

export const ClassCard = ({ className, timing, courses, levels, students }: ClassCardProps) => {
  return (
    <Card className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{className}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{timing}</span>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {students.length}
        </Badge>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="text-sm flex-1">
            <p className="text-muted-foreground mb-1">Courses:</p>
            <div className="flex flex-wrap gap-1">
              {courses && courses.length > 0 ? (
                courses.map((course, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {course}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">No courses assigned</span>
              )}
            </div>
          </div>
        </div>
        {levels && levels.length > 0 && (
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Levels:</p>
            <div className="flex flex-wrap gap-1">
              {levels.map((level, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {level}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t">
        <p className="text-xs text-muted-foreground mb-2">
          {students.length === 0 
            ? "No students enrolled yet" 
            : `Enrolled Students (${students.length}):`
          }
        </p>
        {students.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {students.slice(0, 5).map((student) => (
              <Badge key={student.id} variant="outline" className="text-xs">
                {student.full_name_en}
              </Badge>
            ))}
            {students.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{students.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
