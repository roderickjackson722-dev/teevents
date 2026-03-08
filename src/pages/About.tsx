import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import HeroSection from "@/components/HeroSection";
import aboutBg from "@/assets/golf-about-bg.jpg";

const sections = [
  {
    title: "Comprehensive Event Planning",
    text: "Our team at TeeVents takes care of every aspect of event planning, from securing the perfect venue to coordinating with vendors and managing logistics. We understand the unique requirements of golf events, and we have the expertise to ensure that every detail is meticulously planned and executed.",
  },
  {
    title: "Customized Packages",
    text: "We offer customizable event packages tailored to your specific needs and budget. Whether you are planning a corporate golf outing, a charity tournament, or a client appreciation event, we can design a package that aligns with your vision and objectives.",
  },
  {
    title: "Transparent Pricing",
    text: "Our pricing is structured to provide transparent and competitive rates, ensuring that you receive exceptional value for your investment. Our customizable packages allow you to choose the services that best suit your needs.",
  },
  {
    title: "Convenience",
    text: "As an event planner, we recognize that your time is valuable. By partnering with TeeVents, you can benefit from the convenience of having a dedicated team of professionals who will handle the intricate details of event planning.",
  },
  {
    title: "Professional Partnerships",
    text: "TeeVents has established strong partnerships with leading golf courses, vendors, and service providers, ensuring that we can offer access to premium venues, top-quality equipment, and a network of reliable industry professionals.",
  },
  {
    title: "Client Satisfaction",
    text: "At TeeVents, client satisfaction is at the heart of everything we do. We prioritize open communication, attention to detail, and a commitment to delivering exceptional results.",
  },
];

const About = () => {
  return (
    <Layout>
      <HeroSection
        backgroundImage={aboutBg}
        title="About Us"
        subtitle="TeeVents Golf Management is a full service managing company that helps create, plan, fundraise and manage golf events across the United States."
        height="h-[60vh]"
      />

      <section className="bg-golf-cream py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-foreground/80 leading-relaxed text-center mb-16"
          >
            TeeVents Golf Management specializes in golf tournament planning. We provide the expertise
            that will make your golf tournament a complete success. We work with non-profits, small to
            large groups, colleges & universities, charity fundraisers and more. We tailor our services
            to your needs to make your experience the best for both you and your clients.
          </motion.p>

          <div className="grid md:grid-cols-2 gap-8">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card p-6 rounded-lg border border-border shadow-sm"
              >
                <h3 className="font-display text-xl font-semibold text-primary mb-3">
                  {section.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {section.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-display italic text-primary-foreground max-w-3xl mx-auto px-4"
        >
          "Let us help you create your perfect golf event!"
        </motion.p>
      </section>
    </Layout>
  );
};

export default About;
