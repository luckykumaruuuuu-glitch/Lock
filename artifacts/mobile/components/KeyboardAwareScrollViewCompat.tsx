import React from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

let KeyboardAwareScrollView: React.ComponentType<any> | null = null;
try {
  KeyboardAwareScrollView =
    require("react-native-keyboard-controller").KeyboardAwareScrollView;
} catch (_) {}

type Props = ScrollViewProps & {
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
};

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web" || !KeyboardAwareScrollView) {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }
  const KSV = KeyboardAwareScrollView;
  return (
    <KSV keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
      {children}
    </KSV>
  );
}
