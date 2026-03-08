import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import servicesBg from "@/assets/golf-services-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you as soon as possible.",
    });
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <Layout>
      <HeroSection
        backgroundImage={servicesBg}
        title="Contact Us"
        subtitle="Let's plan your perfect golf event together"
        height="h-[50vh]"
      />

      <section className="bg-golf-cream py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-display font-bold text-primary mb-6">
                Get In Touch
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Ready to start planning? We'd love to hear from you. Reach out to schedule a
                consultation and learn how TeeVents can make your golf event a success.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-foreground">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span>info@teevents.golf</span>
                </div>
                <div className="flex items-center gap-4 text-foreground">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span>Contact us for details</span>
                </div>
                <div className="flex items-center gap-4 text-foreground">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span>Serving events across the United States</span>
                </div>
              </div>
            </motion.div>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              onSubmit={handleSubmit}
              className="bg-card p-8 rounded-lg border border-border shadow-sm space-y-5"
            >
              <Input
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                type="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Textarea
                placeholder="Tell us about your event..."
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </motion.form>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
