import Layout from "@/components/Layout";

const PrivacyPolicy = () => {
  return (
    <Layout>
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: March 2, 2026</p>

          <div className="prose prose-lg max-w-none space-y-6 text-foreground/80">
            <h2 className="font-display text-2xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly, such as your name, email address, phone number, and payment information when you register for an account, create a tournament, or register as a player.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send communications, and comply with legal obligations.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share information with tournament organizers (for registration purposes), payment processors (Stripe), and service providers who assist in operating our platform.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">4. Payment Processing</h2>
            <p>Payments are processed through Stripe. We do not store your full credit card information on our servers. Please review Stripe's privacy policy for details on their data handling practices.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">5. Data Security</h2>
            <p>We implement reasonable security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">6. Your Rights</h2>
            <p>You may access, update, or delete your personal information by contacting us. You may also opt out of marketing communications at any time.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">7. Cookies</h2>
            <p>We use cookies and similar technologies to maintain sessions, remember preferences, and analyze usage patterns.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">8. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of material changes by posting the new policy on this page.</p>

            <h2 className="font-display text-2xl font-semibold text-foreground">9. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us through our <a href="/contact" className="text-secondary hover:underline">Contact page</a>.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PrivacyPolicy;
