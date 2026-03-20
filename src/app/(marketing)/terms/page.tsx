export default function TermsPage() {
  return (
    <article className="py-16 sm:py-20 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl prose prose-sm dark:prose-invert prose-headings:tracking-tight prose-headings:font-semibold">
        <h1>Terms of Service</h1>
        <p className="lead text-muted-foreground">Last updated: March 20, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Glorb platform (&ldquo;Service&rdquo;), you agree to be bound by
          these Terms of Service. If you do not agree to these terms, please do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Glorb is an AI-powered platform for designing, building, and managing AI agent
          architectures. The Service includes a chat-first builder, agent IDE, cluster management,
          and export/integration capabilities.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          You must create an account to use the Service. You are responsible for maintaining the
          confidentiality of your account credentials and for all activities under your account. You
          must provide accurate and complete information during registration.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Build agents designed to deceive, harm, or harass others</li>
          <li>Attempt to gain unauthorized access to other users&apos; data</li>
          <li>Reverse-engineer, decompile, or disassemble the Service</li>
          <li>Use the Service to compete directly with Glorb</li>
          <li>Exceed rate limits or abuse API access</li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <p>
          You retain all rights to agent configurations, prompts, and content you create using the
          Service. Glorb retains all rights to the platform, software, and underlying technology.
          Templates published to the marketplace are subject to the marketplace license terms.
        </p>

        <h2>6. Subscription & Billing</h2>
        <p>
          Paid plans are billed monthly or annually. You may cancel at any time, and cancellation
          takes effect at the end of the current billing period. Refunds are provided at our
          discretion for the current billing period.
        </p>

        <h2>7. Service Availability</h2>
        <p>
          We strive for 99.9% uptime but do not guarantee uninterrupted access. We may perform
          maintenance with reasonable notice. We are not liable for downtime caused by factors
          outside our control.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Glorb shall not be liable for any indirect,
          incidental, special, or consequential damages arising from your use of the Service. Our
          total liability shall not exceed the amount you paid in the 12 months preceding the claim.
        </p>

        <h2>9. Termination</h2>
        <p>
          We may terminate or suspend your account if you violate these terms. Upon termination,
          you may export your data within 30 days. After 30 days, your data will be permanently
          deleted.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We may modify these terms at any time. Material changes will be communicated via email or
          an in-app notice at least 30 days before they take effect.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about these terms? Contact us at{" "}
          <a href="mailto:legal@glorb.dev">legal@glorb.dev</a>.
        </p>
      </div>
    </article>
  );
}
