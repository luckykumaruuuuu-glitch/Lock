/**
 * useFriendAvatars
 *
 * Real-time hook that provides ranked friend avatars for the Home-screen
 * Friends box.  Subscribes to listenToBattleSlots so any friend join,
 * profile update, or rank change is reflected instantly — no polling.
 *
 * Returns:
 *   avatars — up to 3 friends sorted by rank ascending (rank 1 = index 0 = front).
 *   count   — total number of actual friends (0-3), used for "X friends" label.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { listenToBattleSlots, type BattleSlot } from "@/lib/friendBattle";

// The filled (non-invite) BattleSlot variant — has userId, profile, rank.
// BattleSlot uses type:"self"|"friend" as a combined literal on one variant,
// so we discriminate by the presence of `userId` instead.
type FilledSlot = Extract<BattleSlot, { userId: string }>;

// Same key used in friend-battle.tsx to persist the Google user ID.
const GOOGLE_USER_ID_KEY = "focuslock_google_user_id";

export interface FriendAvatar {
  userId: string;
  name: string;
  photo: string; // Google profile URL, may be empty string
  rank: number;  // 1 = best (front of stack), 2, 3
}

interface FriendAvatarsState {
  avatars: FriendAvatar[];
  count: number;   // real friend count, drives "X friend(s)" label
  loading: boolean;
}

export function useFriendAvatars(): FriendAvatarsState {
  const [state, setState] = useState<FriendAvatarsState>({
    avatars: [],
    count: 0,
    loading: true,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const userId = await AsyncStorage.getItem(GOOGLE_USER_ID_KEY);

      if (cancelled) return;

      // No userId yet (user hasn't signed in) — show empty state.
      if (!userId) {
        setState({ avatars: [], count: 0, loading: false });
        return;
      }

      unsubscribe = listenToBattleSlots(userId, (slots) => {
        if (cancelled) return;

        // slots[0] = self, slots[1-3] = friends or invite prompts.
        // Keep only real friend slots.
        // BattleSlot uses type:"self"|"friend" on one variant, so we
        // discriminate by userId (present only on non-invite slots).
        const friendSlots = slots
          .filter((s): s is FilledSlot => s.type === "friend")
          // Sort by rank ascending: rank 1 first → rendered at front of stack.
          .sort((a, b) => a.rank - b.rank)
          // Hard cap at 3 — box only ever shows up to 3 circles.
          .slice(0, 3);

        setState({
          avatars: friendSlots.map((s) => ({
            userId: s.userId,
            name: s.profile.name,
            photo: s.profile.photo,
            rank: s.rank,
          })),
          count: friendSlots.length,
          loading: false,
        });
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return state;
}
