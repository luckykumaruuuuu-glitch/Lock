---
    name: Google Sign-In flow
    description: How the Google Sign-In screen, bottom-sheet, and navigation guard are wired together.
    ---

    ## Implementation

    - Screen: artifacts/mobile/app/google-signin.tsx (exports GOOGLE_SIGNIN_DONE_KEY)
    - Bottom-sheet: artifacts/mobile/components/ui/GoogleSignInBottomSheet.tsx — Modal + Animated.timing slide-up, SVG spinning arc via react-native-svg
    - Library: @react-native-google-signin/google-signin — native module only; web/Expo Go falls back to simulated flow
    - Web Client ID: read from EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID env var (user must set this for real APK builds)

    ## Navigation guard (SetupGuard in _layout.tsx)

    Flow: onboarding -> google-signin -> setup -> (tabs)
    Two AsyncStorage keys gate progress: ONBOARDING_DONE_KEY and GOOGLE_SIGNIN_DONE_KEY.
    SetupGuard checks both before deciding where to route.

    **Why:** Inserting google-signin between onboarding and setup lets the guard control the full flow without duplicating logic in each screen.

    ## New vs returning user detection

    Stores Google user ID in AsyncStorage under "focuslock_google_user_id".
    On sign-in: if stored ID matches -> returning_user (1.2s bottom-sheet); else -> new_user (2.8s).
    No Firebase Auth credential call needed — identity is purely local via AsyncStorage.

    ## Dev bypass

    /google-signin added to DEV_BYPASS_ROUTES so it can be navigated to directly in web preview without completing onboarding.
    