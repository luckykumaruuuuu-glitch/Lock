import React, { useEffect } from "react";
import { NativeModules, Platform, StyleSheet, Text, View } from "react-native";
import { consumePendingReelsLockDisable } from "@/lib/reelsLockPending";

export default function ComingSoonScreen() {
  // If the user arrived here by completing a task triggered from the Settings
  // toggle, finish the disable now (task was completed → toggle goes OFF).
  useEffect(() => {
    if (consumePendingReelsLockDisable()) {
      if (Platform.OS === "android" && NativeModules.ReelsLock) {
        NativeModules.ReelsLock.setEnabled(false);
      }
    }
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.text}>Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 32,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
