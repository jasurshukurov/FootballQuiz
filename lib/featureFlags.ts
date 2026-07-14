/**
 * Product feature flags. Flip here — no per-screen switches.
 *
 * sharing: the "Share Result" / "Copy Result" buttons on game-overs.
 * Hidden for now per owner decision (2026-07-14) — share text/image
 * plumbing stays intact behind the flag so re-enabling is one line.
 */
export const FEATURES = {
  sharing: false,
} as const;
