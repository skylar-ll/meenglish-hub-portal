import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, BookOpen } from "lucide-react";

interface ClassCardProps {
  className: string;
  timing: string;
  courseName: string;
  level?: string;
  students: Array<{
    id: string;
    full_name_en: string;
  }>;
}

export const ClassCard = ({ className, timing, courseName, level, students }: ClassCardProps) => {
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

      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">
          {courseName}
          {level && ` - ${level}`}
        </span>
      </div>

      <div className="pt-3 border-t">
        <p className="text-xs text-muted-foreground mb-2">Students:</p>
        <div className="flex flex-wrap gap-1">
          {students.map((student) => (
            <Badge key={student.id} variant="outline" className="text-xs">
              {student.full_name_en}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
};
