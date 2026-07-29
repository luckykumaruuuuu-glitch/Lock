/**
 * Friend Battle — Screen 1: Leaderboard
 *
 * Opens when user taps the Friends card on the Home tab.
 * Shows 4 slots: current user always first, then up to 3 friends or invite prompts.
 * All data is real-time via Firebase RTDB.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import theme from "@/constants/theme";
import { GOOGLE_USER_PROFILE_KEY } from "@/app/google-signin";
import {
  BattleSlot,
  generateInviteCode,
  listenToBattleSlots,
  publishReelCount,
  setupBattleUser,
} from "@/lib/friendBattle";
import { InviteBottomSheet } from "@/components/ui/InviteBottomSheet";
import { useReelCount } from "@/hooks/useReelCount";

const GOOGLE_USER_ID_KEY = "focuslock_google_user_id";

// ─── Medal / rank badge ──────────────────────────────────────
import { hasRankBadgeSvg, RankBadgeSvgIcon } from "@/components/ui/RankBadgeSvgs";

const MEDAL_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#FFD700", text: "#7A5900" },
  2: { bg: "#C0C0C0", text: "#4A4A4A" },
  3: { bg: "#CD7F32", text: "#5C3000" },
  4: { bg: theme.elevated, text: theme.secondaryText },
};

const BADGE_SIZE = 30;

function RankBadge({ rank }: { rank: number }) {
  if (hasRankBadgeSvg(rank)) {
    return (
      <View style={styles.rankBadge}>
        <RankBadgeSvgIcon rank={rank} size={BADGE_SIZE} />
      </View>
    );
  }
  const colors = MEDAL_COLORS[rank] ?? MEDAL_COLORS[4];
  return (
    <View style={[styles.rankBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.rankText, { color: colors.text }]}>{rank}</Text>
    </View>
  );
}

// ─── Avatar ──────────────────────────────────────────────────

function Avatar({ photo, name, size = 44 }: { photo?: string; name?: string; size?: number }) {
  const initials = (name ?? "?")[0]?.toUpperCase() ?? "?";
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

// ─── Slot row: user/friend ───────────────────────────────────

function ParticipantRow({
  slot,
  isSelf,
}: {
  slot: Extract<BattleSlot, { type: "self" | "friend" }>;
  isSelf: boolean;
}) {
  return (
    <View style={[styles.row, isSelf && styles.selfRow]}>
      <RankBadge rank={slot.rank} />
      <Avatar photo={slot.profile.photo} name={slot.profile.name} />
      <Text style={styles.rowName} numberOfLines={1}>
        {isSelf ? "You" : slot.profile.name || "Friend"}
      </Text>
      <Text style={styles.rowScore}>{slot.todayCount}</Text>
    </View>
  );
}

// ─── Slot row: invite prompt ──────────────────────────────────

function InviteRow({
  slot,
  onInvite,
}: {
  slot: Extract<BattleSlot, { type: "invite" }>;
  onInvite: () => void;
}) {
  return (
    <View style={styles.row}>
      {/* empty rank circle placeholder */}
      <View style={[styles.rankBadge, { backgroundColor: theme.divider }]} />
      {/* empty avatar placeholder */}
      <View style={[styles.avatarFallback, styles.inviteAvatar]}>
        <Feather name="user-plus" size={18} color={theme.tertiaryText} />
      </View>
      <Text style={styles.invitePromptText} numberOfLines={1}>
        {slot.invitePrompt} {slot.inviteEmoji}
      </Text>
      <TouchableOpacity style={styles.inviteBtn} onPress={onInvite} activeOpacity={0.8}>
        <Text style={styles.inviteBtnText}>Invite</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Fallback slots (shown instantly from local data, before Firebase) ───────

const INVITE_PROMPTS = [
  { text: "Invite your brother", emoji: "👊" },
  { text: "Invite the Night ghost", emoji: "👻" },
  { text: "Invite the Reel Addict", emoji: "🎉" },
] as const;

function buildFallbackSlots(
  self: { userId: string; profile: { name: string; photo: string } } | null,
): BattleSlot[] {
  const slots: BattleSlot[] = [];

  // Slot 0: current user (empty shell if no user)
  if (self) {
    slots.push({
      type: "self",
      userId: self.userId,
      profile: self.profile,
      todayCount: 0,
      rank: 1,
    });
  }

  // Remaining slots: invite prompts
  const needed = self ? 3 : 4;
  for (let i = 0; i < needed; i++) {
    const p = INVITE_PROMPTS[i % INVITE_PROMPTS.length];
    slots.push({ type: "invite", invitePrompt: p.text, inviteEmoji: p.emoji });
  }

  return slots;
}

// ─── Main screen ─────────────────────────────────────────────

export default function FriendBattleScreen() {
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<BattleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);
  const { count } = useReelCount(15_000); // refresh every 15s

  // Publish reel count to Firebase whenever it changes
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (count !== null && userIdRef.current) {
      publishReelCount(userIdRef.current, count);
    }
  }, [count]);

  const init = useCallback(async () => {
    try {
      const [userId, profileRaw] = await Promise.all([
        AsyncStorage.getItem(GOOGLE_USER_ID_KEY),
        AsyncStorage.getItem(GOOGLE_USER_PROFILE_KEY),
      ]);

      // No signed-in user — show empty invite slots immediately.
      if (!userId) {
        const fallback = buildFallbackSlots(null);
        setSlots(fallback);
        setLoading(false);
        return;
      }

      userIdRef.current = userId;

      const profile = (() => {
        try {
          return profileRaw ? JSON.parse(profileRaw) : { name: "You", photo: "" };
        } catch {
          return { name: "You", photo: "" };
        }
      })();

      // Show a local slot immediately so the screen is never blank.
      setSlots(buildFallbackSlots({ userId, profile }));
      setLoading(false);

      // Firebase setup — fire-and-forget; failures must not block the screen.
      setupBattleUser(userId, {
        name: profile.name ?? "You",
        photo: profile.photo ?? "",
      })
        .then((code) => setInviteCode(code))
        .catch(() => {
          // Offline / permission error — generate a local code so Invite still works.
          setInviteCode(generateInviteCode());
        });

      // Reel count publish — fire-and-forget.
      if (count !== null) {
        publishReelCount(userId, count).catch(() => {});
      }

      // Real-time listener — updates slots whenever Firebase data changes.
      const unsubscribe = listenToBattleSlots(userId, (newSlots) => {
        setSlots(newSlots);
      });

      return unsubscribe;
    } catch {
      // Unexpected error — surface the invite slots so the screen is usable.
      setSlots(buildFallbackSlots(null));
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    init().then((unsub) => {
      cleanup = unsub;
    });
    return () => {
      cleanup?.();
    };
  }, [init]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="chevron-left" size={22} color={theme.primaryText} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Friend Battle</Text>

        <TouchableOpacity
          style={styles.friendsPill}
          onPress={() => router.push("/friend-battle-friends" as never)}
          activeOpacity={0.8}
        >
          <Feather name="users" size={14} color={theme.buttonText} />
          <Text style={styles.friendsPillText}>Friends</Text>
        </TouchableOpacity>
      </View>

      {/* ── Day navigation ── */}
      <View style={styles.dayNav}>
        <Feather name="chevron-left" size={18} color={theme.tertiaryText} />
        <Text style={styles.dayText}>Today</Text>
        <Feather name="chevron-right" size={18} color={theme.tertiaryText} />
      </View>

      {/* ── Leaderboard ── */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {slots.map((slot, idx) => {
            if (slot.type === "invite") {
              return (
                <InviteRow
                  key={`invite-${idx}`}
                  slot={slot}
                  onInvite={() => setSheetVisible(true)}
                />
              );
            }
            return (
              <ParticipantRow
                key={slot.userId}
                slot={slot}
                isSelf={slot.type === "self"}
              />
            );
          })}
        </ScrollView>
      )}

      {/* ── Invite bottom sheet ── */}
      <InviteBottomSheet
        visible={sheetVisible}
        inviteCode={inviteCode}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: theme.primaryText,
    letterSpacing: -0.3,
  },
  friendsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  friendsPillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: theme.buttonText,
  },

  // ── Day nav
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dayText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: theme.primaryText,
    minWidth: 60,
    textAlign: "center",
  },

  // ── List
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Row (shared)
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  selfRow: {
    borderWidth: 1.5,
    borderColor: theme.accentBorder,
    backgroundColor: theme.accentBg,
  },

  // ── Rank badge
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  // ── Avatar
  avatarFallback: {
    backgroundColor: theme.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: theme.accent,
  },

  // ── Participant row
  rowName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: theme.primaryText,
  },
  rowScore: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: theme.primaryText,
    minWidth: 36,
    textAlign: "right",
  },

  // ── Invite row
  inviteAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.divider,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  invitePromptText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: theme.secondaryText,
  },
  inviteBtn: {
    backgroundColor: theme.accentBg,
    borderWidth: 1,
    borderColor: theme.accentBorder,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  inviteBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: theme.accent,
  },
});
