import { Link } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";

interface PlanGateProps {
  feature: string;
  children: React.ReactNode;
}

const PlanGate = ({ feature, children }: PlanGateProps) => {
  const { hasFeature, requiredPlan, plan, loading } = usePlanFeatures();

  if (loading) return <>{children}</>;
  if (hasFeature(feature)) return <>{children}</>;

  const needed = requiredPlan(feature);

  return (
    <div>
      {/* Upgrade Banner */}
      <div className="mb-6 rounded-lg border border-secondary/30 bg-secondary/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-display font-bold text-foreground mb-1">
              Upgrade to {needed.charAt(0).toUpperCase() + needed.slice(1)} to unlock this feature
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Your current <span className="font-semibold capitalize">{plan}</span> plan doesn't include this feature.
              Upgrade to get access to more powerful tools and lower transaction fees.
            </p>
            <Button asChild>
              <Link to="/dashboard/upgrade">
                View Upgrade Options
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Blurred content preview */}
      <div className="relative">
        <div className="opacity-30 pointer-events-none select-none blur-[2px]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PlanGate;
