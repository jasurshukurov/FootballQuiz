#!/usr/bin/env node
/**
 * Master Database Builder
 *
 * Merges all data sources into a single unified database:
 *   - players_db_v1.json  (12k+ players — base records)
 *   - career_paths.json   (510 players with career histories)
 *   - transfers.json      (510 players with transfer records)
 *   - matches_db.json     (201 matches with lineups)
 *
 * Optionally loads resolution maps produced by the Entity Resolver:
 *   - player_id_map.json  (cross-source player ID mapping)
 *   - club_id_map.json    (canonical club ID mapping)
 *
 * Run: node scripts/etl/build_master_db.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Convert a club display name to a slug id (lowercase, hyphenated). */
function toClubId(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Map raw position strings from players_db (e.g. "Attack") to canonical
 * position values used in the master schema.
 */
const POSITION_MAP = {
  'goalkeeper': 'Goalkeeper',
  'defence': 'Defender',
  'defender': 'Defender',
  'midfield': 'Midfielder',
  'midfielder': 'Midfielder',
  'attack': 'Forward',
  'forward': 'Forward',
};

function normalizePosition(raw) {
  const mapped = POSITION_MAP[raw.toLowerCase()];
  if (mapped) return mapped;
  // Fallback: try to detect from substring
  const lower = raw.toLowerCase();
  if (lower.includes('goal') || lower.includes('keeper')) return 'Goalkeeper';
  if (lower.includes('def') || lower.includes('back')) return 'Defender';
  if (lower.includes('mid')) return 'Midfielder';
  return 'Forward';
}

// ---------------------------------------------------------------------------
// Main Build Pipeline
// ---------------------------------------------------------------------------

function buildMasterDB() {
  console.log('=== Master Database Builder ===\n');
  console.log('Loading source data...');

  const playersDb = loadJSON('players_db_v1.json') || [];
  const careerPaths = loadJSON('career_paths.json') || [];
  const transfers = loadJSON('transfers.json') || [];
  const matches = loadJSON('matches_db.json') || [];
  const playerIdMap = loadJSON('player_id_map.json');
  const clubIdMap = loadJSON('club_id_map.json');

  console.log(`  Players DB:    ${playersDb.length}`);
  console.log(`  Career Paths:  ${careerPaths.length}`);
  console.log(`  Transfers:     ${transfers.length}`);
  console.log(`  Matches:       ${matches.length}`);
  console.log(`  Player ID Map: ${playerIdMap ? 'loaded' : 'not found (using name matching)'}`);
  console.log(`  Club ID Map:   ${clubIdMap ? 'loaded' : 'not found (using slug generation)'}`);
  console.log();

  // -------------------------------------------------------------------------
  // Step 1: Index career and transfer data by normalized name for matching
  // -------------------------------------------------------------------------

  // Build career index by player id AND normalized name
  const careerById = new Map();
  const careerByName = new Map();
  for (const cp of careerPaths) {
    careerById.set(cp.id, cp);
    careerByName.set(normalizeName(cp.name), cp);
  }

  // Build transfer index by player_id AND normalized name
  const transferById = new Map();
  const transferByName = new Map();
  for (const t of transfers) {
    transferById.set(t.player_id, t);
    transferByName.set(normalizeName(t.player_name), t);
  }

  // -------------------------------------------------------------------------
  // Step 2: Resolve club IDs — build a canonical club registry
  // -------------------------------------------------------------------------

  // Collect all club names from all sources
  const clubNames = new Map(); // clubId -> { canonical_name, aliases, league, country }

  function registerClub(name, league, country) {
    if (!name) return '';
    const id = clubIdMap?.[name] || toClubId(name);
    if (!clubNames.has(id)) {
      clubNames.set(id, {
        canonical_name: name,
        aliases: [],
        league: league || '',
        country: country || '',
      });
    } else {
      const existing = clubNames.get(id);
      // If the new name is different, add as alias
      if (existing.canonical_name !== name && !existing.aliases.includes(name)) {
        existing.aliases.push(name);
      }
      // Fill in league/country if missing
      if (!existing.league && league) existing.league = league;
      if (!existing.country && country) existing.country = country;
    }
    return id;
  }

  // -------------------------------------------------------------------------
  // Step 3: Build MasterPlayerRecords from players_db as base
  // -------------------------------------------------------------------------

  console.log('Building master player records...');

  let nextGlobalId = 1;
  const usedGlobalIds = new Set();
  const masterPlayers = [];
  const playerNameIndex = new Map(); // normalized_name -> global_id

  for (const p of playersDb) {
    const globalId = playerIdMap?.[String(p.id)]?.global_id || nextGlobalId++;
    usedGlobalIds.add(globalId);

    const teamId = registerClub(p.current_team, p.league, '');
    const normalizedN = p.normalized_name || normalizeName(p.name);

    // Find matching career data
    const careerData = careerById.get(p.id) || careerByName.get(normalizedN);

    // Find matching transfer data
    const transferData = transferById.get(p.id) || transferByName.get(normalizedN);

    const record = {
      global_id: globalId,
      name: p.name,
      normalized_name: normalizedN,
      nationality: p.nationality || '',
      position: normalizePosition(p.position || 'Forward'),
      current_team: p.current_team || '',
      current_team_id: teamId,
      league: p.league || '',
      market_value: p.market_value || 0,
      image_url: p.image_url || '',
      source_ids: { players_db: p.id },
    };

    // Enrich with career data
    if (careerData) {
      record.career = careerData.career.map((c) => {
        const cid = registerClub(c.club, '', '');
        return {
          club: c.club,
          club_id: cid,
          from: c.from,
          to: c.to,
        };
      });
      record.career_tier = careerData.tier;
      record.source_ids.career_paths = careerData.id;

      // Use career image if players_db has none
      if (!record.image_url && careerData.image_url) {
        record.image_url = careerData.image_url;
      }
    }

    // Enrich with transfer data
    if (transferData) {
      record.transfers = transferData.transfers.map((t) => {
        registerClub(t.club_name, '', '');
        return {
          club_name: t.club_name,
          club_id: t.club_id || toClubId(t.club_name),
          date_joined: t.date_joined,
          date_left: t.date_left,
          fee: t.fee,
        };
      });
      record.source_ids.transfers = transferData.player_id;
    }

    masterPlayers.push(record);
    playerNameIndex.set(normalizedN, globalId);
  }

  // -------------------------------------------------------------------------
  // Step 4: Add career/transfer-only players not in players_db
  // -------------------------------------------------------------------------

  console.log('Adding career/transfer-only players...');
  let addedFromCareer = 0;
  let addedFromTransfer = 0;

  for (const cp of careerPaths) {
    const nn = normalizeName(cp.name);
    if (playerNameIndex.has(nn)) continue;

    const globalId = nextGlobalId++;
    usedGlobalIds.add(globalId);

    // Try to determine current team from last career entry
    const lastCareer = cp.career[cp.career.length - 1];
    const teamId = lastCareer ? registerClub(lastCareer.club, '', '') : '';

    const record = {
      global_id: globalId,
      name: cp.name,
      normalized_name: nn,
      nationality: cp.nationality || '',
      position: normalizePosition(cp.position || 'Forward'),
      current_team: lastCareer ? lastCareer.club : '',
      current_team_id: teamId,
      league: '',
      market_value: 0,
      image_url: cp.image_url || '',
      source_ids: { career_paths: cp.id },
      career: cp.career.map((c) => {
        const cid = registerClub(c.club, '', '');
        return { club: c.club, club_id: cid, from: c.from, to: c.to };
      }),
      career_tier: cp.tier,
    };

    // Check if there's matching transfer data
    const transferData = transferById.get(cp.id) || transferByName.get(nn);
    if (transferData) {
      record.transfers = transferData.transfers.map((t) => {
        registerClub(t.club_name, '', '');
        return {
          club_name: t.club_name,
          club_id: t.club_id || toClubId(t.club_name),
          date_joined: t.date_joined,
          date_left: t.date_left,
          fee: t.fee,
        };
      });
      record.source_ids.transfers = transferData.player_id;
    }

    masterPlayers.push(record);
    playerNameIndex.set(nn, globalId);
    addedFromCareer++;
  }

  for (const t of transfers) {
    const nn = normalizeName(t.player_name);
    if (playerNameIndex.has(nn)) continue;

    const globalId = nextGlobalId++;
    usedGlobalIds.add(globalId);

    // Try to determine current team from last transfer entry (one without date_left)
    const currentTransfer = t.transfers.find((tr) => tr.date_left === null);
    const lastTransfer = currentTransfer || t.transfers[t.transfers.length - 1];
    const teamId = lastTransfer ? registerClub(lastTransfer.club_name, '', '') : '';

    const record = {
      global_id: globalId,
      name: t.player_name,
      normalized_name: nn,
      nationality: '',
      position: 'Forward', // unknown — default
      current_team: lastTransfer ? lastTransfer.club_name : '',
      current_team_id: teamId,
      league: '',
      market_value: 0,
      image_url: '',
      source_ids: { transfers: t.player_id },
      transfers: t.transfers.map((tr) => {
        registerClub(tr.club_name, '', '');
        return {
          club_name: tr.club_name,
          club_id: tr.club_id || toClubId(tr.club_name),
          date_joined: tr.date_joined,
          date_left: tr.date_left,
          fee: tr.fee,
        };
      }),
    };

    masterPlayers.push(record);
    playerNameIndex.set(nn, globalId);
    addedFromTransfer++;
  }

  console.log(`  Added ${addedFromCareer} career-only players`);
  console.log(`  Added ${addedFromTransfer} transfer-only players`);

  // -------------------------------------------------------------------------
  // Step 5: Build club records with player counts
  // -------------------------------------------------------------------------

  console.log('Building club records...');

  // Count players per club
  const clubPlayerCount = new Map();
  for (const p of masterPlayers) {
    if (p.current_team_id) {
      clubPlayerCount.set(
        p.current_team_id,
        (clubPlayerCount.get(p.current_team_id) || 0) + 1
      );
    }
  }

  const masterClubs = [];
  for (const [clubId, info] of clubNames) {
    masterClubs.push({
      global_club_id: clubId,
      canonical_name: info.canonical_name,
      aliases: info.aliases,
      league: info.league,
      country: info.country,
      colors: null,
      player_count: clubPlayerCount.get(clubId) || 0,
    });
  }

  // -------------------------------------------------------------------------
  // Step 6: Build match records with resolved player refs
  // -------------------------------------------------------------------------

  console.log('Building match records...');

  let resolvedRefs = 0;
  let unresolvedRefs = 0;

  const masterMatches = matches.map((m) => {
    const teamAId = registerClub(m.opponent_a, '', '');
    const teamBId = registerClub(m.opponent_b, '', '');

    function resolveLineup(names, ids) {
      return names.map((name, i) => {
        // First try the stored ID if it's nonzero
        const storedId = ids?.[i];
        if (storedId && storedId !== 0) {
          resolvedRefs++;
          return { global_id: storedId, name };
        }

        // Fall back to name matching
        const nn = normalizeName(name);
        const matchedId = playerNameIndex.get(nn);
        if (matchedId) {
          resolvedRefs++;
          return { global_id: matchedId, name };
        }

        unresolvedRefs++;
        return { global_id: null, name };
      });
    }

    return {
      match_id: m.match_id,
      date: m.date,
      competition: m.competition,
      season: m.season,
      team_a: { name: m.opponent_a, club_id: teamAId },
      team_b: { name: m.opponent_b, club_id: teamBId },
      score: m.score,
      lineup_a: resolveLineup(m.lineup_a_names || [], m.lineup_a_ids || []),
      lineup_b: resolveLineup(m.lineup_b_names || [], m.lineup_b_ids || []),
    };
  });

  console.log(`  Resolved refs:   ${resolvedRefs}`);
  console.log(`  Unresolved refs: ${unresolvedRefs}`);

  // -------------------------------------------------------------------------
  // Step 7: Strip empty optional fields to minimize output size
  // -------------------------------------------------------------------------

  console.log('Stripping empty optional fields...');

  for (const p of masterPlayers) {
    if (!p.career) delete p.career;
    if (!p.career_tier) delete p.career_tier;
    if (!p.transfers) delete p.transfers;
    if (p.popularity_score === undefined) delete p.popularity_score;

    // Clean source_ids — remove undefined entries
    const cleanSources = {};
    if (p.source_ids.players_db !== undefined)
      cleanSources.players_db = p.source_ids.players_db;
    if (p.source_ids.career_paths !== undefined)
      cleanSources.career_paths = p.source_ids.career_paths;
    if (p.source_ids.transfers !== undefined)
      cleanSources.transfers = p.source_ids.transfers;
    p.source_ids = cleanSources;
  }

  // Strip empty aliases arrays from clubs
  for (const c of masterClubs) {
    if (c.aliases.length === 0) delete c.aliases;
    if (!c.league) delete c.league;
    if (!c.country) delete c.country;
    if (c.colors === null) delete c.colors;
  }

  // -------------------------------------------------------------------------
  // Step 8: Compute stats and output
  // -------------------------------------------------------------------------

  const playersWithCareer = masterPlayers.filter((p) => p.career).length;
  const playersWithTransfers = masterPlayers.filter((p) => p.transfers).length;

  const masterDb = {
    version: '2.0',
    generated: new Date().toISOString().split('T')[0],
    stats: {
      total_players: masterPlayers.length,
      players_with_career: playersWithCareer,
      players_with_transfers: playersWithTransfers,
      total_clubs: masterClubs.length,
      total_matches: masterMatches.length,
    },
    players: masterPlayers,
    clubs: masterClubs,
    matches: masterMatches,
  };

  // Write minified output
  const outputPath = path.join(DATA_DIR, 'master_db.json');
  fs.writeFileSync(outputPath, JSON.stringify(masterDb));

  const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);

  console.log('\n=== Build Complete ===');
  console.log(`  Total players:        ${masterDb.stats.total_players}`);
  console.log(`  Players with career:  ${masterDb.stats.players_with_career}`);
  console.log(`  Players with transfer:${masterDb.stats.players_with_transfers}`);
  console.log(`  Total clubs:          ${masterDb.stats.total_clubs}`);
  console.log(`  Total matches:        ${masterDb.stats.total_matches}`);
  console.log(`  Output: ${outputPath}`);
  console.log(`  File size: ${fileSizeMB} MB`);
}

buildMasterDB();
