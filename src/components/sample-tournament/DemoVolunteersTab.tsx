import { useState } from "react";
import { Users, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { sampleVolunteerShifts } from "./sampleData";

const DemoVolunteersTab = () => {
  const [shifts, setShifts] = useState(sampleVolunteerShifts);
  const { toast } = useToast();

  const handleSignUp = (index: number) => {
    setShifts((prev) => {
      const copy = [...prev];
      if (copy[index].filled < copy[index].slots) {
        copy[index] = { ...copy[index], filled: copy[index].filled + 1 };
      }
      return copy;
    });
    toast({
      title: "Demo Mode",
      description: "You've signed up for a volunteer shift! (This is a demo — no real assignment made.)",
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Volunteers can browse available shifts and sign up directly from the tournament page.
      </p>

      <div className="grid gap-4">
        {shifts.map((shift, i) => {
          const full = shift.filled >= shift.slots;
          const pct = Math.round((shift.filled / shift.slots) * 100);

          return (
            <Card key={shift.role}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary" />
                      <span className="font-semibold text-foreground">{shift.role}</span>
                      {full && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Full
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {shift.start} – {shift.end}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {shift.filled}/{shift.slots} filled
                        </span>
                        <span className="font-medium text-foreground">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  </div>
                  <Button
                    variant={full ? "outline" : "secondary"}
                    size="sm"
                    disabled={full}
                    onClick={() => handleSignUp(i)}
                  >
                    {full ? "Waitlist" : "Sign Up"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DemoVolunteersTab;
