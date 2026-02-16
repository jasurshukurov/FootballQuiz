/**
 * Game Mode Router — maps data subsets from master_db.json to each game mode.
 * Provides tier-aware field selection and key compression mapping.
 */

const fs = require('fs');
const path = require('path');

// --- Tier ordering (lowest to highest) ---
const TIER_ORDER = ['beginner', 'amateur', 'semi_pro', 'professional', 'world_class', 'legendary'];

// --- Field lists per game mode ---
const MODE_FIELD_MAP = {
  who_are_ya: ['global_id', 'name', 'nationality', 'current_team', 'league', 'position', 'market_value', 'image_url'],
  grid: ['global_id', 'name', 'current_team', 'league', 'nationality', 'position'],
  career_path: ['global_id', 'name', 'normalized_name', 'nationality', 'position', 'image_url', 'career', 'career_tier'],
  missing11: ['match_id', 'competition', 'season', 'team_a', 'team_b', 'score', 'lineup_a', 'lineup_b'],
  connections: ['global_id', 'name', 'nationality', 'current_team', 'position', 'league'],
  badge: [],  // uses team names only, not player data
  higherlower: ['global_id', 'name', 'current_team', 'nationality', 'market_value', 'image_url'],
  agent: ['global_id', 'name', 'transfers'],
};

// --- Key compression map for payload minimizer ---
const KEY_COMPRESSION_MAP = {
  global_id: 'id',
  name: 'n',
  nationality: 'nat',
  current_team: 't',
  league: 'lg',
  position: 'pos',
  market_value: 'mv',
  image_url: 'img',
  career: 'cr',
  club: 'c',
  from: 'f',
  to: 'to',
  career_tier: 'dt',
  transfers: 'tr',
  fee: 'fe',
  club_name: 'cn',
  date_joined: 'dj',
  date_left: 'dl',
  normalized_name: 'nn',
  popularity_score: 'fs',
  // Match fields
  match_id: 'mid',
  competition: 'comp',
  season: 'sn',
  score: 'sc',
  lineup_a: 'la',
  lineup_b: 'lb',
  team_a: 'ta',
  team_b: 'tb',
};

/**
 * Returns the field list each mode needs (for payload minimizer).
 */
function getModeFieldMap() {
  return MODE_FIELD_MAP;
}

/**
 * Filter players by career tier.
 * 'all' returns every player. Otherwise returns players at or above the given tier.
 */
function filterByTier(players, tier) {
  if (tier === 'all') return players;
  const idx = TIER_ORDER.indexOf(tier);
  if (idx === -1) throw new Error(`Unknown tier: ${tier}`);
  const validTiers = new Set(TIER_ORDER.slice(idx));
  return players.filter(p => validTiers.has(p.career_tier));
}

/**
 * Project a player object to only the fields needed for a given mode.
 */
function projectFields(player, fields) {
  const result = {};
  for (const f of fields) {
    if (player[f] !== undefined) {
      result[f] = player[f];
    }
  }
  return result;
}

/**
 * Returns filtered & projected players (or matches/teams) for a mode + tier combination.
 */
function getPlayersForMode(mode, tier, masterDb) {
  const fields = MODE_FIELD_MAP[mode];
  if (!fields) throw new Error(`Unknown mode: ${mode}`);

  // missing11 returns match data, tier filter does not apply
  if (mode === 'missing11') {
    return (masterDb.matches || []).map(m => projectFields(m, fields));
  }

  // badge uses team names only, tier filter does not apply
  if (mode === 'badge') {
    const teamSet = new Set();
    (masterDb.players || []).forEach(p => {
      if (p.current_team) teamSet.add(p.current_team);
    });
    return Array.from(teamSet).sort();
  }

  let players = masterDb.players || [];

  // Mode-specific pre-filters
  if (mode === 'career_path') {
    players = players.filter(p => p.career && p.career.length > 0);
  }
  if (mode === 'agent') {
    players = players.filter(p =>
      p.transfers && p.transfers.some(t => t.fee && t.fee !== 'Free' && t.fee !== null)
    );
  }

  // Apply tier filter
  players = filterByTier(players, tier);

  // Project to only needed fields
  return players.map(p => projectFields(p, fields));
}

module.exports = {
  getPlayersForMode,
  getModeFieldMap,
  filterByTier,
  KEY_COMPRESSION_MAP,
  TIER_ORDER,
};

// --- Standalone summary ---
if (require.main === module) {
  const dbPath = path.resolve(__dirname, '../../data/master_db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('master_db.json not found at', dbPath);
    process.exit(1);
  }
  const masterDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const modes = Object.keys(MODE_FIELD_MAP);
  const tiers = [...TIER_ORDER, 'all'];

  console.log('=== Game Mode Router Summary ===\n');
  for (const mode of modes) {
    console.log(`[${mode}]`);
    if (mode === 'missing11') {
      const data = getPlayersForMode(mode, 'all', masterDb);
      console.log(`  matches: ${data.length}`);
    } else if (mode === 'badge') {
      const data = getPlayersForMode(mode, 'all', masterDb);
      console.log(`  teams: ${data.length}`);
    } else {
      for (const tier of tiers) {
        const data = getPlayersForMode(mode, tier, masterDb);
        console.log(`  ${tier}: ${data.length} players`);
      }
    }
    console.log(`  fields: [${MODE_FIELD_MAP[mode].join(', ')}]\n`);
  }
}
