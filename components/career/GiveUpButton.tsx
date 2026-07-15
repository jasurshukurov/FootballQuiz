/**
 * Legacy path shim — the real control lives in components/ui/GiveUpButton.
 * Kept so per-mode rollback commits that predate the move still build.
 * New code must import '@/components/ui/GiveUpButton'.
 */
export { default } from '@/components/ui/GiveUpButton';
