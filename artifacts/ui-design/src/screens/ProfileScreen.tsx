import { useState } from "react";

const menuItems = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="#888" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="#888" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="#888" strokeWidth="2" />
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="#888" strokeWidth="2" />
      </svg>
    ),
    label: "Widgets",
    subtitle: "See brain state in homepage",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#888" strokeWidth="2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" stroke="#888" strokeWidth="2" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#888" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#888" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    label: "Friends",
    subtitle: "",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Send Feedback",
    subtitle: "",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="2" />
        <path d="M12 8v4l3 3" stroke="#888" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    label: "Language",
    subtitle: "",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Rate us on playstore",
    subtitle: "",
  },
];

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const [timeLeft] = useState("02:59:37");

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--app-font-sans)",
        padding: "0 20px 40px",
      }}
    >
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          marginTop: 56,
          marginBottom: 32,
          background: "#1C1C1E",
          border: "none",
          borderRadius: 999,
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 999,
            background: "linear-gradient(135deg, #8B4513, #5C2D0A)",
            border: "3px solid #E8A030",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          😊
        </div>
        <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 22, margin: "0 0 4px" }}>
          User
        </h2>
        <p style={{ color: "#666", fontSize: 13, margin: 0 }}>user@example.com</p>
      </div>

      {/* PRO upgrade card */}
      <div
        className="brown-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="pro-badge">PRO</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
            Claim 70% Off
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              color: "#F5C878",
              fontWeight: 700,
              fontSize: 16,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {timeLeft}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18l6-6-6-6"
              stroke="#F5C878"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Menu items */}
      <div className="dark-card" style={{ padding: "0 16px" }}>
        {menuItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 16,
              paddingBottom: 16,
              borderBottom: idx < menuItems.length - 1 ? "1px solid #222" : "none",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                  {item.label}
                </div>
                {item.subtitle ? (
                  <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>
                    {item.subtitle}
                  </div>
                ) : null}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 18l6-6-6-6"
                stroke="#555"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
