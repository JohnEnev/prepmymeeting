import Link from "next/link";

// Telegram SVG Icon
const TelegramIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8C16.49 10.38 15.84 14.22 15.51 15.99C15.37 16.74 15.09 16.99 14.83 17.01C14.25 17.07 13.81 16.64 13.25 16.27C12.37 15.69 11.87 15.33 11.02 14.77C10.03 14.12 10.67 13.76 11.24 13.18C11.39 13.03 13.95 10.7 14 10.49C14.0069 10.4582 14.006 10.4252 13.9973 10.3938C13.9886 10.3624 13.9724 10.3337 13.95 10.31C13.89 10.26 13.81 10.28 13.74 10.29C13.65 10.31 12.25 11.24 9.52 13.08C9.12 13.35 8.76 13.49 8.44 13.48C8.08 13.47 7.4 13.28 6.89 13.11C6.26 12.91 5.77 12.8 5.81 12.45C5.83 12.27 6.08 12.09 6.55 11.9C9.47 10.63 11.41 9.79 12.38 9.39C15.16 8.23 15.73 8.03 16.11 8.03C16.19 8.03 16.38 8.05 16.5 8.15C16.6 8.23 16.63 8.34 16.64 8.42C16.63 8.48 16.65 8.66 16.64 8.8Z" fill="currentColor"/>
  </svg>
);

// WhatsApp SVG Icon
const WhatsAppIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M17.472 14.382C17.015 14.155 14.765 13.042 14.361 12.893C13.957 12.744 13.663 12.669 13.368 13.127C13.074 13.584 12.182 14.644 11.926 14.938C11.671 15.232 11.415 15.27 10.958 15.043C10.5 14.816 9.027 14.341 7.268 12.778C5.894 11.556 4.973 10.049 4.717 9.591C4.462 9.134 4.69 8.898 4.917 8.671C5.122 8.466 5.374 8.134 5.601 7.879C5.828 7.624 5.904 7.445 6.053 7.151C6.202 6.857 6.127 6.602 6.014 6.375C5.904 6.148 4.973 3.898 4.607 2.983C4.249 2.089 3.891 2.206 3.619 2.193C3.363 2.18 3.069 2.18 2.775 2.18C2.481 2.18 2.006 2.293 1.602 2.751C1.198 3.208 0 4.321 0 6.571C0 8.821 1.677 10.996 1.904 11.29C2.131 11.584 4.973 15.835 9.272 17.811C10.338 18.287 11.171 18.563 11.82 18.766C12.892 19.104 13.867 19.058 14.64 18.943C15.502 18.815 17.287 17.849 17.653 16.793C18.019 15.737 18.019 14.834 17.906 14.645C17.793 14.456 17.499 14.343 17.042 14.116L17.472 14.382ZM12.038 21.8H12.034C10.267 21.8 8.534 21.324 7.018 20.423L6.657 20.205L2.882 21.197L3.888 17.521L3.647 17.145C2.656 15.577 2.134 13.774 2.134 11.928C2.134 6.984 6.118 3 11.062 3C13.457 3 15.709 3.925 17.409 5.625C19.109 7.325 20.034 9.577 20.034 11.972C20.034 16.916 16.05 20.9 11.106 20.9L12.038 21.8ZM20.472 3.528C18.424 1.48 15.711 0.4 12.867 0.4C7.022 0.4 2.267 5.155 2.267 11C2.267 12.977 2.782 14.915 3.763 16.619L2.15 21.85L7.533 20.271C9.18 21.165 11.04 21.635 12.933 21.635H12.938C18.783 21.635 23.538 16.88 23.538 11.035C23.538 8.191 22.458 5.478 20.41 3.43L20.472 3.528Z" fill="currentColor"/>
  </svg>
);

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#fafafa",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "80px 24px"
      }}>
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h1 style={{
            fontSize: 48,
            margin: 0,
            color: "#111",
            fontWeight: 600,
            letterSpacing: "-0.02em"
          }}>
            PrepMyMeeting
          </h1>
          <p style={{
            color: "#555",
            marginTop: 12,
            fontSize: 18,
            lineHeight: 1.6,
            maxWidth: 540,
            margin: "12px auto 0"
          }}>
            AI-powered meeting prep that helps you ask the right questions via chat and voice.
          </p>
        </div>

        {/* CTA Cards */}
        <div style={{
          display: "grid",
          gap: 16,
          marginBottom: 48,
          maxWidth: 480,
          margin: "0 auto 48px"
        }}>
          {/* Telegram - Recommended */}
          <Link href="https://t.me/prepmymeeting_bot" target="_blank" style={{
            display: "block",
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            textDecoration: "none",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "2px solid #0088cc",
            position: "relative",
            transition: "box-shadow 0.2s"
          }}>
            <div style={{
              position: "absolute",
              top: -10,
              right: 12,
              background: "#0088cc",
              color: "#fff",
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.3px"
            }}>
              RECOMMENDED
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                color: "#0088cc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <TelegramIcon />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 19,
                  fontWeight: 600,
                  color: "#111"
                }}>
                  Telegram
                </h3>
                <p style={{
                  margin: "2px 0 0",
                  color: "#666",
                  fontSize: 14
                }}>
                  Full features, stable & tested
                </p>
              </div>
              <div style={{ fontSize: 20, color: "#999" }}>→</div>
            </div>
          </Link>

          {/* WhatsApp - Beta */}
          <Link href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""}`} target="_blank" style={{
            display: "block",
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            textDecoration: "none",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e5e5e5",
            position: "relative",
            transition: "box-shadow 0.2s"
          }}>
            <div style={{
              position: "absolute",
              top: -10,
              right: 12,
              background: "#f59e0b",
              color: "#fff",
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.3px"
            }}>
              BETA
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                color: "#25D366",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <WhatsAppIcon />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 19,
                  fontWeight: 600,
                  color: "#111"
                }}>
                  WhatsApp
                </h3>
                <p style={{
                  margin: "2px 0 0",
                  color: "#666",
                  fontSize: 14
                }}>
                  Currently in testing phase
                </p>
              </div>
              <div style={{ fontSize: 20, color: "#999" }}>→</div>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: 32,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e5e5"
        }}>
          <h2 style={{
            fontSize: 22,
            marginBottom: 20,
            color: "#111",
            fontWeight: 600
          }}>
            What it does
          </h2>
          <ul style={{
            lineHeight: 1.8,
            color: "#555",
            fontSize: 15,
            paddingLeft: 20,
            margin: 0
          }}>
            <li>Ask what to prepare for doctors, contractors, interviews, and more</li>
            <li>Paste links (job posts, listings, profiles) to tailor the checklist</li>
            <li>Use voice to brainstorm and organize your thoughts</li>
          </ul>
        </div>

        {/* Footer */}
        <footer style={{
          marginTop: 56,
          textAlign: "center",
          color: "#999",
          fontSize: 13
        }}>
          <span>© {new Date().getFullYear()} PrepMyMeeting</span>
        </footer>
      </div>
    </main>
  );
}
