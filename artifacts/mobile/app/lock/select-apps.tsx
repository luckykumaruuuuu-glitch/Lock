import { FontAwesome5, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DUMMY_APPS, AppItem, useLock } from "@/context/LockContext";
import { useColors } from "@/hooks/useColors";
import { getActiveLocks } from "@/hooks/useLockStorage";

function AppRow({
  app,
  selected,
  alreadyLocked,
  onToggle,
  colors,
}: {
  app: AppItem;
  selected: boolean;
  alreadyLocked: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const disabled = alreadyLocked;

  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      style={({ pressed }) => [
        styles.appRow,
        {
          backgroundColor: alreadyLocked
            ? colors.muted
            : selected
            ? colors.primary + "10"
            : colors.card,
          borderColor: alreadyLocked
            ? colors.border
            : selected
            ? colors.primary + "40"
            : colors.border,
          opacity: pressed && !disabled ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.appIconBg,
          {
            backgroundColor: alreadyLocked
              ? colors.border
              : app.iconColor + "18",
          },
        ]}
      >
        <FontAwesome5
          name={app.iconName as any}
          size={18}
          color={alreadyLocked ? colors.mutedForeground : app.iconColor}
        />
      </View>
      <View style={styles.appInfo}>
        <Text
          style={[
            styles.appName,
            {
              color: alreadyLocked ? colors.mutedForeground : colors.foreground,
            },
          ]}
        >
          {app.name}
        </Text>
        <Text style={[styles.appCategory, { color: colors.mutedForeground }]}>
          {alreadyLocked ? "Already locked" : app.category}
        </Text>
      </View>
      {alreadyLocked ? (
        <View style={[styles.lockedBadge, { backgroundColor: colors.border }]}>
          <Feather name="lock" size={12} color={colors.mutedForeground} />
        </View>
      ) : (
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: selected ? colors.primary : "transparent",
              borderColor: selected ? colors.primary : colors.border,
            },
          ]}
        >
          {selected && <Feather name="check" size={14} color="#fff" />}
        </View>
      )}
    </Pressable>
  );
}

export default function SelectAppsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selection, setSelectedApps } = useLock();
  const [search, setSearch] = useState("");
  const [alreadyLockedPkgs, setAlreadyLockedPkgs] = useState<Set<string>>(
    new Set()
  );

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    getActiveLocks().then((active) => {
      const pkgs = new Set<string>(
        active.flatMap((l) => l.apps.map((a) => a.packageName))
      );
      setAlreadyLockedPkgs(pkgs);
    });
  }, []);

  const filtered = DUMMY_APPS.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedIds = new Set(selection.selectedApps.map((a) => a.id));

  const toggle = useCallback(
    (app: AppItem) => {
      if (alreadyLockedPkgs.has(app.packageName)) return;
      Haptics.selectionAsync();
      if (selectedIds.has(app.id)) {
        setSelectedApps(selection.selectedApps.filter((a) => a.id !== app.id));
      } else {
        setSelectedApps([...selection.selectedApps, app]);
      }
    },
    [alreadyLockedPkgs, selectedIds, selection.selectedApps, setSelectedApps]
  );

  function handleNext() {
    if (selection.selectedApps.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/lock/duration");
  }

  const alreadyLockedCount = filtered.filter((a) =>
    alreadyLockedPkgs.has(a.packageName)
  ).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search apps..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {selection.selectedApps.length > 0 && (
        <View
          style={[
            styles.selectionBanner,
            { backgroundColor: colors.primary + "12" },
          ]}
        >
          <Feather name="check-circle" size={14} color={colors.primary} />
          <Text style={[styles.selectionText, { color: colors.primary }]}>
            {selection.selectedApps.length} app
            {selection.selectedApps.length !== 1 ? "s" : ""} selected
          </Text>
        </View>
      )}

      {alreadyLockedCount > 0 && (
        <View
          style={[
            styles.infoBanner,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            {alreadyLockedCount} app
            {alreadyLockedCount !== 1 ? "s are" : " is"} already locked and
            cannot be selected again.
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AppRow
            app={item}
            selected={selectedIds.has(item.id)}
            alreadyLocked={alreadyLockedPkgs.has(item.packageName)}
            onToggle={() => toggle(item)}
            colors={colors}
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
      />

      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad + 20,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleNext}
          disabled={selection.selectedApps.length === 0}
          style={({ pressed }) => [
            styles.nextButton,
            {
              backgroundColor: colors.primary,
              opacity:
                selection.selectedApps.length === 0 ? 0.4 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.nextButtonText}>Next — Set Duration</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  selectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginVertical: 3,
  },
  appIconBg: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  appInfo: { flex: 1 },
  appName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  appCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: { height: 1, marginVertical: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
