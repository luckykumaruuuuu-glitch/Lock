import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { UpdateInfo } from "@/hooks/useUpdateCheck";

interface UpdateModalProps {
  visible: boolean;
  info: UpdateInfo | null;
  onDismiss: () => void;
}

export function UpdateModal({ visible, info, onDismiss }: UpdateModalProps) {
  if (!info) return null;

  const handleUpdate = () => {
    if (info.url) {
      Linking.openURL(info.url);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={info.required ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name="download-cloud" size={32} color="#FFBF80" />
          </View>

          <Text style={styles.title}>Update Available</Text>

          {info.latestVersionName ? (
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>
                New version: {info.latestVersionName}
              </Text>
            </View>
          ) : null}

          <Text style={styles.message}>{info.message}</Text>

          <Pressable
            onPress={handleUpdate}
            style={({ pressed }) => [
              styles.updateBtn,
              { opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Text style={styles.updateBtnText}>Update Now</Text>
          </Pressable>

          {!info.required && (
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.laterBtn,
                { opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Text style={styles.laterBtnText}>Later</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,191,128,0.18)",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,191,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  versionBadge: {
    backgroundColor: "rgba(255,191,128,0.12)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  versionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFBF80",
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  updateBtn: {
    width: "100%",
    backgroundColor: "#FFBF80",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  updateBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  laterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  laterBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#8E8E93",
  },
});
