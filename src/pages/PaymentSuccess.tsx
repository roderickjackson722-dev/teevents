import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoBlack from "@/assets/logo-black.png";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "starter";
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-golf-cream flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          </motion.div>
          <img src={logoBlack} alt="TeeVents" className="h-12 w-12 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground mb-2">
            You've purchased the <span className="font-semibold capitalize">{plan}</span> plan.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Now create your account to start building your tournament.
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate("/get-started")}
          >
            Create Your Account
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
