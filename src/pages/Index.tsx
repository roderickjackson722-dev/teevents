import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import heroGolf from "@/assets/hero-golf.jpg";
import logoWhite from "@/assets/logo-white.png";
import iconBlack from "@/assets/icon-black.png";

const Index = () => {
  return (
    <Layout>
      {/* Hero */}
      <HeroSection
        backgroundImage={heroGolf}
        title=""
        height="h-screen"
      >
        <img src={logoWhite} alt="TeeVents Golf" className="h-40 w-40 mx-auto mb-6 object-contain" />
        <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground text-shadow-hero">
          Golf Tournament Planning & Consulting
        </h2>
      </HeroSection>

      {/* Mission */}
      <section className="bg-golf-cream py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-secondary mb-4">
              Mission
            </h3>
            <p className="text-lg md:text-xl text-foreground/80 leading-relaxed">
              Let the professionals make your golf tournament a success. Our professional relationships
              and experience allow us to reduce hours of planning and provide an exceptional experience
              for your golf tournament. Our team has years of experience in the golf industry and will
              search for all of the fine details to make your tournament special.
            </p>
            <p className="mt-8 text-xl md:text-2xl font-display italic text-primary">
              "Let us help create your perfect golf event"
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img src={iconBlack} alt="" className="h-16 w-16 mx-auto mb-6 invert opacity-80" />
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              TeeVents Golf Mgt.
            </h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8 text-lg">
              We encourage you to start your planning a year in advance of the event. We are confident
              that we will provide a service that will have you ready to book for the following year!
            </p>
            <Link
              to="/services"
              className="inline-block bg-secondary text-secondary-foreground px-8 py-3 rounded-md font-semibold tracking-wider uppercase text-sm hover:bg-secondary/90 transition-colors"
            >
              Learn More About Our Services
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
