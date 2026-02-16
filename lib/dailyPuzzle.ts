import { Player } from '@/types/player';
import { getAllPlayers } from './playerData';

const EPOCH = new Date('2025-01-01T00:00:00Z');

export function getDailyNumber(date: Date = new Date()): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const diffMs = utcDate.getTime() - EPOCH.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function seededRandom(seed: number): number {
  // Simple deterministic hash (mulberry32)
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function getDailyTarget(date: Date = new Date()): Player {
  const dayNumber = getDailyNumber(date);
  const players = getAllPlayers();
  const index = Math.floor(seededRandom(dayNumber) * players.length);
  return players[index];
}

export function getRandomTarget(): Player {
  const players = getAllPlayers();
  const index = Math.floor(Math.random() * players.length);
  return players[index];
}
