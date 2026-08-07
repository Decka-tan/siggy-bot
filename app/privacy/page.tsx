import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Siggy Bot',
  description: 'Privacy Policy for Siggy Bot multi-dimensional cat chat application',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-text-secondary font-mono text-sm">
            Last Updated: August 5, 2026
          </p>
        </div>

        <div className="space-y-8 text-text-secondary">
          <section className="bg-surface/40 backdrop-blur-md rounded-xl border border-white/5 rounded-lg p-8">
            <p className="leading-relaxed">
              At Siggy Bot, we take your privacy seriously. This Privacy Policy explains how we collect,
              use, and protect your information when you use our multi-dimensional cat chat service.
            </p>
          </section>

          <section className="bg-gradient-to-r from-accent/10 to-purple-500/10 border-l-4 border-accent rounded-r-lg p-6">
            <h3 className="text-xl font-bold text-text-primary mb-2">🔒 Privacy First</h3>
            <p className="leading-relaxed">
              We believe in transparency and user privacy. We only collect data necessary to provide
              and improve our service, and we never sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">1. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3">Discord User Information</h3>
            <p className="leading-relaxed mb-4">
              When you interact with Siggy Bot on Discord, we may collect:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Username & Display Name:</strong> Your Discord username and display name</li>
              <li><strong>User ID:</strong> Unique Discord user identifier</li>
              <li><strong>Server Information:</strong> Which servers you interact with Siggy Bot in</li>
              <li><strong>Message Content:</strong> Messages you send to Siggy Bot for processing</li>
              <li><strong>Interaction Data:</strong> Commands used, responses generated, and engagement metrics</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Chat Application Data</h3>
            <p className="leading-relaxed mb-4">
              When using the web chat application:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Conversation History:</strong> Your chat conversations with Siggy (stored locally)</li>
              <li><strong>Settings & Preferences:</strong> Theme choices, display preferences</li>
              <li><strong>Browser Information:</strong> Browser type, version, and device information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">2. How We Use Your Information</h2>
            <p className="leading-relaxed mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generate personalized AI responses from Siggy Bot</li>
              <li>Track user contributions and engagement in Discord servers</li>
              <li>Improve service quality and reliability</li>
              <li>Provide technical support and service maintenance</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Demonstrate service uptime and reliability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">3. Data Storage and Retention</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3">Discord Message Tracking</h3>
            <p className="leading-relaxed mb-4">
              For Discord bot functionality:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Only messages addressed to Siggy are stored.</strong> The bot reads a message
              when you directly @mention it in a channel the server administrator has allowed. Messages
              that do not mention the bot are not stored</li>
              <li>We keep the last 50 messages of your conversation with Siggy so the character has
              short-term memory. Older messages are dropped automatically</li>
              <li>For contribution and event tracking we store counters (a number), not the text of
              your messages</li>
              <li>Data is stored securely with appropriate access controls</li>
              <li>You can delete your conversation history and profile at any time with the
              <code className="text-accent">/reset</code> command</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Web Application</h3>
            <p className="leading-relaxed mb-4">
              For the web chat experience:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Conversation history is primarily stored in your browser's local storage</li>
              <li>We do not permanently store your web conversations on our servers</li>
              <li>Settings and preferences are saved locally in your browser</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">4. AI and Data Processing</h2>
            <p className="leading-relaxed mb-4">
              Siggy Bot uses AI technologies including OpenAI and Ritual Forge:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your messages are processed by AI models to generate responses</li>
              <li>We do not use your conversations to train or fine-tune AI models</li>
              <li>AI processing may involve third-party services (OpenAI, Ritual Forge)</li>
              <li>Message content is processed securely and not permanently stored by AI providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">5. Data Sharing and Third Parties</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3">AI Service Providers</h3>
            <p className="leading-relaxed mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>OpenAI:</strong> For AI response generation</li>
              <li><strong>Ritual Forge:</strong> For AI-powered character interactions</li>
              <li><strong>Discord API:</strong> For bot functionality and user authentication</li>
            </ul>
            <p className="leading-relaxed mt-4">
              These services have their own privacy policies and data handling practices. We only share
              the minimum data necessary for these services to function.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">No Third-Party Data Sales</h3>
            <p className="leading-relaxed">
              We do not sell, rent, or share your personal information with third parties for marketing
              or advertising purposes. Your data is only used to provide and improve the Siggy Bot service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">6. Cookies and Local Storage</h2>
            <p className="leading-relaxed mb-4">
              The web application uses:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Local Storage:</strong> To store conversation history and preferences locally</li>
              <li><strong>Session Cookies:</strong> For maintaining your session and preferences</li>
              <li><strong>No Tracking Cookies:</strong> We do not use third-party analytics or tracking cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">7. Discord Bot Privacy</h2>
            <p className="leading-relaxed mb-4">
              When using Siggy Bot on Discord:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The bot only reads and replies to messages that directly @mention it, and only in
              channels the server administrator has allowed</li>
              <li>User commands and interactions are logged for troubleshooting and abuse prevention</li>
              <li>Server administrators can configure the bot's permissions, restrict it to specific
              channels, or remove it from the server at any time</li>
              <li>Profile lookups (roles, join date) used by the <code className="text-accent">/check</code> command
              are read live from Discord at the moment the command runs and are not stored</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">8. Your Privacy Rights</h2>
            <p className="leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Deletion:</strong> Delete your conversation history and profile yourself at
              any time by running the <code className="text-accent">/reset</code> command in Discord.
              This erases your stored conversation history and user state from our database immediately</li>
              <li><strong>Opt-out:</strong> Siggy only reads a message when you choose to @mention it,
              so tracking is opt-in. To stop entirely, stop mentioning the bot and run
              <code className="text-accent">/reset</code>. Server administrators can also limit the bot
              to specific channels or remove it from the server</li>
              <li><strong>Data Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Correct:</strong> Update or correct inaccurate personal information</li>
            </ul>
            <p className="leading-relaxed mt-4">
              To exercise these rights, contact us through GitHub or Discord community servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">9. Security Measures</h2>
            <p className="leading-relaxed mb-4">We implement reasonable security measures to protect your data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Secure data storage and transmission</li>
              <li>Access controls and authentication</li>
              <li>Regular security updates and monitoring</li>
              <li>Compliance with Discord API security best practices</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">10. Children's Privacy</h2>
            <p className="leading-relaxed">
              Siggy Bot is not directed to children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you are a parent or guardian and believe
              your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">11. Changes to This Privacy Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify users of any material
              changes by updating the "Last Updated" date at the top of this page and through Discord
              announcements when applicable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">12. Contact Information</h2>
            <p className="leading-relaxed mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data
              practices, please contact us at:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>GitHub: <a href="https://github.com/Decka-tan" className="text-accent hover:underline" target="_blank">Decka-tan</a></li>
              <li>Discord: Available through community servers where Siggy Bot is active</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-4">13. Data Retention Period</h2>
            <p className="leading-relaxed mb-4">
              We retain data for the following periods:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Discord Conversation History:</strong> Last 50 messages per user, rolling.
              Deletable at any time with <code className="text-accent">/reset</code></li>
              <li><strong>Contribution & Event Counters:</strong> Numeric counters tied to your Discord
              user ID, retained until you run <code className="text-accent">/reset</code></li>
              <li><strong>User Preferences:</strong> Retained until you delete your account or change preferences</li>
              <li><strong>Web Conversations:</strong> Stored locally in your browser until cleared</li>
              <li><strong>Service Logs:</strong> Retained for 90 days for technical support and security purposes</li>
            </ul>
          </section>

          <section className="bg-surface/40 backdrop-blur-md rounded-xl border border-white/5 rounded-lg p-8">
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
