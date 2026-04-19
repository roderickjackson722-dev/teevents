import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HeroSectionProps {
  backgroundImage: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  height?: string;
}

const HeroSection = ({ backgroundImage, title, subtitle, children, height = "min-h-[85vh]" }: HeroSectionProps) => {
  return (
    <section
      className={`relative ${height} flex items-center justify-center overflow-hidden py-12 md:py-0`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-overlay-dark" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground text-shadow-hero leading-tight"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-primary-foreground/80 font-body max-w-2xl mx-auto"
          >
            {subtitle}
          </motion.p>
        )}
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8"
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
