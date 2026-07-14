// Pure solve-time formatting helpers.
//
// Intentionally free of React / React Native imports (same rule as
// lib/shareText.ts) so they stay unit-testable under the plain-node jest
// environment and usable from share-text builders.

/**
 * Format a duration in ms as a compact clock string:
 *   7_000    → "0:07"
 *   161_000  → "2:41"
 *   3_731_000 → "1:02:11"
 * Negative/invalid input clamps to "0:00".
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const two = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${minutes}:${two(seconds)}`;
}

/**
 * The share-text suffix line for a recorded solve time, e.g. "⏱ 2:41".
 * Returns null when no time was recorded so callers can skip the line.
 */
export function buildShareTimeSuffix(elapsedMs: number | null | undefined): string | null {
  if (elapsedMs == null || !Number.isFinite(elapsedMs) || elapsedMs < 0) return null;
  return `⏱ ${formatDuration(elapsedMs)}`;
}
