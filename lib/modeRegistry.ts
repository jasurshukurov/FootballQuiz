import type FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';

export interface GameMode {
  /** Daily-progress store key. Never change these — persisted state joins on them. */
  key: string;
  title: string;
  /** One-line tease shown on hub cards. */
  tease: string;
  route: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
}

/**
 * Canonical registry of the daily modes, in hub display order. Hub feed,
 * next-up, progress meters and recap counts all derive from this list —
 * add/remove modes HERE, never by hardcoding counts elsewhere.
 *
 * Deprecated (removed from this registry, code kept dormant):
 *  - 'marketmovers' (Market Movers) — duplicated Higher/Lower's binary loop
 *    (market value vs transfer fee; fee knowledge is covered by Transfer
 *    Agent). Screen + generator remain compilable for possible revival:
 *    app/(tabs)/marketmovers.tsx, lib/feeHigherLowerGenerator.ts.
 */
/**
 * Career Path is ENDLESS since 2026-07-15 (owner call): not part of the daily
 * set, pinned at the top of the hub, deals a new player on demand. It keeps
 * its route/screen and store keys; it just no longer counts toward daily
 * progress, NEXT UP chains, or perfect days.
 */
export const ENDLESS_MODE: GameMode = {
  key: 'careerpath',
  title: 'Career Path',
  tease: 'Endless. Name the player from their club history',
  route: '/(tabs)/careerpath',
  icon: 'road',
};

export const GAME_MODES: GameMode[] = [
  {
    key: 'who-are-ya',
    title: 'My Name Is…',
    tease: 'Guess the mystery player from clues',
    route: '/(tabs)/whoareya',
    icon: 'futbol-o',
  },
  {
    key: 'grid',
    title: 'The Grid',
    tease: 'One player for every club crossing',
    route: '/(tabs)/explore',
    icon: 'th',
  },
  {
    key: 'missing11',
    title: 'Missing XI',
    tease: 'Fill in the famous starting lineup',
    route: '/(tabs)/missing11',
    icon: 'users',
  },
  {
    key: 'connections',
    title: 'Connections',
    tease: 'Sort 16 players into 4 hidden groups',
    route: '/(tabs)/connections',
    icon: 'link',
  },
  {
    key: 'toplists',
    title: 'Top Lists',
    tease: 'Name everyone on today’s ranking',
    route: '/(tabs)/toplists',
    icon: 'list-ol',
  },
  {
    key: 'higherlower',
    title: 'Higher / Lower',
    tease: 'Who’s worth more today? Build a streak',
    route: '/(tabs)/higherlower',
    icon: 'arrows-v',
  },
  {
    key: 'agent',
    title: 'Transfer Agent',
    tease: 'Match the player to their transfer',
    route: '/(tabs)/agent',
    icon: 'money',
  },
  {
    key: 'blindranking',
    title: 'Blind Ranking',
    tease: 'Rank 5 players without peeking',
    route: '/(tabs)/blindranking',
    icon: 'sort-amount-desc',
  },
  {
    key: 'careertimeline',
    title: 'Career Timeline',
    tease: 'Rebuild the career, club by club',
    route: '/(tabs)/careertimeline',
    icon: 'history',
  },
  {
    key: 'guessmatch',
    title: 'Guess the Match',
    tease: 'Identify the game from its XI',
    route: '/(tabs)/guessmatch',
    icon: 'flag-checkered',
  },
];

/** Modes not disabled by remote config, in display order. */
export function getActiveModes(): GameMode[] {
  const disabled = useRemoteConfigStore.getState().config.disabled_modes;
  return GAME_MODES.filter((m) => !disabled.includes(m.key));
}

/**
 * The next mode the user hasn't completed today (excluding `excludeKey`,
 * usually the mode just finished). Null when the day is complete —
 * callers show the perfect-day/countdown state instead.
 */
export function getNextUnplayedMode(excludeKey?: string): GameMode | null {
  const { isCompleted } = useDailyProgressStore.getState();
  return getActiveModes().find((m) => m.key !== excludeKey && !isCompleted(m.key)) ?? null;
}
