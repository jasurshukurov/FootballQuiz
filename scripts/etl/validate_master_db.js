#!/usr/bin/env node
/**
 * Master Database Validator
 *
 * Reads data/master_db.json and validates structural integrity.
 * Run: node scripts/etl/validate_master_db.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'master_db.json');

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

let errorCount = 0;
let warnCount = 0;

function fail(msg) {
  console.error(`  [FAIL] ${msg}`);
  errorCount++;
}

function warn(msg) {
  console.warn(`  [WARN] ${msg}`);
  warnCount++;
}

function pass(msg) {
  console.log(`  [PASS] ${msg}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function validate() {
  console.log('=== Master Database Validator ===\n');

  if (!fs.existsSync(DB_PATH)) {
    fail(`master_db.json not found at ${DB_PATH}`);
    console.log('\nRun build_master_db.js first.');
    process.exit(1);
  }

  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(raw);

  console.log(`Version: ${db.version}`);
  console.log(`Generated: ${db.generated}`);
  console.log();

  // --- Schema-level checks ---
  console.log('--- Schema checks ---');

  if (db.version !== '2.0') fail(`Expected version "2.0", got "${db.version}"`);
  else pass('Version is "2.0"');

  if (!db.generated) fail('Missing "generated" field');
  else pass(`Generated date: ${db.generated}`);

  if (!db.stats) fail('Missing "stats" object');
  else pass('Stats object present');

  if (!Array.isArray(db.players)) fail('"players" is not an array');
  else pass(`Players array: ${db.players.length} entries`);

  if (!Array.isArray(db.clubs)) fail('"clubs" is not an array');
  else pass(`Clubs array: ${db.clubs.length} entries`);

  if (!Array.isArray(db.matches)) fail('"matches" is not an array');
  else pass(`Matches array: ${db.matches.length} entries`);

  console.log();

  // --- Player checks ---
  console.log('--- Player checks ---');

  const VALID_POSITIONS = new Set(['Goalkeeper', 'Defender', 'Midfielder', 'Forward']);
  const globalIds = new Set();
  let duplicateIds = 0;
  let missingFields = 0;
  let invalidPositions = 0;
  let playersWithCareer = 0;
  let playersWithTransfers = 0;
  let badCareerOrder = 0;

  for (const p of db.players) {
    // Duplicate global_id check
    if (globalIds.has(p.global_id)) {
      duplicateIds++;
      if (duplicateIds <= 5) fail(`Duplicate global_id: ${p.global_id} (${p.name})`);
    }
    globalIds.add(p.global_id);

    // Required fields
    if (!p.name) { missingFields++; if (missingFields <= 3) fail(`Player ${p.global_id}: missing name`); }
    if (!p.normalized_name) { missingFields++; if (missingFields <= 3) fail(`Player ${p.global_id}: missing normalized_name`); }
    if (p.nationality === undefined) { missingFields++; if (missingFields <= 3) fail(`Player ${p.global_id}: missing nationality`); }
    if (!p.position) { missingFields++; if (missingFields <= 3) fail(`Player ${p.global_id}: missing position`); }
    if (p.market_value === undefined) { missingFields++; if (missingFields <= 3) fail(`Player ${p.global_id}: missing market_value`); }
    if (p.image_url === undefined) { missingFields++; if (missingFields <= 3) fail(`Player ${p.global_id}: missing image_url`); }
    if (!p.source_ids) { missingFields++; if (missingFields <= 3) fail(`Player ${p.global_id}: missing source_ids`); }

    // Position validation
    if (p.position && !VALID_POSITIONS.has(p.position)) {
      invalidPositions++;
      if (invalidPositions <= 3) fail(`Player ${p.global_id} (${p.name}): invalid position "${p.position}"`);
    }

    // Career checks
    if (p.career) {
      playersWithCareer++;
      // Check chronological order
      for (let i = 1; i < p.career.length; i++) {
        if (p.career[i].from < p.career[i - 1].from) {
          badCareerOrder++;
          if (badCareerOrder <= 3)
            warn(`Player ${p.global_id} (${p.name}): career not chronological at index ${i}`);
          break;
        }
      }
    }

    if (p.transfers) {
      playersWithTransfers++;
    }
  }

  if (duplicateIds === 0) pass('No duplicate global_ids');
  else fail(`${duplicateIds} duplicate global_ids found`);

  if (missingFields === 0) pass('All required fields present');
  else fail(`${missingFields} missing required fields`);

  if (invalidPositions === 0) pass('All positions valid');
  else fail(`${invalidPositions} invalid positions`);

  if (badCareerOrder === 0) pass('All careers chronologically ordered');
  else warn(`${badCareerOrder} players with non-chronological careers`);

  if (playersWithCareer >= 500) pass(`${playersWithCareer} players have career data (>= 500)`);
  else warn(`Only ${playersWithCareer} players have career data (expected >= 500)`);

  if (playersWithTransfers >= 500) pass(`${playersWithTransfers} players have transfer data (>= 500)`);
  else warn(`Only ${playersWithTransfers} players have transfer data (expected >= 500)`);

  console.log();

  // --- Club checks ---
  console.log('--- Club checks ---');

  const clubIdSet = new Set();
  let duplicateClubIds = 0;

  for (const c of db.clubs) {
    if (clubIdSet.has(c.global_club_id)) {
      duplicateClubIds++;
      if (duplicateClubIds <= 3) fail(`Duplicate club ID: ${c.global_club_id}`);
    }
    clubIdSet.add(c.global_club_id);

    if (!c.canonical_name) fail(`Club ${c.global_club_id}: missing canonical_name`);
  }

  if (duplicateClubIds === 0) pass('No duplicate club IDs');
  else fail(`${duplicateClubIds} duplicate club IDs`);

  // Check that all player current_team_ids exist in clubs
  let missingClubRefs = 0;
  for (const p of db.players) {
    if (p.current_team_id && !clubIdSet.has(p.current_team_id)) {
      missingClubRefs++;
      if (missingClubRefs <= 3)
        fail(`Player ${p.global_id} (${p.name}): current_team_id "${p.current_team_id}" not in clubs`);
    }
    // Check career club_ids
    if (p.career) {
      for (const spell of p.career) {
        if (spell.club_id && !clubIdSet.has(spell.club_id)) {
          missingClubRefs++;
          if (missingClubRefs <= 3)
            fail(`Player ${p.global_id} career club_id "${spell.club_id}" not in clubs`);
        }
      }
    }
  }

  if (missingClubRefs === 0) pass('All player club_ids reference existing clubs');
  else fail(`${missingClubRefs} missing club references`);

  console.log();

  // --- Match checks ---
  console.log('--- Match checks ---');

  if (db.matches.length >= 201) pass(`${db.matches.length} matches present (>= 201)`);
  else warn(`Only ${db.matches.length} matches (expected >= 201)`);

  const matchIds = new Set();
  let duplicateMatchIds = 0;
  let resolvedCount = 0;
  let unresolvedCount = 0;

  for (const m of db.matches) {
    if (matchIds.has(m.match_id)) {
      duplicateMatchIds++;
      if (duplicateMatchIds <= 3) fail(`Duplicate match_id: ${m.match_id}`);
    }
    matchIds.add(m.match_id);

    for (const ref of [...(m.lineup_a || []), ...(m.lineup_b || [])]) {
      if (ref.global_id !== null) resolvedCount++;
      else unresolvedCount++;
    }
  }

  if (duplicateMatchIds === 0) pass('No duplicate match IDs');
  else fail(`${duplicateMatchIds} duplicate match IDs`);

  const totalRefs = resolvedCount + unresolvedCount;
  const resolvedPct = totalRefs > 0 ? ((resolvedCount / totalRefs) * 100).toFixed(1) : '0';
  console.log(`  Lineup refs: ${resolvedCount} resolved, ${unresolvedCount} unresolved (${resolvedPct}% resolved)`);

  console.log();

  // --- Stats cross-check ---
  console.log('--- Stats cross-check ---');

  if (db.stats.total_players === db.players.length) pass('stats.total_players matches');
  else fail(`stats.total_players (${db.stats.total_players}) != players.length (${db.players.length})`);

  if (db.stats.players_with_career === playersWithCareer) pass('stats.players_with_career matches');
  else fail(`stats.players_with_career (${db.stats.players_with_career}) != actual (${playersWithCareer})`);

  if (db.stats.players_with_transfers === playersWithTransfers) pass('stats.players_with_transfers matches');
  else fail(`stats.players_with_transfers (${db.stats.players_with_transfers}) != actual (${playersWithTransfers})`);

  if (db.stats.total_clubs === db.clubs.length) pass('stats.total_clubs matches');
  else fail(`stats.total_clubs (${db.stats.total_clubs}) != clubs.length (${db.clubs.length})`);

  if (db.stats.total_matches === db.matches.length) pass('stats.total_matches matches');
  else fail(`stats.total_matches (${db.stats.total_matches}) != matches.length (${db.matches.length})`);

  // --- Summary ---
  console.log('\n=== Summary ===');
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Warnings: ${warnCount}`);

  if (errorCount === 0) {
    console.log('\n  Master DB is VALID.');
  } else {
    console.log(`\n  Master DB has ${errorCount} error(s). Fix and re-run.`);
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

validate();
