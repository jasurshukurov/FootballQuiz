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
   */
  leaderboard: true,
} as const;
