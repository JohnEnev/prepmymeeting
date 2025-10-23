export default function DataDeletionPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1>Data Deletion Instructions</h1>

      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        At PrepMyMeeting, we respect your privacy and your right to control your personal data.
      </p>

      <h2 style={{ marginTop: '30px' }}>How to Request Data Deletion</h2>

      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        If you would like to delete your account and all associated data from PrepMyMeeting,
        please follow one of these methods:
      </p>

      <h3 style={{ marginTop: '25px' }}>Method 1: Via WhatsApp/Telegram</h3>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        Send a message to our bot with the command:
      </p>
      <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', fontSize: '14px' }}>
        /delete_my_data
      </pre>
      <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#777', marginTop: '10px' }}>
        You will receive a confirmation message once your data has been deleted.
      </p>

      <h3 style={{ marginTop: '25px' }}>Method 2: Email Request</h3>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        Send an email to:{' '}
        <a href="mailto:enevoldsen.j@gmail.com" style={{ color: '#0066cc' }}>
          enevoldsen.j@gmail.com
        </a>
      </p>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        Include the following information:
      </p>
      <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555' }}>
        <li>Subject line: &quot;Data Deletion Request - PrepMyMeeting&quot;</li>
        <li>Your WhatsApp phone number or Telegram username</li>
        <li>Confirmation that you want all your data deleted</li>
      </ul>

      <h2 style={{ marginTop: '30px' }}>What Data Will Be Deleted</h2>

      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        Upon your request, we will permanently delete:
      </p>
      <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555' }}>
        <li>Your user profile (name, phone number/username, platform)</li>
        <li>All conversation history</li>
        <li>All generated meeting preparation checklists</li>
        <li>Submitted links and their associated data</li>
        <li>User preferences and settings</li>
        <li>Calendar connection data (if connected)</li>
        <li>All stored calendar events and notifications</li>
      </ul>

      <h2 style={{ marginTop: '30px' }}>Timeline</h2>

      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        Data deletion requests are processed within <strong>30 days</strong> of receiving your request.
        In most cases, deletion occurs within <strong>48 hours</strong>.
      </p>

      <h2 style={{ marginTop: '30px' }}>Verification</h2>

      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        To protect your privacy and prevent unauthorized deletion requests, we may ask you to
        verify your identity by responding from the same WhatsApp number or Telegram account
        associated with your PrepMyMeeting account.
      </p>

      <h2 style={{ marginTop: '30px' }}>Questions?</h2>

      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#555' }}>
        If you have any questions about data deletion or our data practices, please contact us at{' '}
        <a href="mailto:enevoldsen.j@gmail.com" style={{ color: '#0066cc' }}>
          enevoldsen.j@gmail.com
        </a>
      </p>

      <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <p style={{ fontSize: '14px', color: '#999', textAlign: 'center' }}>
        Last updated: October 23, 2025
      </p>
    </div>
  );
}
