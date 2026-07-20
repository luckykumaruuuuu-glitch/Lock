import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack, usePathname, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeKeyboardProvider } from "@/components/SafeKeyboardProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DebugLogViewer } from "@/components/ui/DebugLogViewer";
import { UpdateModal } from "@/components/ui/UpdateModal";
import { AppModeProvider } from "@/context/AppModeContext";
import { DebugLogProvider } from "@/context/DebugLogContext";
import { FirebaseSyncProvider, useFirebaseSyncContext } from "@/context/FirebaseSyncContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { LockProvider } from "@/context/LockContext";
import { SoundProvider } from "@/context/SoundContext";
import { UpdateCheckProvider, useUpdateCheckContext } from "@/context/UpdateCheckContext";
import { usePermissionStatus } from "@/hooks/usePermissionStatus";
import "@/lib/i18n";
import { ONBOARDING_DONE_KEY } from "./onboarding";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Routes that bypass the onboarding/setup guard — accessible directly in web
// preview for design/dev iteration without completing the full setup flow.
const DEV_BYPASS_ROUTES = ["/unlock-tasks", "/mock-reels", "/watch-video", "/coming-soon", "/duration-selector"];

function SetupGuard({ children }: { children: React.ReactNode }) {
  const { setupComplete, loading } = usePermissionStatus();
  const { startupSyncStatus } = useFirebaseSyncContext();
  const segments = useSegments();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const [routeReady, setRouteReady] = useState(false);

  // Hard safety net: never keep the overlay up for more than 6s.
  // The Firebase hook already has its own 5s timeout — this only fires
  // if context propagation itself stalls (e.g. web/preview environments).
  useEffect(() => {
    const id = setTimeout(() => setRouteReady(true), 6000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    // Wait until:
    //   1. Permission status has loaded
    //   2. Startup Firebase sync has completed (prevents 1-3s bypass window
    //      after Clear Data when local storage is empty but Firebase has locks)
    if (loading || startupSyncStatus === "checking") return;

    (async () => {
      try {
        if (!hasRedirected.current) {
          const inSetup      = segments[0] === "setup";
          const inOnboarding = segments[0] === "onboarding";
          // Dev/test screens bypass the guard so they can be previewed
          // directly in web preview without completing onboarding first.
          const inDevScreen  = segments[0] === "unlock-tasks";

          // usePathname() resolves on the very first render (unlike useSegments
          // which can be empty [] initially), so it is reliable for bypass checks.
          const isDevBypass = DEV_BYPASS_ROUTES.some((r) => pathname.startsWith(r));

          if (!isDevBypass) {
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
          }
        }
      } catch {
        // Navigation determination failed — reveal app anyway
      } finally {
        setRouteReady(true);
      }
    })();
  }, [loading, startupSyncStatus, setupComplete, segments]);

  return (
    <>
      {children}
      {!routeReady && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000000",
          }}
        />
      )}
    </>
  );
}

function RootLayoutNav() {
  const { showUpdateModal, updateInfo, dismiss } = useUpdateCheckContext();

  return (
    <>
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
          contentStyle: { backgroundColor: "#000000" },
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
        <Stack.Screen
          name="unlock-tasks"
          options={{
            headerShown: false,
            animation: "slide_from_bottom",
            animationDuration: 280,
            gestureEnabled: true,
            gestureDirection: "vertical",
          }}
        />
        <Stack.Screen
          name="mock-reels"
          options={{
            headerShown: false,
            animation: "slide_from_bottom",
            animationDuration: 320,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="watch-video"
          options={{
            headerShown: false,
            animation: "slide_from_bottom",
            animationDuration: 320,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="duration-selector"
          options={{
            headerShown: false,
            animation: "slide_from_bottom",
            animationDuration: 300,
            gestureEnabled: false,
          }}
        />
      </Stack>
      </SetupGuard>
      <UpdateModal visible={showUpdateModal} info={updateInfo} onDismiss={dismiss} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // @expo/vector-icons font files — required for native (Expo Go + APK).
    // Web loads these automatically via CSS @font-face; native needs explicit loading.
    ...Feather.font,
    ...FontAwesome5.font,
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
            <SoundProvider>
            <AppModeProvider>
            <LockProvider>
              <FirebaseSyncProvider>
                <UpdateCheckProvider>
                  <DebugLogProvider>
                    <GestureHandlerRootView>
                      <SafeKeyboardProvider>
                        <RootLayoutNav />
                        {/* Floating debug icon — only renders when toggled ON in Settings */}
                        <DebugLogViewer />
                      </SafeKeyboardProvider>
                    </GestureHandlerRootView>
                  </DebugLogProvider>
                </UpdateCheckProvider>
              </FirebaseSyncProvider>
            </LockProvider>
            </AppModeProvider>
            </SoundProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
