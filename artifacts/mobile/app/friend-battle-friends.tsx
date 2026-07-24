/**
 * Friend Battle — Screen 3: Friends List
 *
 * Shows all joined friends with their profile photo and name.
 * Each friend can be removed (mutual / bidirectional deletion).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import theme from "@/constants/theme";
import { BattleProfile, listenToFriendsList, removeFriend } from "@/lib/friendBattle";

const GOOGLE_USER_ID_KEY = "focuslock_google_user_id";

interface Friend {
  userId: string;
  profile: BattleProfile;
}

function Avatar({ photo, name, size = 48 }: { photo?: string; name?: string; size?: number }) {
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

export default function FriendBattleFriendsScreen() {
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const init = useCallback(async () => {
    const uid = await AsyncStorage.getItem(GOOGLE_USER_ID_KEY);
    if (!uid) {
      setLoading(false);
      return;
    }
    setUserId(uid);

    const unsubscribe = listenToFriendsList(uid, (list) => {
      setFriends(list);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    init().then((unsub) => {
      cleanup = unsub;
    });
    return () => {
      cleanup?.();
    };
  }, [init]);

  const handleRemove = (friend: Friend) => {
    Alert.alert(
      "Remove Friend",
      `Remove ${friend.profile.name || "this friend"} from your battle? This will remove you from their list too.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;
            setRemoving(friend.userId);
            try {
              await removeFriend(userId, friend.userId);
            } finally {
              setRemoving(null);
            }
          },
        },
      ],
    );
  };

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
        <Text style={styles.headerTitle}>Friends</Text>
        {/* spacer to center title */}
        <View style={{ width: 40 }} />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.centerBox}>
          <Feather name="users" size={48} color={theme.tertiaryText} />
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>
            Go back and tap Invite to bring friends into the battle!
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {friends.map((friend) => (
            <View key={friend.userId} style={styles.row}>
              <Avatar
                photo={friend.profile.photo}
                name={friend.profile.name}
              />
              <Text style={styles.friendName} numberOfLines={1}>
                {friend.profile.name || "Friend"}
              </Text>
              {removing === friend.userId ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(friend)}
                  activeOpacity={0.8}
                >
                  <Feather name="x" size={16} color={theme.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
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
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: theme.primaryText,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    textAlign: "center",
    lineHeight: 20,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  avatarFallback: {
    backgroundColor: theme.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: theme.accent,
  },
  friendName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: theme.primaryText,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,69,58,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
