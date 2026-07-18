import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ComingSoonScreen() {
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
