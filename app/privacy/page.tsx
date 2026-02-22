import type { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: 'Privacy Policy | Trainomics',
  description: 'Trainomics privacy policy. Learn how we collect, use, and protect your personal and health data.',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = '2026-02-21'

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
              <p className="text-muted-foreground mb-12">Last updated: {lastUpdated}</p>

              <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                {/* 1. Introduction */}
                <Section title="1. Introduction">
                  <p>
                    Trainomics (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the Trainomics platform
                    (www.trainomics.app), a training and physiological testing platform for athletes, coaches,
                    and physiotherapists. We are committed to protecting your privacy and processing your
                    personal data in accordance with the EU General Data Protection Regulation (GDPR) and
                    applicable Swedish data protection laws.
                  </p>
                  <p>
                    This Privacy Policy explains what data we collect, why we collect it, how we process it,
                    and your rights regarding your personal data.
                  </p>
                </Section>

                {/* 2. Data Controller */}
                <Section title="2. Data Controller">
                  <p>
                    The data controller responsible for processing your personal data is:
                  </p>
                  <address className="not-italic bg-muted/50 rounded-lg p-4 text-sm">
                    Trainomics<br />
                    Email: privacy@trainomics.app<br />
                    Website: www.trainomics.app
                  </address>
                </Section>

                {/* 3. Data We Collect */}
                <Section title="3. Data We Collect">
                  <h3 className="text-lg font-semibold mt-4 mb-2">3.1 Account Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Name, email address, and profile information</li>
                    <li>Authentication credentials (managed via Supabase Auth)</li>
                    <li>Role and subscription tier</li>
                    <li>Business/organization affiliation</li>
                  </ul>

                  <h3 className="text-lg font-semibold mt-4 mb-2">3.2 Health and Fitness Data</h3>
                  <p>
                    With your explicit consent, we collect and process health-related data including:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Physiological test results (VO2max, lactate thresholds, heart rate zones)</li>
                    <li>Training activities (duration, distance, heart rate, power, pace)</li>
                    <li>Daily health metrics (resting heart rate, HRV, sleep, stress)</li>
                    <li>Body composition data</li>
                    <li>Injury and rehabilitation records</li>
                  </ul>

                  <h3 className="text-lg font-semibold mt-4 mb-2">3.3 Data from Third-Party Integrations</h3>
                  <p>
                    When you connect external services, we receive data from those providers:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Garmin</strong> &mdash; Activities, daily summaries, sleep, HRV, and heart rate data via the Garmin Health API</li>
                    <li><strong>Strava</strong> &mdash; Activities, heart rate streams, and athlete profile</li>
                    <li><strong>Concept2</strong> &mdash; Ergometer workout results</li>
                  </ul>
                  <p>
                    You can disconnect any integration at any time from your account settings, which stops
                    further data collection from that service.
                  </p>

                  <h3 className="text-lg font-semibold mt-4 mb-2">3.4 Usage Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Log data (IP address, browser type, pages visited)</li>
                    <li>Feature usage patterns for service improvement</li>
                  </ul>
                </Section>

                {/* 4. How We Use Your Data */}
                <Section title="4. How We Use Your Data">
                  <p>We process your personal data for the following purposes:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Service delivery</strong> &mdash; Providing training programs, physiological test analysis, training zone calculation, and daily workout recommendations</li>
                    <li><strong>AI-powered features</strong> &mdash; Generating personalized training programs, analyzing performance trends, and providing coaching insights using AI models (data is sent to AI providers in anonymized form where possible)</li>
                    <li><strong>Integration sync</strong> &mdash; Importing and processing data from connected services (Garmin, Strava, Concept2) to provide a unified training view</li>
                    <li><strong>Communication</strong> &mdash; Sending essential service notifications, trial expiry warnings, and weekly training summaries</li>
                    <li><strong>Service improvement</strong> &mdash; Analyzing aggregated, anonymized usage patterns to improve the platform</li>
                  </ul>
                </Section>

                {/* 5. Legal Basis */}
                <Section title="5. Legal Basis for Processing">
                  <p>Under the GDPR, we rely on the following legal bases:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Contract performance (Art. 6(1)(b))</strong> &mdash; Processing necessary to provide the services you have subscribed to</li>
                    <li><strong>Explicit consent (Art. 9(2)(a))</strong> &mdash; Processing of health data, which requires your explicit consent</li>
                    <li><strong>Legitimate interest (Art. 6(1)(f))</strong> &mdash; Service improvement and security monitoring</li>
                  </ul>
                  <p>
                    You may withdraw your consent at any time by contacting us or by disconnecting
                    integrations and deleting your account.
                  </p>
                </Section>

                {/* 6. Third-Party Integrations */}
                <Section title="6. Third-Party Services and Integrations">
                  <h3 className="text-lg font-semibold mt-4 mb-2">6.1 Garmin</h3>
                  <p>
                    We use the Garmin Health API to import your fitness and health data. When you connect
                    your Garmin account, we receive activity data, daily summaries, sleep data, and heart
                    rate variability data. We store OAuth tokens securely (encrypted at rest) and access
                    only the data scopes you authorize. You can revoke access at any time via your Trainomics
                    settings or through Garmin Connect.
                  </p>

                  <h3 className="text-lg font-semibold mt-4 mb-2">6.2 Strava</h3>
                  <p>
                    We use the Strava API to import your activities and heart rate data. Connection
                    requires explicit authorization and can be revoked at any time.
                  </p>

                  <h3 className="text-lg font-semibold mt-4 mb-2">6.3 AI Providers</h3>
                  <p>
                    We use third-party AI providers (Anthropic Claude, Google Gemini, OpenAI) to power
                    AI-assisted training features. When using AI features, relevant training context is
                    sent to these providers to generate responses. We do not send your name or email
                    to AI providers. Each provider has their own privacy policy and data processing
                    agreements in place.
                  </p>

                  <h3 className="text-lg font-semibold mt-4 mb-2">6.4 Payment Processing</h3>
                  <p>
                    Payments are processed by Stripe. We do not store credit card numbers. Stripe&apos;s
                    privacy policy governs payment data processing.
                  </p>
                </Section>

                {/* 7. Data Storage and Security */}
                <Section title="7. Data Storage and Security">
                  <p>
                    Your data is stored in a PostgreSQL database hosted by Supabase with the following
                    security measures:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Integration tokens (Garmin, Strava) are encrypted at rest using AES-256</li>
                    <li>All data transfers use TLS/HTTPS encryption</li>
                    <li>Role-based access control ensures coaches only see their assigned athletes</li>
                    <li>Multi-tenant architecture with strict data isolation between organizations</li>
                    <li>Regular security monitoring and access logging</li>
                  </ul>
                </Section>

                {/* 8. Data Retention */}
                <Section title="8. Data Retention">
                  <p>
                    We retain your personal data for as long as your account is active or as needed to
                    provide services. Specifically:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Account data</strong> &mdash; Retained until account deletion</li>
                    <li><strong>Training and health data</strong> &mdash; Retained until account deletion or upon request</li>
                    <li><strong>Integration tokens</strong> &mdash; Deleted when you disconnect an integration or delete your account</li>
                    <li><strong>Temporary OAuth state</strong> &mdash; Automatically deleted after 10 minutes</li>
                    <li><strong>AI conversation history</strong> &mdash; Retained until account deletion</li>
                  </ul>
                  <p>
                    After account deletion, we remove your personal data within 30 days, except where
                    retention is required by law.
                  </p>
                </Section>

                {/* 9. Your Rights */}
                <Section title="9. Your Rights (GDPR)">
                  <p>Under the GDPR, you have the following rights:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Access</strong> &mdash; Request a copy of your personal data</li>
                    <li><strong>Rectification</strong> &mdash; Correct inaccurate personal data</li>
                    <li><strong>Erasure</strong> &mdash; Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
                    <li><strong>Data portability</strong> &mdash; Receive your data in a structured, machine-readable format</li>
                    <li><strong>Restriction</strong> &mdash; Request restriction of processing</li>
                    <li><strong>Objection</strong> &mdash; Object to processing based on legitimate interest</li>
                    <li><strong>Withdraw consent</strong> &mdash; Withdraw consent for health data processing at any time</li>
                  </ul>
                  <p>
                    To exercise any of these rights, contact us at{' '}
                    <a href="mailto:privacy@trainomics.app" className="text-primary hover:underline">
                      privacy@trainomics.app
                    </a>.
                    We will respond within 30 days.
                  </p>
                </Section>

                {/* 10. International Transfers */}
                <Section title="10. International Data Transfers">
                  <p>
                    Your data may be processed by third-party services (AI providers, Supabase) located
                    outside the EU/EEA. In such cases, we ensure appropriate safeguards are in place,
                    including Standard Contractual Clauses (SCCs) or adequacy decisions by the European
                    Commission.
                  </p>
                </Section>

                {/* 11. Children */}
                <Section title="11. Children&apos;s Privacy">
                  <p>
                    Trainomics is not intended for use by individuals under the age of 16. We do not
                    knowingly collect personal data from children. If you believe we have collected data
                    from a child, please contact us immediately.
                  </p>
                </Section>

                {/* 12. Changes */}
                <Section title="12. Changes to This Policy">
                  <p>
                    We may update this Privacy Policy from time to time. We will notify you of significant
                    changes via email or an in-app notification. The &quot;Last updated&quot; date at the
                    top of this page reflects the most recent revision.
                  </p>
                </Section>

                {/* 13. Contact */}
                <Section title="13. Contact Us">
                  <p>
                    If you have questions about this Privacy Policy or our data practices, contact us at:
                  </p>
                  <address className="not-italic bg-muted/50 rounded-lg p-4 text-sm">
                    Trainomics<br />
                    Email: <a href="mailto:privacy@trainomics.app" className="text-primary hover:underline">privacy@trainomics.app</a><br />
                    Website: www.trainomics.app
                  </address>
                  <p>
                    You also have the right to lodge a complaint with the Swedish Authority for Privacy
                    Protection (Integritetsskyddsmyndigheten, IMY) at{' '}
                    <a href="https://www.imy.se" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      www.imy.se
                    </a>.
                  </p>
                </Section>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight mb-4">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  )
}
