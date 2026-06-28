import { FontAwesome5, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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

function AppRow({
  app,
  selected,
  onToggle,
  colors,
}: {
  app: AppItem;
  selected: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.appRow,
        {
          backgroundColor: selected
            ? colors.primary + "10"
            : colors.card,
          borderColor: selected ? colors.primary + "40" : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.appIconBg, { backgroundColor: app.iconColor + "18" }]}>
        <FontAwesome5 name={app.iconName as any} size={18} color={app.iconColor} />
      </View>
      <View style={styles.appInfo}>
        <Text style={[styles.appName, { color: colors.foreground }]}>{app.name}</Text>
        <Text style={[styles.appCategory, { color: colors.mutedForeground }]}>
          {app.category}
        </Text>
      </View>
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
    </Pressable>
  );
}

export default function SelectAppsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selection, setSelectedApps } = useLock();
  const [search, setSearch] = useState("");

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = DUMMY_APPS.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedIds = new Set(selection.selectedApps.map((a) => a.id));

  function toggle(app: AppItem) {
    Haptics.selectionAsync();
    if (selectedIds.has(app.id)) {
      setSelectedApps(selection.selectedApps.filter((a) => a.id !== app.id));
    } else {
      setSelectedApps([...selection.selectedApps, app]);
    }
  }

  function handleNext() {
    if (selection.selectedApps.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/lock/duration");
  }

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
        <View style={[styles.selectionBanner, { backgroundColor: colors.primary + "12" }]}>
          <Feather name="check-circle" size={14} color={colors.primary} />
          <Text style={[styles.selectionText, { color: colors.primary }]}>
            {selection.selectedApps.length} app
            {selection.selectedApps.length !== 1 ? "s" : ""} selected
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
          <Text style={styles.nextButtonText}>
            Next — Set Duration
          </Text>
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
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
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
