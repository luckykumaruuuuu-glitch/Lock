import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FirebaseSyncProvider } from "@/context/FirebaseSyncContext";
import { LockProvider } from "@/context/LockContext";
import { useColors } from "@/hooks/useColors";
import { usePermissionStatus } from "@/hooks/usePermissionStatus";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/* ───────────────────────────────────────────────
   First-launch redirect guard
─────────────────────────────────────────────── */
function SetupGuard({ children }: { children: React.ReactNode }) {
  const { setupComplete, loading } = usePermissionStatus();
  const segments = useSegments();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading || hasRedirected.current) return;

    const inSetup = segments[0] === "setup";

    if (setupComplete === false && !inSetup) {
      hasRedirected.current = true;
      router.replace("/setup");
    } else if (setupComplete === true && inSetup) {
      hasRedirected.current = true;
      router.replace("/(tabs)");
    }
  }, [loading, setupComplete, segments]);

  return <>{children}</>;
}

/* ───────────────────────────────────────────────
   Root nav
─────────────────────────────────────────────── */
function RootLayoutNav() {
  const colors = useColors();

  return (
    <SetupGuard>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            color: colors.foreground,
          },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="setup"
          options={{
            title: "Permission Setup",
            headerShown: true,
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="lock/select-apps"
          options={{ title: "Select Apps", headerBackTitle: "Home" }}
        />
        <Stack.Screen
          name="lock/duration"
          options={{ title: "Set Duration", headerBackTitle: "Apps" }}
        />
        <Stack.Screen
          name="lock/confirm"
          options={{ title: "Confirm Lock", headerBackTitle: "Duration" }}
        />
      </Stack>
    </SetupGuard>
  );
}

/* ───────────────────────────────────────────────
   Root layout
─────────────────────────────────────────────── */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LockProvider>
            {/* FirebaseSyncProvider must wrap everything that needs Firebase data */}
            <FirebaseSyncProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </FirebaseSyncProvider>
          </LockProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
