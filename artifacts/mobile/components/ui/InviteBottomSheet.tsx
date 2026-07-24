/**
 * InviteBottomSheet — slides up from the bottom when user taps an Invite slot.
 * Shows a unique invite link with copy, WhatsApp, Instagram DM, and native share.
 */

import * as Clipboard from "expo-clipboard";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import theme from "@/constants/theme";

interface Props {
  visible: boolean;
  inviteCode: string;
  onClose: () => void;
}

const { width } = Dimensions.get("window");
const SHEET_HEIGHT = 320;
const BASE_URL = "https://join.duckpalapp.ai/";

export function InviteBottomSheet({ visible, inviteCode, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [copied, setCopied] = useState(false);

  const inviteLink = `${BASE_URL}${inviteCode}`;

  useEffect(() => {
    if (visible) {
      // Always reset to the bottom before animating up so re-triggers are
      // always smooth, even if a previous close animation was mid-way.
      slideAnim.stopAnimation();
      slideAnim.setValue(SHEET_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 14,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
      setCopied(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Join me on Friend Battle! 🦆\n${inviteLink}`,
    );
    Linking.openURL(`whatsapp://send?text=${msg}`).catch(() =>
      Linking.openURL(`https://wa.me/?text=${msg}`),
    );
  };

  const handleInstagram = () => {
    // Instagram DM deep-link: pre-fills the message in DM composer
    Linking.openURL("instagram://direct-inbox").catch(() =>
      // Fallback: copy link + open Instagram
      Clipboard.setStringAsync(inviteLink).then(() =>
        Linking.openURL("https://www.instagram.com/"),
      ),
    );
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `Join me on Friend Battle! 🦆\n${inviteLink}`,
        url: inviteLink,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Dim backdrop — tap to close */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Heading */}
          <Text style={styles.heading}>
            Invite friends to battle more 🔥
          </Text>
          <Text style={styles.subheading}>
            The more friends, the better the battle!
          </Text>

          {/* Invite link row */}
          <TouchableOpacity
            style={styles.linkRow}
            activeOpacity={0.75}
            onPress={handleCopy}
          >
            <Text style={styles.linkText} numberOfLines={1}>
              {inviteLink}
            </Text>
            <View style={[styles.copyBtn, copied && styles.copyBtnDone]}>
              <Feather
                name={copied ? "check" : "copy"}
                size={16}
                color={copied ? "#fff" : theme.accent}
              />
            </View>
          </TouchableOpacity>

          {/* Share icons row */}
          <View style={styles.shareRow}>
            {/* WhatsApp */}
            <TouchableOpacity
              style={styles.shareBtn}
              activeOpacity={0.8}
              onPress={handleWhatsApp}
            >
              <View style={[styles.shareIcon, { backgroundColor: "#25D366" }]}>
                <FontAwesome5 name="whatsapp" size={28} color="#fff" />
              </View>
              <Text style={styles.shareLabel}>WhatsApp</Text>
            </TouchableOpacity>

            {/* Instagram */}
            <TouchableOpacity
              style={styles.shareBtn}
              activeOpacity={0.8}
              onPress={handleInstagram}
            >
              <View style={[styles.shareIcon, { backgroundColor: "#C13584" }]}>
                <FontAwesome5 name="instagram" size={28} color="#fff" />
              </View>
              <Text style={styles.shareLabel}>Instagram</Text>
            </TouchableOpacity>

            {/* Native Share */}
            <TouchableOpacity
              style={styles.shareBtn}
              activeOpacity={0.8}
              onPress={handleNativeShare}
            >
              <View style={[styles.shareIcon, { backgroundColor: theme.elevated }]}>
                <Feather name="share" size={22} color={theme.primaryText} />
              </View>
              <Text style={styles.shareLabel}>More</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    width,
    backgroundColor: theme.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: "center",
    paddingTop: 14,
    paddingHorizontal: 24,
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.accentBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.elevated,
    marginBottom: 4,
  },
  heading: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: theme.primaryText,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    textAlign: "center",
    marginTop: -8,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.accentBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    gap: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.accentBg,
    alignItems: "center",
    justifyContent: "center",
  },
  copyBtnDone: {
    backgroundColor: "#34C759",
  },
  shareRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
    marginTop: 4,
  },
  shareBtn: {
    alignItems: "center",
    gap: 6,
  },
  shareIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  shareLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: theme.secondaryText,
  },
});
