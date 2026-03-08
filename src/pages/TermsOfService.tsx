import Layout from "@/components/Layout";
import SEO from "@/components/SEO";

const TermsOfService = () => {
  return (
    <Layout>
      <SEO title="Terms of Service" description="TeeVents terms of service — the rules and guidelines for using our golf tournament platform." path="/terms-of-service" />
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: March 2, 2026</p>

          <div className="prose prose-lg max-w-none space-y-6 text-foreground/80">
            <h2 className="font-display text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using TeeVents Golf Management ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">2. Description of Service</h2>
            <p>TeeVents provides a golf tournament management platform that allows organizers to plan, manage, and execute golf tournaments, including player registration, payment processing, and event logistics.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">4. Payments & Fees</h2>
            <p>Tournament organizers agree to applicable subscription fees and transaction fees. All payments are processed through Stripe. Refund policies are determined by individual tournament organizers unless otherwise required by law.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">5. Organizer Responsibilities</h2>
            <p>Tournament organizers are responsible for the accuracy of their event information, compliance with local laws, and fulfilling obligations to registered players and sponsors.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">6. Prohibited Conduct</h2>
            <p>You may not use the Platform for any unlawful purpose, attempt to gain unauthorized access, interfere with other users' access, or submit false or misleading information.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">7. Intellectual Property</h2>
            <p>All content, trademarks, and technology on the Platform are owned by TeeVents Golf Management. You may not reproduce, distribute, or create derivative works without our written permission.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>TeeVents is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">9. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our discretion.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">10. Changes to Terms</h2>
            <p>We may modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated terms.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">11. Contact</h2>
            <p>For questions about these Terms, please reach out via our <a href="/contact" className="text-secondary hover:underline">Contact page</a>.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TermsOfService;
