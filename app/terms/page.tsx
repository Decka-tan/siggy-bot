import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Siggy Bot',
  description: 'Terms of Service for Siggy Bot multi-dimensional cat chat application',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-text-secondary font-mono text-sm">
            Last Updated: April 25, 2026
          </p>
        </div>

        <div className="space-y-8 text-text-secondary">
          <section className="bg-surface border border-border rounded-lg p-8">
            <p className="leading-relaxed">
              Welcome to Siggy Bot ("we," "our," or "us"). By using our multi-dimensional cat chat service,
              you agree to these Terms of Service. Please read them carefully.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing or using Siggy Bot, you acknowledge that you have read, understood, and agree to be
              bound by these Terms of Service and our Privacy Policy. If you do not agree with these terms,
              please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">2. Description of Service</h2>
            <p className="leading-relaxed mb-4">
              Siggy Bot is an AI-powered chat application featuring a multi-dimensional cat entity born from the
              Ritual Cosmic Forge. The service includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Interactive chat with an AI-powered cat character</li>
              <li>Visual novel storytelling experiences</li>
              <li>Discord bot integration for community servers</li>
              <li>Message tracking and contribution analysis</li>
              <li>User profile and contribution tracking</li>
            </ul>
          </section>

          <section className="bg-gradient-to-r from-accent/10 to-purple-500/10 border-l-4 border-accent rounded-r-lg p-6">
            <h3 className="text-xl font-bold text-text-primary mb-2">🐱 Important</h3>
            <p className="leading-relaxed">
              Siggy Bot is an entertainment and community service. The AI character interactions are fictional
              and for entertainment purposes only. The cat entity does not provide professional advice,
              mental health services, or real-world guidance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">3. User Responsibilities</h2>
            <p className="leading-relaxed mb-4">As a user of Siggy Bot, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be respectful to other users and the AI character</li>
              <li>Not use the service for harassment, hate speech, or harmful content</li>
              <li>Not attempt to exploit, reverse-engineer, or abuse the service</li>
              <li>Not share harmful, illegal, or inappropriate content</li>
              <li>Respect Discord's Terms of Service when using the Discord bot</li>
              <li>Understand that AI responses are generated and may not always be accurate</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">4. Discord Integration</h2>
            <p className="leading-relaxed mb-4">
              When using Siggy Bot on Discord:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We collect message data for contribution tracking and analysis</li>
              <li>User interactions may be stored for improving the service</li>
              <li>Server administrators are responsible for their community management</li>
              <li>Demonstration of service uptime is provided through automated tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">5. AI Content Generation</h2>
            <p className="leading-relaxed mb-4">
              Siggy Bot uses AI technologies including OpenAI and Ritual Forge to generate responses.
              You understand that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI responses are generated based on patterns and training data</li>
              <li>The AI character is fictional and does not have real consciousness</li>
              <li>Generated content may not always be accurate, appropriate, or suitable</li>
              <li>We are not responsible for AI-generated content or interpretations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">6. Intellectual Property</h2>
            <p className="leading-relaxed">
              The Siggy Bot service, including its name, character design, code, and visual elements,
              is owned by Decka-tan and is protected by intellectual property laws. The Ritual Forge
              brand and related technologies belong to their respective owners. Generated content and
              conversations are intended for personal, non-commercial use only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">7. Disclaimer of Warranties</h2>
            <p className="leading-relaxed mb-4">
              Siggy Bot is provided "as is" and "as available" without any warranties, expressed or implied.
              We do not guarantee that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The service will be uninterrupted or error-free</li>
              <li>AI responses will meet your expectations or be appropriate</li>
              <li>The service will be secure or free from bugs</li>
              <li>The Discord bot will maintain 100% uptime</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">8. Limitation of Liability</h2>
            <p className="leading-relaxed">
              To the fullest extent permitted by law, Decka-tan shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of Siggy Bot, including
              but not limited to AI-generated content, service interruptions, or Discord-related issues.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">9. Termination</h2>
            <p className="leading-relaxed">
              We reserve the right to suspend or terminate your access to Siggy Bot at any time, without
              prior notice, for any reason, including but not limited to violation of these Terms,
              abusive behavior, or service misuse.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">10. Changes to Terms</h2>
            <p className="leading-relaxed">
              We may update these Terms of Service from time to time. We will notify users of any material
              changes by updating the "Last Updated" date at the top of this page and through Discord
              announcements when applicable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">11. Governing Law</h2>
            <p className="leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of Indonesia.
              Any disputes arising under these terms shall be subject to the exclusive jurisdiction of
              the courts of Indonesia.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">12. Contact Information</h2>
            <p className="leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>GitHub: <a href="https://github.com/Decka-tan" className="text-accent hover:underline" target="_blank">Decka-tan</a></li>
              <li>Discord: Available through community servers</li>
            </ul>
          </section>

          <section className="bg-surface border border-border rounded-lg p-8">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-black font-bold rounded-lg hover:bg-accent/90 transition-colors"
            >
              ← Back to Siggy Bot
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
