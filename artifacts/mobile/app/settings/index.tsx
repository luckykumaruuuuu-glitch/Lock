// Settings screen accessed via the home-screen profile-photo shortcut.
// Re-exports the same screen component used in the tab so there is no
// duplication. The Stack.Screen for this route (in _layout.tsx) is
// registered with animation: "slide_from_left" so it slides in from the
// left when opened from the home-screen avatar.
export { default } from "@/app/(tabs)/settings";
