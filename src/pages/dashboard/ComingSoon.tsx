import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
}

const ComingSoon = ({ title, description }: ComingSoonProps) => {
  return (
    <div className="text-center py-20 bg-card rounded-lg border border-border">
      <Construction className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
      <h1 className="text-2xl font-display font-bold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground">
        {description || "This feature is coming soon. Stay tuned!"}
      </p>
    </div>
  );
};

export default ComingSoon;
