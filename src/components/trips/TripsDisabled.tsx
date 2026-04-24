import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function TripsDisabled() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-4 max-w-xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl">Group Trips is coming soon</h1>
            <p className="text-muted-foreground text-sm">
              This module is not available yet. Check back later, or contact support if you'd like early access.
            </p>
            <Button asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
