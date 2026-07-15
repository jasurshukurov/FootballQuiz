/**
 * Product feature flags. Flip here — no per-screen switches.
 *
 * sharing: the "Share Result" / "Copy Result" buttons on game-overs.
 * Hidden for now per owner decision (2026-07-14) — share text/image
 * plumbing stays intact behind the flag so re-enabling is one line.
 */
export const FEATURES = {
  sharing: false,
  /**
   * leaderboard: local-first identity + global XP leaderboard (DynamoDB).
   * Also gated remotely by config.json "leaderboardEnabled" (kill switch);
   * both must be on. See lib/dynamoSync.isLeaderboardEnabled().
   * OFF per owner decision (2026-07-15): personal scores only for now —
   * identity, sync and screens stay intact behind the flag.
   */
  leaderboard: false,
  /**
   * pro: the "Support the Game" purchase card (More screen) and Pro perks.
   * OFF for the store launch (2026-07-15): lib/purchases.ts is a stub with
   * no StoreKit behind it — a visible purchase/restore flow that completes
   * without a transaction is a guaranteed App Store rejection (3.1.1/2.1).
   * Flip on only once real IAP (StoreKit/RevenueCat) is wired.
   */
  pro: false,
} as const;
