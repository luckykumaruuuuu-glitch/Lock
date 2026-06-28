export default function PermissionsScreen({ onBack }: { onBack: () => void }) {
  const permissions = [
    {
      title: "Display over other apps",
      subtitle: "To show count on screen",
      enabled: true,
    },
    {
      title: "Background",
      subtitle: "To keep app running",
      enabled: false,
    },
    {
      title: "Accessibility",
      subtitle: "To count activity",
      enabled: false,
    },
  ];

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--app-font-sans)",
        padding: "0 24px",
        paddingBottom: 100,
      }}
    >
      {/* Back arrow */}
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

      {/* Title */}
      <h1
        style={{
          color: "#fff",
          fontWeight: 800,
          fontSize: 30,
          lineHeight: 1.2,
          marginBottom: 48,
          margin: "0 0 48px",
        }}
      >
        Enable permissions to start counting
      </h1>

      {/* Permission rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {permissions.map((perm, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 32,
              marginBottom: 8,
              borderBottom: idx < permissions.length - 1 ? "none" : "none",
            }}
          >
            <div>
              <div
                style={{
                  color: perm.enabled ? "#fff" : "#555",
                  fontWeight: perm.enabled ? 700 : 600,
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                {perm.title}
              </div>
              <div
                style={{
                  color: perm.enabled ? "#aaa" : "#444",
                  fontSize: 13,
                }}
              >
                {perm.subtitle}
              </div>
            </div>
            {perm.enabled && (
              <button
                className="peach-btn"
                style={{
                  padding: "10px 22px",
                  fontSize: 15,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                Allow
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom pill info bar */}
      <div
        style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 48px)",
          maxWidth: 382,
          background: "#1C1C1E",
          borderRadius: 999,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              background: "#E8A030",
              borderRadius: 999,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>
            Why should I give this permission?
          </span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 18l6-6-6-6"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
