export type DifficultyTier =
  | 'legendary'
  | 'world_class'
  | 'professional'
  | 'semi_pro'
  | 'amateur'
  | 'beginner';

export interface CareerEntry {
  club: string;
  from: number; // year
  to: number; // year
}

export interface CareerPlayer {
  id: number;
  name: string;
  normalized_name: string;
  nationality: string;
  position: string;
  image_url: string;
  tier: DifficultyTier;
  career: CareerEntry[];
}

export const TIER_ORDER: DifficultyTier[] = [
  'beginner',
  'amateur',
  'semi_pro',
  'professional',
  'world_class',
  'legendary',
];

export const TIER_LABELS: Record<DifficultyTier, string> = {
  beginner: 'Beginner',
  amateur: 'Amateur',
  semi_pro: 'Semi-Pro',
  professional: 'Professional',
  world_class: 'World Class',
  legendary: 'Legendary',
};

export const TIER_COLORS: Record<DifficultyTier, string> = {
  beginner: '#6C757D',
  amateur: '#52B788',
  semi_pro: '#F4A261',
  professional: '#05F26C',
  world_class: '#00BFFF',
  legendary: '#FFD700',
};
