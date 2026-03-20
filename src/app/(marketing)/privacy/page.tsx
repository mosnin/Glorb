export default function PrivacyPage() {
  return (
    <article className="py-16 sm:py-20 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl prose prose-sm dark:prose-invert prose-headings:tracking-tight prose-headings:font-semibold">
        <h1>Privacy Policy</h1>
        <p className="lead text-muted-foreground">Last updated: March 20, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>
          When you create an account, we collect your name, email address, and profile information
          provided through your authentication provider (Clerk). When you use our platform, we collect
          data about your agents, clusters, and chat interactions to provide the service.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve the Glorb platform</li>
          <li>Process your requests and build AI agent architectures</li>
          <li>Send you technical notices and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Monitor and analyze usage trends to improve user experience</li>
        </ul>

        <h2>3. Data Storage & Security</h2>
        <p>
          Your data is stored securely using Supabase with encryption at rest and in transit. We use
          industry-standard security measures to protect your information. Agent configurations,
          prompts, and files are stored in your private workspace and are not accessible to other users.
        </p>

        <h2>4. Data Sharing</h2>
        <p>
          We do not sell your personal information. We may share data with third-party service
          providers who assist us in operating our platform (e.g., Supabase for database, Clerk for
          authentication, Cloudflare for hosting). These providers are contractually bound to protect
          your data.
        </p>

        <h2>5. AI & Your Content</h2>
        <p>
          When you use the chat-first builder, your messages are processed by AI providers (Anthropic,
          OpenAI) to generate agent architectures. We do not use your content to train AI models. Your
          agent configurations are your intellectual property.
        </p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your account and associated data</li>
          <li>Export your agents and data at any time</li>
          <li>Opt out of non-essential communications</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. We do not use
          advertising or tracking cookies. See our Cookie Policy for more details.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. We will notify you of material changes by
          posting the new policy on this page and updating the &ldquo;last updated&rdquo; date.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have questions about this privacy policy, please contact us at{" "}
          <a href="mailto:privacy@glorb.dev">privacy@glorb.dev</a>.
        </p>
      </div>
    </article>
  );
}
