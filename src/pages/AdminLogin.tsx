import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock, Mail } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checkAuthRateLimit } from "@/lib/authRateLimit";
import { recordSecurityEvent } from "@/lib/security.functions";
import aboutBg from "@/assets/golf-about-bg.jpg";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const rl = await checkAuthRateLimit("login");
    if (!rl.allowed) {
      setLoading(false);
      toast({ title: "Too many attempts", description: rl.message, variant: "destructive" });
      return;
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      const check = await recordSecurityEvent({
        data: { actionType: "login_failed", userEmail: email, details: { surface: "admin" } },
      }).catch(() => null);
      toast({ title: "Login Failed", description: check?.message || error.message, variant: "destructive" });
      return;
    }

    const check = await recordSecurityEvent({
      data: {
        actionType: "login",
        userEmail: email,
        userId: signInData?.user?.id ?? null,
        details: { surface: "admin" },
      },
    }).catch(() => null);
    if (check && check.allow === false) {
      await supabase.auth.signOut();
      setLoading(false);
      toast({ title: "Sign-in blocked", description: check.message || "Access denied.", variant: "destructive" });
      return;
    }


    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast({ title: "Error", description: "Could not verify user.", variant: "destructive" });
      return;
    }

    const { data: roles } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });

    if (!roles) {
      await supabase.auth.signOut();
      setLoading(false);
      toast({ title: "Access Denied", description: "You do not have admin privileges.", variant: "destructive" });
      return;
    }

    setLoading(false);
    navigate("/admin");
    toast({ title: "Welcome, Admin!", description: "You've been logged in successfully." });
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Enter your admin email first.", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);

    if (error) {
      toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Password reset sent", description: "Check your email for the secure reset link." });
  };

  return (
    <Layout>
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${aboutBg})` }} />
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
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">Admin Login</h1>
              <p className="text-muted-foreground text-sm mt-2">Access the management dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="Email" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="Password" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <Button type="button" variant="link" disabled={resetLoading || loading} onClick={handlePasswordReset} className="w-full text-secondary">
                {resetLoading ? "Sending reset..." : "Forgot or changed password?"}
              </Button>
            </form>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default AdminLogin;
