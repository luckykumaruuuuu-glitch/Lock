/**
 * friendBattle.ts — Firebase RTDB helpers for the Friend Battle feature.
 *
 * RTDB structure:
 *   friendBattle/users/{userId}/profile    { name, photo }
 *   friendBattle/users/{userId}/todayCount number
 *   friendBattle/users/{userId}/inviteCode string
 *   friendBattle/friends/{userId}/{friendId} true   (bidirectional)
 *   friendBattle/inviteCodes/{code}        userId
 */

import { get, onValue, ref, remove, set, update } from "firebase/database";
import { getFirebaseDb } from "./firebase";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface BattleProfile {
  name: string;
  photo: string;
}

export type BattleSlot =
  | {
      type: "self" | "friend";
      userId: string;
      profile: BattleProfile;
      todayCount: number;
      rank: number;
    }
  | {
      type: "invite";
      invitePrompt: string;
      inviteEmoji: string;
    };

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** 5-char random alphanumeric code (no ambiguous chars) */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─────────────────────────────────────────────────────────────
// Setup / Profile
// ─────────────────────────────────────────────────────────────

/**
 * Idempotent: creates the user node on first call, updates profile on subsequent calls.
 * Returns the user's invite code.
 */
export async function setupBattleUser(
  userId: string,
  profile: BattleProfile,
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) return generateInviteCode();

  const userRef = ref(db, `friendBattle/users/${userId}`);
  const snap = await get(userRef);

  if (snap.exists()) {
    // Keep existing invite code; just refresh profile
    const existing = snap.val();
    await update(userRef, { profile });
    return existing.inviteCode ?? generateInviteCode();
  }

  // First-time setup
  const inviteCode = generateInviteCode();
  await set(userRef, { profile, todayCount: 0, inviteCode });
  await set(ref(db, `friendBattle/inviteCodes/${inviteCode}`), userId);
  return inviteCode;
}

// ─────────────────────────────────────────────────────────────
// Reel count sync
// ─────────────────────────────────────────────────────────────

/** Write today's reel count for the current user. */
export async function publishReelCount(
  userId: string,
  count: number,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  await set(ref(db, `friendBattle/users/${userId}/todayCount`), count);
}

// ─────────────────────────────────────────────────────────────
// Real-time leaderboard listener
// ─────────────────────────────────────────────────────────────

const INVITE_PROMPTS = [
  { text: "Invite your brother", emoji: "👊" },
  { text: "Invite the Night ghost", emoji: "👻" },
  { text: "Invite the Reel Addict", emoji: "🎉" },
] as const;

/**
 * Listens to the current user's friend battle data in real-time.
 * Calls onUpdate with an array of exactly 4 BattleSlots:
 *   [0] = current user (always)
 *   [1-3] = friends (if any) then invite prompts
 *
 * Returns an unsubscribe function.
 */
export function listenToBattleSlots(
  userId: string,
  onUpdate: (slots: BattleSlot[]) => void,
): () => void {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  // Track nested unsubscribers so we can clean up per-friend listeners
  let friendUnsubs: Array<() => void> = [];

  // Top-level listener: fires when the friends list changes
  const friendsRef = ref(db, `friendBattle/friends/${userId}`);
  const unsubFriends = onValue(friendsRef, (friendsSnap) => {
    // Tear down old per-friend listeners
    friendUnsubs.forEach((u) => u());
    friendUnsubs = [];

    const friendIds: string[] = friendsSnap.exists()
      ? Object.keys(friendsSnap.val())
      : [];

    // State bucket — one slot per participant
    type ParticipantData = {
      profile: BattleProfile;
      todayCount: number;
    };
    const participantMap: Record<string, ParticipantData> = {};

    const rebuild = () => {
      // Build ranked list (placeholder: sort by count desc)
      const allIds = [userId, ...friendIds];
      const allData = allIds.map((id) => ({
        id,
        data: participantMap[id],
      }));

      // Sort for rank assignment (only those with data)
      const withData = allData.filter((x) => x.data);
      withData.sort(
        (a, b) => (b.data!.todayCount ?? 0) - (a.data!.todayCount ?? 0),
      );
      const rankMap: Record<string, number> = {};
      withData.forEach((x, i) => {
        rankMap[x.id] = i + 1;
      });

      const slots: BattleSlot[] = [];

      // Slot 0: current user (always first)
      const selfData = participantMap[userId];
      slots.push({
        type: "self",
        userId,
        profile: selfData?.profile ?? { name: "", photo: "" },
        todayCount: selfData?.todayCount ?? 0,
        rank: rankMap[userId] ?? 1,
      });

      // Slots 1-3: friends then invite prompts
      let promptIdx = 0;
      for (let i = 0; i < 3; i++) {
        const fid = friendIds[i];
        if (fid) {
          const fd = participantMap[fid];
          slots.push({
            type: "friend",
            userId: fid,
            profile: fd?.profile ?? { name: "", photo: "" },
            todayCount: fd?.todayCount ?? 0,
            rank: rankMap[fid] ?? i + 2,
          });
        } else {
          const p = INVITE_PROMPTS[promptIdx++] ?? INVITE_PROMPTS[0];
          slots.push({ type: "invite", invitePrompt: p.text, inviteEmoji: p.emoji });
        }
      }

      onUpdate(slots);
    };

    // Listen to self
    const selfUnsub = onValue(
      ref(db, `friendBattle/users/${userId}`),
      (snap) => {
        if (snap.exists()) {
          const v = snap.val();
          participantMap[userId] = {
            profile: v.profile ?? { name: "", photo: "" },
            todayCount: v.todayCount ?? 0,
          };
        }
        rebuild();
      },
    );
    friendUnsubs.push(selfUnsub);

    // Listen to each friend
    friendIds.forEach((fid) => {
      const unsub = onValue(
        ref(db, `friendBattle/users/${fid}`),
        (snap) => {
          if (snap.exists()) {
            const v = snap.val();
            participantMap[fid] = {
              profile: v.profile ?? { name: "", photo: "" },
              todayCount: v.todayCount ?? 0,
            };
          }
          rebuild();
        },
      );
      friendUnsubs.push(unsub);
    });

    // If no friends, still emit (just user + invites)
    if (friendIds.length === 0) rebuild();
  });

  return () => {
    unsubFriends();
    friendUnsubs.forEach((u) => u());
  };
}

// ─────────────────────────────────────────────────────────────
// Friends list listener (Screen 3)
// ─────────────────────────────────────────────────────────────

export function listenToFriendsList(
  userId: string,
  onUpdate: (friends: Array<{ userId: string; profile: BattleProfile }>) => void,
): () => void {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  let profileUnsubs: Array<() => void> = [];
  const profileMap: Record<string, BattleProfile> = {};

  const friendsRef = ref(db, `friendBattle/friends/${userId}`);
  const unsubFriends = onValue(friendsRef, (snap) => {
    profileUnsubs.forEach((u) => u());
    profileUnsubs = [];
    Object.keys(profileMap).forEach((k) => delete profileMap[k]);

    const friendIds: string[] = snap.exists() ? Object.keys(snap.val()) : [];

    const rebuild = () => {
      onUpdate(
        friendIds
          .filter((fid) => profileMap[fid])
          .map((fid) => ({ userId: fid, profile: profileMap[fid] })),
      );
    };

    if (friendIds.length === 0) {
      onUpdate([]);
      return;
    }

    friendIds.forEach((fid) => {
      const unsub = onValue(
        ref(db, `friendBattle/users/${fid}/profile`),
        (profileSnap) => {
          if (profileSnap.exists()) {
            profileMap[fid] = profileSnap.val();
          }
          rebuild();
        },
      );
      profileUnsubs.push(unsub);
    });
  });

  return () => {
    unsubFriends();
    profileUnsubs.forEach((u) => u());
  };
}

// ─────────────────────────────────────────────────────────────
// Friend removal (mutual / bidirectional)
// ─────────────────────────────────────────────────────────────

export async function removeFriend(
  userId: string,
  friendId: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  await Promise.all([
    remove(ref(db, `friendBattle/friends/${userId}/${friendId}`)),
    remove(ref(db, `friendBattle/friends/${friendId}/${userId}`)),
  ]);
}

// ─────────────────────────────────────────────────────────────
// Accept invite (join someone's battle)
// ─────────────────────────────────────────────────────────────

/**
 * Called when a new user taps an invite link.
 * Looks up the inviter by code and creates a mutual friendship.
 */
export async function acceptInvite(
  inviteCode: string,
  newUserId: string,
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const codeSnap = await get(
    ref(db, `friendBattle/inviteCodes/${inviteCode}`),
  );
  if (!codeSnap.exists()) return false;

  const inviterId: string = codeSnap.val();
  if (inviterId === newUserId) return false; // can't add yourself

  await Promise.all([
    set(ref(db, `friendBattle/friends/${inviterId}/${newUserId}`), true),
    set(ref(db, `friendBattle/friends/${newUserId}/${inviterId}`), true),
  ]);
  return true;
}
