export default function HomeScreen({
  onGetStarted,
  onProfile,
}: {
  onGetStarted: () => void;
  onProfile: () => void;
}) {
  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: 90,
        fontFamily: "var(--app-font-sans)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "56px 24px 24px",
        }}
      >
        <span
          style={{
            color: "#E8A030",
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: 1,
            fontStyle: "italic",
          }}
        >
          BRAINPAL
        </span>
        <button
          onClick={onProfile}
          style={{
            background: "#1C1C1E",
            border: "none",
            borderRadius: 999,
            padding: "8px 16px",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          English
        </button>
      </div>

      {/* Phone frame mockup */}
      <div style={{ position: "relative", marginTop: 8, marginBottom: 32 }}>
        <div
          className="phone-frame"
          style={{
            width: 240,
            height: 300,
            background: "#111",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Gradient overlay content */}
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              padding: 12,
              position: "relative",
            }}
          >
            {/* Simulated reel action icons */}
            <div
              style={{
                position: "absolute",
                right: 10,
                bottom: 60,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignItems: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    stroke="white"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                <div style={{ color: "#fff", fontSize: 9, marginTop: 2 }}>
                  124k
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="white"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                <div style={{ color: "#fff", fontSize: 9, marginTop: 2 }}>
                  3.9k
                </div>
              </div>
            </div>

            {/* User info bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: "#555",
                  border: "1px solid #777",
                }}
              />
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>
                @username
              </span>
            </div>
            <div style={{ color: "#ccc", fontSize: 10 }}>#trending...</div>
          </div>

          {/* Brain counter overlay */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              background: "rgba(90, 50, 10, 0.92)",
              borderRadius: 999,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 22 }}>🧠</span>
            <span
              style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}
            >
              42
            </span>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <h1
        style={{
          color: "#fff",
          fontWeight: 800,
          fontSize: 28,
          textAlign: "center",
          margin: "0 0 24px",
          lineHeight: 1.2,
          padding: "0 24px",
        }}
      >
        See your reels count
      </h1>

      {/* Platform icons */}
      <div
        style={{
          display: "flex",
          gap: 28,
          marginBottom: 32,
          alignItems: "center",
        }}
      >
        {/* Instagram */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="5"
            stroke="#555"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="4" stroke="#555" strokeWidth="2" />
          <circle cx="17.5" cy="6.5" r="1" fill="#555" />
        </svg>
        {/* TikTok-style */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"
            stroke="#555"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {/* Snapchat */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C8.5 2 6 4.5 6 8v1.5c-.8.3-2 .5-2.5 1.5 0 .5.5.8 1 1-.5 1-1.5 1.5-1.5 2s.5 1 2 1c.5 1.5 1.5 2.5 3 3-.5.3-.5.5-.5 1 0 .8 2 1 3.5 1s3.5-.2 3.5-1c0-.5 0-.7-.5-1 1.5-.5 2.5-1.5 3-3 1.5 0 2-.5 2-1s-1-1-1.5-2c.5-.2 1-.5 1-1C19.5 11 18.8 10.8 18 10.5V8c0-3.5-2.5-6-6-6Z"
            stroke="#555"
            strokeWidth="2"
          />
        </svg>
        {/* Facebook */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
            stroke="#555"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Get Started button */}
      <div style={{ padding: "0 24px", width: "100%" }}>
        <button
          className="peach-btn"
          onClick={onGetStarted}
          style={{
            width: "100%",
            padding: "18px 0",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
