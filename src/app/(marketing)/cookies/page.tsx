export default function CookiePolicyPage() {
  return (
    <article className="py-16 sm:py-20 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl prose prose-sm dark:prose-invert prose-headings:tracking-tight prose-headings:font-semibold">
        <h1>Cookie Policy</h1>
        <p className="lead text-muted-foreground">Last updated: March 20, 2026</p>

        <h2>What Are Cookies</h2>
        <p>
          Cookies are small text files stored on your device when you visit a website. They help
          the site remember your preferences and improve your experience.
        </p>

        <h2>Cookies We Use</h2>

        <h3>Essential Cookies</h3>
        <p>
          These are required for the Service to function. They include authentication session
          cookies (managed by Clerk) and CSRF protection tokens. You cannot opt out of essential
          cookies.
        </p>

        <h3>Preference Cookies</h3>
        <p>
          We store your UI preferences (e.g., sidebar state, theme) in cookies to maintain your
          settings across sessions. These are first-party cookies and are not shared with third
          parties.
        </p>

        <h2>Cookies We Do Not Use</h2>
        <p>
          Glorb does not use advertising cookies, tracking pixels, or third-party analytics cookies.
          We do not share cookie data with advertisers or data brokers.
        </p>

        <h2>Managing Cookies</h2>
        <p>
          You can configure your browser to block or delete cookies. Note that blocking essential
          cookies will prevent you from using the Service. Most browsers allow you to:
        </p>
        <ul>
          <li>View what cookies are stored</li>
          <li>Delete individual or all cookies</li>
          <li>Block cookies from specific sites</li>
          <li>Block all third-party cookies</li>
        </ul>

        <h2>Contact</h2>
        <p>
          If you have questions about our use of cookies, contact us at{" "}
          <a href="mailto:privacy@glorb.dev">privacy@glorb.dev</a>.
        </p>
      </div>
    </article>
  );
}
