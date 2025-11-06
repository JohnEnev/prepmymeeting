import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "80px 24px"
      }}>
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h1 style={{
            fontSize: 56,
            margin: 0,
            color: "#fff",
            fontWeight: 700,
            letterSpacing: "-0.02em"
          }}>
            PrepMyMeeting
          </h1>
          <p style={{
            color: "rgba(255, 255, 255, 0.9)",
            marginTop: 16,
            fontSize: 20,
            lineHeight: 1.6,
            maxWidth: 560,
            margin: "16px auto 0"
          }}>
            Get ready for any meeting with tailored question checklists, voice chat, and calendar context.
          </p>
        </div>

        {/* CTA Cards */}
        <div style={{
          display: "grid",
          gap: 20,
          marginBottom: 48,
          maxWidth: 500,
          margin: "0 auto 48px"
        }}>
          {/* Telegram - Recommended */}
          <Link href="https://t.me/prepmymeeting_bot" target="_blank" style={{
            display: "block",
            background: "#fff",
            padding: 24,
            borderRadius: 16,
            textDecoration: "none",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
            transition: "transform 0.2s, box-shadow 0.2s",
            position: "relative",
            border: "3px solid #229ED9"
          }}>
            <div style={{
              position: "absolute",
              top: -12,
              right: 16,
              background: "#229ED9",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.5px"
            }}>
              RECOMMENDED
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 56,
                height: 56,
                background: "#229ED9",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28
              }}>
                ✈️
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#1a1a1a"
                }}>
                  Telegram Bot
                </h3>
                <p style={{
                  margin: "4px 0 0",
                  color: "#666",
                  fontSize: 14
                }}>
                  Full features, stable & tested
                </p>
              </div>
              <div style={{ fontSize: 24, color: "#229ED9" }}>→</div>
            </div>
          </Link>

          {/* WhatsApp - Beta */}
          <Link href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""}`} target="_blank" style={{
            display: "block",
            background: "#fff",
            padding: 24,
            borderRadius: 16,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            transition: "transform 0.2s, box-shadow 0.2s",
            position: "relative",
            opacity: 0.85
          }}>
            <div style={{
              position: "absolute",
              top: -12,
              right: 16,
              background: "#ff9500",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.5px"
            }}>
              BETA
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 56,
                height: 56,
                background: "#25D366",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28
              }}>
                💬
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#1a1a1a"
                }}>
                  WhatsApp Bot
                </h3>
                <p style={{
                  margin: "4px 0 0",
                  color: "#666",
                  fontSize: 14
                }}>
                  Currently in testing phase
                </p>
              </div>
              <div style={{ fontSize: 24, color: "#25D366" }}>→</div>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: 20,
          padding: 40,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)"
        }}>
          <h2 style={{
            fontSize: 28,
            marginBottom: 24,
            color: "#1a1a1a",
            fontWeight: 700
          }}>
            What it does
          </h2>
          <ul style={{
            lineHeight: 2,
            color: "#444",
            fontSize: 16,
            paddingLeft: 24,
            margin: 0
          }}>
            <li>Ask what to prepare for doctors, contractors, interviews, and more</li>
            <li>Paste links (job posts, listings, profiles) to tailor the checklist</li>
            <li>Use voice to brainstorm and save outcomes to calendar notes</li>
          </ul>
        </div>

        {/* Footer */}
        <footer style={{
          marginTop: 64,
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: 14
        }}>
          <span>© {new Date().getFullYear()} PrepMyMeeting</span>
        </footer>
      </div>
    </main>
  );
}
