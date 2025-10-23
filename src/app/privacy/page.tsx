export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1>Privacy Policy</h1>
      <p style={{ fontSize: '14px', color: '#999' }}>Last updated: October 23, 2025</p>

      <h2 style={{ marginTop: '30px' }}>Introduction</h2>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        PrepMyMeeting ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
        explains how we collect, use, disclose, and safeguard your information when you use our meeting
        preparation assistant service via WhatsApp and Telegram.
      </p>

      <h2 style={{ marginTop: '30px' }}>Information We Collect</h2>

      <h3 style={{ marginTop: '20px' }}>Information You Provide</h3>
      <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555' }}>
        <li><strong>Account Information:</strong> WhatsApp phone number or Telegram username, name</li>
        <li><strong>Message Content:</strong> Text messages, voice messages, and links you send to our bot</li>
        <li><strong>Meeting Information:</strong> Details about your meetings that you share with us</li>
        <li><strong>Preferences:</strong> Your customization settings (tone, length, detail level)</li>
      </ul>

      <h3 style={{ marginTop: '20px' }}>Information We Collect Automatically</h3>
      <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555' }}>
        <li><strong>Usage Data:</strong> Conversation logs, timestamps, command usage</li>
        <li><strong>Technical Data:</strong> Platform (WhatsApp/Telegram), message IDs</li>
        <li><strong>Calendar Data:</strong> If you connect your Google Calendar, we access your calendar events (with your permission)</li>
      </ul>

      <h2 style={{ marginTop: '30px' }}>How We Use Your Information</h2>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        We use your information to:
      </p>
      <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555' }}>
        <li>Generate personalized meeting preparation checklists</li>
        <li>Transcribe voice messages</li>
        <li>Search the web for relevant information when requested</li>
        <li>Remember past conversations to provide contextual responses</li>
        <li>Send proactive meeting reminders (if calendar is connected)</li>
        <li>Improve our service and user experience</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2 style={{ marginTop: '30px' }}>Data Storage and Security</h2>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        Your data is stored securely on Supabase (a secure cloud database provider). We implement appropriate
        technical and organizational measures to protect your personal information, including:
      </p>
      <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555' }}>
        <li>Encrypted data transmission (HTTPS/TLS)</li>
        <li>Secure database access controls</li>
        <li>Regular security audits</li>
        <li>Limited employee access to user data</li>
      </ul>

      <h2 style={{ marginTop: '30px' }}>Third-Party Services</h2>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        We use the following third-party services that may process your data:
      </p>
      <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555' }}>
        <li><strong>OpenAI:</strong> For generating meeting prep content and processing natural language</li>
        <li><strong>Whisper (OpenAI):</strong> For transcribing voice messages</li>
        <li><strong>Perplexity AI:</strong> For web search functionality</li>
        <li><strong>Google Calendar API:</strong> For calendar integration (if you connect your calendar)</li>
        <li><strong>WhatsApp/Telegram:</strong> For message delivery</li>
        <li><strong>Supabase:</strong> For secure data storage</li>
      </ul>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        These services have their own privacy policies governing their use of your information.
      </p>

      <h2 style={{ marginTop: '30px' }}>Data Retention</h2>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        We retain your data for as long as your account is active or as needed to provide you services.
        You can request deletion of your data at any time by following the instructions on our{' '}
        <a href="/data-deletion" style={{ color: '#0066cc' }}>Data Deletion page</a>.
      </p>

      <h2 style={{ marginTop: '30px' }}>Your Rights</h2>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        You have the right to:
      </p>
      <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555' }}>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Object to processing of your data</li>
        <li>Export your data in a portable format</li>
        <li>Withdraw consent at any time</li>
      </ul>

      <h2 style={{ marginTop: '30px' }}>Children's Privacy</h2>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        Our service is not intended for children under 13 years of age. We do not knowingly collect
        personal information from children under 13.
      </p>

      <h2 style={{ marginTop: '30px' }}>Changes to This Privacy Policy</h2>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting
        the new Privacy Policy on this page and updating the "Last updated" date.
      </p>

      <h2 style={{ marginTop: '30px' }}>Contact Us</h2>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        If you have any questions about this Privacy Policy, please contact us at:{' '}
        <a href="mailto:enevoldsen.j@gmail.com" style={{ color: '#0066cc' }}>
          enevoldsen.j@gmail.com
        </a>
      </p>

      <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <p style={{ fontSize: '14px', color: '#999', textAlign: 'center' }}>
        PrepMyMeeting - Your AI Meeting Preparation Assistant
      </p>
    </div>
  );
}
