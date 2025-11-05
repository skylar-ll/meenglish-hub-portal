import { Card } from "@/components/ui/card";
import { Info, CheckCircle, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const AutoEnrollmentInfo = () => {
  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <Info className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
              <span>Auto-Enrollment System</span>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Students are automatically enrolled in matching classes during registration
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Branch Matching</p>
                <p className="text-muted-foreground">Students auto-join classes in their selected branch</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Course & Level Matching</p>
                <p className="text-muted-foreground">Matched by selected courses and proficiency levels</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Timing Alignment</p>
                <p className="text-muted-foreground">Students join classes matching their preferred schedule</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Manual Override Available</p>
                <p className="text-muted-foreground">You can still manually assign students when creating classes</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-purple-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Start Date Sync</p>
                <p className="text-muted-foreground">Billing forms show the enrolled class's actual start date</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Only active classes with matching criteria will receive auto-enrolled students.
              Teachers see only students in their assigned classes.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
