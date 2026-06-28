import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import HomeScreen from "@/screens/HomeScreen";
import PermissionsScreen from "@/screens/PermissionsScreen";
import BattleScreen from "@/screens/BattleScreen";
import ProfileScreen from "@/screens/ProfileScreen";

function AppShell() {
  const [activeTab, setActiveTab] = useState<"home" | "battle">("home");
  const [screen, setScreen] = useState<"home" | "permissions" | "profile">("home");

  if (screen === "permissions") {
    return <PermissionsScreen onBack={() => setScreen("home")} />;
  }
  if (screen === "profile") {
    return <ProfileScreen onBack={() => setScreen("home")} />;
  }

  return (
    <div className="screen">
      {activeTab === "home" ? (
        <HomeScreen
          onGetStarted={() => setScreen("permissions")}
          onProfile={() => setScreen("profile")}
        />
      ) : (
        <BattleScreen />
      )}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: "home" | "battle";
  onTabChange: (tab: "home" | "battle") => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        background: "#0A0A0A",
        borderTop: "1px solid #1E1E1E",
        display: "flex",
        paddingBottom: 24,
        paddingTop: 12,
        zIndex: 100,
      }}
    >
      <button
        onClick={() => onTabChange("home")}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: activeTab === "home" ? "#fff" : "#555",
          fontSize: 11,
          fontWeight: activeTab === "home" ? 600 : 400,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="8"
            r="5"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M3 21c0-4.418 4.03-8 9-8s9 3.582 9 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        You
      </button>
      <button
        onClick={() => onTabChange("battle")}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: activeTab === "battle" ? "#E8A030" : "#555",
          fontSize: 11,
          fontWeight: activeTab === "battle" ? 600 : 400,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M14.5 17.5L3 6V3h3l11.5 11.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 19l3.5-3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="19" cy="5" r="2" fill="#E8A030" />
        </svg>
        Battle
      </button>
    </div>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={AppShell} />
      </Switch>
    </WouterRouter>
  );
}

export default App;
