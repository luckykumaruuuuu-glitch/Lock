import { useState } from "react";

const rows = [
  { rank: 1, name: "You", score: 0, isMe: true },
  { rank: 2, name: "Invite your Sibling 👊", score: null, isMe: false },
  { rank: 3, name: "Invite your Crush ❤️", score: null, isMe: false },
  { rank: 4, name: "Invite your Bestie 🧡", score: null, isMe: false },
  { rank: 5, name: "Invite a Rival 😈", score: null, isMe: false },
];

export default function BattleScreen() {
  const [period, setPeriod] = useState("Today");

  const periods = ["Yesterday", "Today", "This Week"];

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--app-font-sans)",
        paddingBottom: 90,
      }}
    >
      {/* Brown header */}
      <div
        className="brown-header"
        style={{
          padding: "52px 20px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Avatar */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                background: "#8B4513",
                border: "2px solid #E8A030",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                overflow: "hidden",
              }}
            >
              🏆
            </div>
            <span
              style={{
                color: "#E8A030",
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: 2,
              }}
            >
              SCROLL BATTLE
            </span>
          </div>
          <button
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
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="9"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M23 21v-2a4 4 0 0 0-3-3.87"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M16 3.13a4 4 0 0 1 0 7.75"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Friends
          </button>
        </div>

        {/* Period selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <button
            onClick={() => {
              const idx = periods.indexOf(period);
              if (idx > 0) setPeriod(periods[idx - 1]);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#aaa",
              cursor: "pointer",
              fontSize: 18,
              padding: "4px 8px",
            }}
          >
            ‹
          </button>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
            {period}
          </span>
          <button
            onClick={() => {
              const idx = periods.indexOf(period);
              if (idx < periods.length - 1) setPeriod(periods[idx + 1]);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#aaa",
              cursor: "pointer",
              fontSize: 18,
              padding: "4px 8px",
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Leaderboard rows */}
      <div style={{ flex: 1 }}>
        {rows.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid #111",
              background: row.isMe ? "#0D0D0D" : "transparent",
            }}
          >
            {/* Rank */}
            {row.isMe ? (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #F5C878, #E8A030)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 16 }}>🥇</span>
              </div>
            ) : (
              <span
                style={{
                  color: "#555",
                  fontWeight: 500,
                  fontSize: 16,
                  marginRight: 14,
                  width: 36,
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                {row.rank}
              </span>
            )}

            {/* Avatar */}
            {row.isMe && (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#8B4513",
                  border: "2px solid #E8A030",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  marginRight: 12,
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                😊
              </div>
            )}

            {/* Name */}
            <span
              style={{
                color: row.isMe ? "#fff" : "#666",
                fontWeight: row.isMe ? 700 : 500,
                fontSize: 15,
                flex: 1,
              }}
            >
              {row.name}
            </span>

            {/* Score or Invite button */}
            {row.isMe ? (
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                {row.score}
              </span>
            ) : (
              <button className="peach-btn-sm">Invite</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
