import { useState } from "react";
import { UserPlus, CreditCard, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { sampleTournament } from "./sampleData";

const DemoRegistrationTab = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast({ title: "Please fill in name and email", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({
      title: "Demo Registration Complete!",
      description: "No payment was processed. This is a preview of the registration flow.",
    });
  };

  if (submitted) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
          <h3 className="text-xl font-bold text-foreground">Registration Confirmed!</h3>
          <p className="text-muted-foreground text-sm">
            {form.name}, you're registered for the <strong>{sampleTournament.name}</strong>.
          </p>
          <Badge variant="secondary" className="text-xs">Demo Mode — No payment charged</Badge>
          <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "" }); }}>
            Register Another Player
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-secondary" />
            Register for {sampleTournament.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g. Tiger Woods"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="tiger@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Registration Fee</span>
                <span className="font-bold text-foreground">${sampleTournament.registration_fee}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Processing Fee</span>
                <span className="text-foreground">$7.50</span>
              </div>
              <div className="border-t border-border mt-2 pt-2 flex justify-between text-sm font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">${sampleTournament.registration_fee + 6}</span>
              </div>
            </div>

            <Button type="submit" variant="secondary" className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              Complete Registration (Demo)
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              This is a demo. No real payment will be processed.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoRegistrationTab;
