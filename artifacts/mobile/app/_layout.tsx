import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeKeyboardProvider } from "@/components/SafeKeyboardProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FirebaseSyncProvider } from "@/context/FirebaseSyncContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { LockProvider } from "@/context/LockContext";
import { usePermissionStatus } from "@/hooks/usePermissionStatus";
import "@/lib/i18n";
import { ONBOARDING_DONE_KEY } from "./onboarding";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function SetupGuard({ children }: { children: React.ReactNode }) {
  const { setupComplete, loading } = usePermissionStatus();
  const segments = useSegments();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading || hasRedirected.current) return;

    const inSetup = segments[0] === "setup";
    const inOnboarding = segments[0] === "onboarding";

    (async () => {
      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);

      if (!onboardingDone && !inOnboarding) {
        hasRedirected.current = true;
        router.replace("/onboarding");
      } else if (onboardingDone && setupComplete === false && !inSetup) {
        hasRedirected.current = true;
        router.replace("/setup");
      } else if (onboardingDone && setupComplete === true && inSetup) {
        hasRedirected.current = true;
        router.replace("/(tabs)");
      }
    })();
  }, [loading, setupComplete, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <SetupGuard>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "rgba(0,0,0,0.97)" },
          headerTintColor: "#E8A030",
          headerTitleStyle: {
            fontFamily: "Inter_700Bold",
            color: "#FFFFFF",
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: "slide_from_right",
          animationDuration: 300,
          gestureEnabled: true,
          gestureDirection: "horizontal",
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, animation: "fade", animationDuration: 200 }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false, animation: "fade" }}
        />
        <Stack.Screen
          name="setup"
          options={{
            title: "Permission Setup",
            headerShown: true,
            headerBackVisible: false,
            gestureEnabled: false,
            animation: "slide_from_right",
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="lock/select-apps"
          options={{
            title: "Select Apps",
            headerBackTitle: "Home",
            animation: "slide_from_right",
            animationDuration: 300,
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
        <Stack.Screen
          name="lock/duration"
          options={{
            title: "Set Duration",
            headerBackTitle: "Apps",
            animation: "slide_from_right",
            animationDuration: 300,
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
        <Stack.Screen
          name="lock/confirm"
          options={{
            title: "Confirm Lock",
            headerBackTitle: "Duration",
            animation: "slide_from_right",
            animationDuration: 300,
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
        <Stack.Screen
          name="settings/feedback"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 300,
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
        <Stack.Screen
          name="settings/language"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 300,
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
      </Stack>
    </SetupGuard>
  );
}

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
          <LanguageProvider>
            <LockProvider>
              <FirebaseSyncProvider>
                <GestureHandlerRootView>
                  <SafeKeyboardProvider>
                    <RootLayoutNav />
                  </SafeKeyboardProvider>
                </GestureHandlerRootView>
              </FirebaseSyncProvider>
            </LockProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
