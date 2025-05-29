import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | StudyLoop AI",
  description: "Privacy policy for StudyLoop AI",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            1. Information We Collect
          </h2>
          <p className="text-muted-foreground">
            We collect information that you provide directly to us, including
            your name, email address, and any other information you choose to
            provide.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            2. How We Use Your Information
          </h2>
          <p className="text-muted-foreground">
            We use the information we collect to provide, maintain, and improve
            our services, to communicate with you, and to personalize your
            experience.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            3. Information Sharing
          </h2>
          <p className="text-muted-foreground">
            We do not share your personal information with third parties except
            as described in this privacy policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <p className="text-muted-foreground">
            We take reasonable measures to help protect your personal
            information from loss, theft, misuse, and unauthorized access.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
          <p className="text-muted-foreground">
            You have the right to access, correct, or delete your personal
            information. Contact us to exercise these rights.
          </p>
        </section>
      </div>
    </div>
  );
}
