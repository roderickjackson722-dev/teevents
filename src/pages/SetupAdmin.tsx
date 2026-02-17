import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, Mail } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import aboutBg from "@/assets/golf-about-bg.jpg";

const SetupAdmin = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("setup-admin", {
      body: { email, password },
    });

    setLoading(false);

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message || "Setup failed", variant: "destructive" });
      return;
    }

    setDone(true);
    toast({ title: "Admin created!", description: "You can now log in at /admin-login" });
  };

  return (
    <Layout>
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${aboutBg})` }} />
        <div className="absolute inset-0 bg-overlay-green" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md mx-4">
          <div className="bg-card rounded-lg shadow-xl p-8 border border-border">
            <div className="text-center mb-8">
              <Shield className="h-14 w-14 text-secondary mx-auto mb-4" />
              <h1 className="text-2xl font-display font-bold text-foreground">Setup Admin Account</h1>
              <p className="text-muted-foreground text-sm mt-2">One-time setup for the first admin</p>
            </div>
            {done ? (
              <p className="text-center text-foreground">✅ Admin account created! Go to <a href="/admin-login" className="text-secondary underline">/admin-login</a> to sign in.</p>
            ) : (
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="Admin email" className="pl-10" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="Password (min 6 chars)" className="pl-10" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create Admin Account"}
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default SetupAdmin;
