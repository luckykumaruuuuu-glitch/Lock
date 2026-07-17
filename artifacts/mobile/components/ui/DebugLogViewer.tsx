/**
 * DebugLogViewer — floating draggable debug icon + log panel.
 *
 * Completely separate from DuckPal / ReelOverlay — this is a pure JS/RN
 * component that lives in the app's React tree. It is NEVER confused with
 * the native WindowManager overlays used by DuckPal or ReelsLock.
 *
 * Shown only when Settings → "Show Debug Log Icon" is ON.
 * Drag the icon anywhere on screen. Tap to open the log panel.
 * Panel has "Copy All" and "Clear" buttons.
 */

import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDebugLog } from "@/context/DebugLogContext";
import { clearDebugLogs, getAllDebugLogs } from "@/lib/debugLogger";

const { width: W, height: H } = Dimensions.get("window");

// Starting position: bottom-right, clear of any system UI
const ICON_SIZE = 46;
const INIT_X = W - ICON_SIZE - 14;
const INIT_Y = H - ICON_SIZE - 160;

export function DebugLogViewer() {
  const { showDebugIcon } = useDebugLog();

  if (!showDebugIcon || Platform.OS !== "android") return null;

  return <DebugIconInner />;
}

function DebugIconInner() {
  const insets = useSafeAreaInsets();

  // Current absolute position of the floating icon
  const posX = useRef(INIT_X);
  const posY = useRef(INIT_Y);
  const viewRef = useRef<View>(null);

  // Whether the user dragged (to suppress tap → open on drag-release)
  const didDrag = useRef(false);

  const [panelVisible, setPanelVisible] = useState(false);
  const [logs, setLogs] = useState("");
  const [copied, setCopied] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        didDrag.current = false;
      },

      onPanResponderMove: (_evt, gs) => {
        if (Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3) didDrag.current = true;

        const nx = Math.max(0, Math.min(W - ICON_SIZE, posX.current + gs.dx));
        const ny = Math.max(
          insets.top,
          Math.min(H - ICON_SIZE - insets.bottom, posY.current + gs.dy),
        );
        viewRef.current?.setNativeProps({ style: { left: nx, top: ny } });
      },

      onPanResponderRelease: (_evt, gs) => {
        posX.current = Math.max(0, Math.min(W - ICON_SIZE, posX.current + gs.dx));
        posY.current = Math.max(
          insets.top,
          Math.min(H - ICON_SIZE - insets.bottom, posY.current + gs.dy),
        );
        if (!didDrag.current) openPanel();
      },
    }),
  ).current;

  async function openPanel() {
    const text = await getAllDebugLogs();
    setLogs(text || "(No logs captured yet — run a permission check first)");
    setCopied(false);
    setPanelVisible(true);
  }

  async function handleCopyAll() {
    await Clipboard.setStringAsync(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleClear() {
    await clearDebugLogs();
    setLogs("(Cleared)");
  }

  return (
    <>
      {/* ── Floating icon ─────────────────────────────────── */}
      <View
        ref={viewRef}
        {...panResponder.panHandlers}
        style={[styles.floatingIcon, { left: INIT_X, top: INIT_Y }]}
      >
        <Feather name="terminal" size={20} color="#FFFFFF" />
      </View>

      {/* ── Log panel modal ───────────────────────────────── */}
      <Modal
        visible={panelVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPanelVisible(false)}
      >
        <View style={[styles.panel, { paddingTop: insets.top + 12 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => setPanelVisible(false)}
              style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="x" size={18} color="#8E8E93" />
            </Pressable>

            <Text style={styles.title}>Debug Logs</Text>

            <View style={styles.headerActions}>
              <Pressable
                onPress={handleClear}
                style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Feather name="trash-2" size={16} color="#FF6B35" />
              </Pressable>

              <Pressable
                onPress={handleCopyAll}
                style={({ pressed }) => [
                  styles.copyBtn,
                  { opacity: pressed ? 0.6 : 1 },
                  copied && styles.copyBtnDone,
                ]}
              >
                <Feather name={copied ? "check" : "copy"} size={14} color={copied ? "#4CAF50" : "#FFFFFF"} />
                <Text style={[styles.copyBtnLabel, copied && { color: "#4CAF50" }]}>
                  {copied ? "Copied!" : "Copy All"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Log text */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.logText} selectable>
              {logs}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingIcon: {
    position: "absolute",
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#3A3A3C",
    alignItems: "center",
    justifyContent: "center",
    // Raise above normal content but below system bars
    zIndex: 9990,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },

  panel: {
    flex: 1,
    backgroundColor: "#000000",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2C2C2E",
    gap: 10,
  },

  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },

  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1C1C1E",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#3A3A3C",
  },
  copyBtnDone: {
    borderColor: "#4CAF50",
  },
  copyBtnLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  logText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#E5E5EA",
    lineHeight: 18,
    // Monospace fallback — RN doesn't have a universal mono font
    // but the small size + line-height keeps it readable
    letterSpacing: 0.1,
  },
});
