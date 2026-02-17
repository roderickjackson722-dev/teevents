import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Lock, Mail } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import aboutBg from "@/assets/golf-about-bg.jpg";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Placeholder — real auth will use Lovable Cloud
    setTimeout(() => {
      setLoading(false);
      // For demo, navigate to dashboard
      navigate("/dashboard");
      toast({ title: "Welcome!", description: "You've been logged in successfully." });
    }, 800);
  };

  return (
    <Layout>
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${aboutBg})` }}
        />
        <div className="absolute inset-0 bg-overlay-green" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="bg-card rounded-lg shadow-xl p-8 border border-border">
            <div className="text-center mb-8">
              <div className="h-14 w-14 rounded-full bg-primary mx-auto flex items-center justify-center mb-4">
                <LogIn className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">Coach Login</h1>
              <p className="text-muted-foreground text-sm mt-2">
                Access the tournament coaches database
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Contact the tournament organizer for login credentials
            </p>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default Login;
