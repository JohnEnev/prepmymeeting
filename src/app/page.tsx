import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      maxWidth: 800,
      margin: "0 auto",
      padding: "64px 24px",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    }}>
      <h1 style={{ fontSize: 40, margin: 0 }}>PrepMyMeeting</h1>
      <p style={{ color: "#666", marginTop: 12 }}>
        Get ready for any meeting with tailored question checklists, voice chat, and calendar context.
      </p>

      <div style={{ marginTop: 32 }}>
        <Link href="https://t.me/prepmymeeting_bot" target="_blank" style={{
          display: "inline-block",
          background: "#229ED9",
          color: "#fff",
          padding: "12px 18px",
          borderRadius: 8,
          textDecoration: "none",
          fontWeight: 600
        }}>
          Open Telegram Bot
        </Link>
      </div>

      <div style={{ marginTop: 24, color: "#888" }}>
        <p style={{ margin: 0 }}>Don’t have Telegram yet? Install it and return to this link.</p>
      </div>

      <section style={{ marginTop: 48 }}>
        <h2 style={{ fontSize: 24, marginBottom: 8 }}>What it does</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>Ask what to prepare for doctors, contractors, interviews, and more</li>
          <li>Paste links (job posts, listings, profiles) to tailor the checklist</li>
          <li>Use voice to brainstorm and save outcomes to calendar notes</li>
        </ul>
      </section>

      <footer style={{ marginTop: 64, color: "#aaa", fontSize: 14 }}>
        <span>© {new Date().getFullYear()} PrepMyMeeting</span>
      </footer>
    </main>
  );
}
