#!/usr/bin/env node
/**
 * Fame Score Calibrator (Agents 3 & 4 combined)
 *
 * 1. Validates percentile tier boundaries
 * 2. Applies "Cult Hero Override" logic for culturally significant players
 *    whose raw metrics understate their trivia recognizability
 * 3. Catches anomalies: famous players in too-hard tiers, unknowns in too-easy tiers
 * 4. Integrates final fame_score + difficulty_tier into master_db.json
 *
 * Run: node scripts/etl/calibrate_fame_scores.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

function loadJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf-8'));
}

// ---------------------------------------------------------------------------
// Cult Hero Overrides
// Players whose cultural relevance exceeds their raw metric profile.
// fame_floor = minimum fame score they should have
// min_tier = highest difficulty tier they should appear in (easiest = Beginner)
// ---------------------------------------------------------------------------

const TIER_ORDER = ['Beginner', 'Amateur', 'Semi-Pro', 'Professional', 'World Class', 'Legendary', 'Ultimate'];

function tierIndex(tier) {
  return TIER_ORDER.indexOf(tier);
}

const CULT_HERO_OVERRIDES = {
  // World Cup legends who might lack club-career metrics
  'davor suker':           { fame_floor: 65, min_tier: 'Semi-Pro' },
  'davor suker':           { fame_floor: 65, min_tier: 'Semi-Pro' },
  'hristo stoichkov':      { fame_floor: 65, min_tier: 'Semi-Pro' },
  'gheorghe hagi':         { fame_floor: 70, min_tier: 'Semi-Pro' },
  'roger milla':           { fame_floor: 55, min_tier: 'Professional' },
  'just fontaine':         { fame_floor: 55, min_tier: 'Professional' },
  'sandor kocsis':         { fame_floor: 50, min_tier: 'Professional' },
  'gerd muller':           { fame_floor: 70, min_tier: 'Semi-Pro' },
  'fritz walter':          { fame_floor: 50, min_tier: 'Professional' },
  'mario kempes':          { fame_floor: 55, min_tier: 'Professional' },
  'salvatore schillaci':   { fame_floor: 50, min_tier: 'Professional' },

  // Cult hero meme/personality players
  'nicklas bendtner':      { fame_floor: 55, min_tier: 'Professional' },
  'adebayo akinfenwa':     { fame_floor: 50, min_tier: 'Professional' },
  'mario balotelli':       { fame_floor: 60, min_tier: 'Semi-Pro' },
  'rene higuita':          { fame_floor: 55, min_tier: 'Professional' },
  'jorge campos':          { fame_floor: 50, min_tier: 'Professional' },
  'peter crouch':          { fame_floor: 55, min_tier: 'Professional' },
  'emile heskey':          { fame_floor: 50, min_tier: 'Professional' },
  'djibril cisse':         { fame_floor: 50, min_tier: 'Professional' },
  'dimitar berbatov':      { fame_floor: 58, min_tier: 'Semi-Pro' },
  'jimmy bullard':         { fame_floor: 45, min_tier: 'Professional' },
  'edgar davids':          { fame_floor: 60, min_tier: 'Semi-Pro' },
  'jay-jay okocha':        { fame_floor: 58, min_tier: 'Semi-Pro' },

  // Leicester miracle / underdog stories
  'jamie vardy':           { fame_floor: 62, min_tier: 'Semi-Pro' },
  'riyad mahrez':          { fame_floor: 60, min_tier: 'Semi-Pro' },

  // Classic legends who might be under-estimated
  'diego maradona':        { fame_floor: 95, min_tier: 'Beginner' },
  'pele':                  { fame_floor: 95, min_tier: 'Beginner' },
  'johan cruyff':          { fame_floor: 80, min_tier: 'Amateur' },
  'franz beckenbauer':     { fame_floor: 78, min_tier: 'Amateur' },
  'bobby moore':           { fame_floor: 60, min_tier: 'Semi-Pro' },
  'lev yashin':            { fame_floor: 60, min_tier: 'Semi-Pro' },
  'alfredo di stefano':    { fame_floor: 65, min_tier: 'Semi-Pro' },
  'george best':           { fame_floor: 65, min_tier: 'Semi-Pro' },
  'eusebio':               { fame_floor: 65, min_tier: 'Semi-Pro' },

  // Players with viral moments / iconic goals
  'marco van basten':      { fame_floor: 68, min_tier: 'Semi-Pro' },
  'roberto carlos':        { fame_floor: 65, min_tier: 'Semi-Pro' },
  'dennis bergkamp':       { fame_floor: 65, min_tier: 'Semi-Pro' },
  'eric cantona':          { fame_floor: 65, min_tier: 'Semi-Pro' },

  // International tournament stars
  'eder':                  { fame_floor: 45, min_tier: 'Professional' },
  'gotze':                 { fame_floor: 55, min_tier: 'Professional' },
  'mario gotze':           { fame_floor: 55, min_tier: 'Professional' },
  'andres iniesta':        { fame_floor: 80, min_tier: 'Amateur' },
  'fabio grosso':          { fame_floor: 45, min_tier: 'Professional' },

  // Current stars who must be in easy tiers
  'lionel messi':          { fame_floor: 96, min_tier: 'Beginner' },
  'cristiano ronaldo':     { fame_floor: 96, min_tier: 'Beginner' },
  'neymar':                { fame_floor: 85, min_tier: 'Amateur' },
  'kylian mbappe':         { fame_floor: 88, min_tier: 'Beginner' },
  'erling haaland':        { fame_floor: 85, min_tier: 'Amateur' },

  // Saul, Gelson - should NOT be in easy tiers (verify they stay hard)
  // No override needed — they'll naturally fall

  // Managers who were famous players
  'pep guardiola':         { fame_floor: 60, min_tier: 'Semi-Pro' },
};

// ---------------------------------------------------------------------------
// Main Calibration
// ---------------------------------------------------------------------------

function main() {
  console.log('=== Fame Score Calibrator ===\n');

  const fameScores = loadJSON('fame_scores.json');
  const masterDb = loadJSON('master_db.json');

  console.log(`Loaded ${fameScores.length} fame scores`);
  console.log(`Loaded ${masterDb.players.length} master records`);

  // Build lookup
  const fameMap = new Map();
  for (const f of fameScores) {
    fameMap.set(f.global_id, f);
  }

  // ── Step 1: Apply cult hero overrides ──
  let overrideCount = 0;
  let tierBumps = 0;
  let scoreBumps = 0;

  for (const f of fameScores) {
    const nn = f.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const override = CULT_HERO_OVERRIDES[nn];
    if (!override) continue;

    overrideCount++;

    // Apply fame floor
    if (f.fame_score < override.fame_floor) {
      const oldScore = f.fame_score;
      f.fame_score = override.fame_floor;
      scoreBumps++;
      console.log(`  Score bump: ${f.name} ${oldScore.toFixed(2)} → ${f.fame_score}`);
    }

    // Apply tier floor (min_tier means easiest allowed)
    const minTierIdx = tierIndex(override.min_tier);
    const currentTierIdx = tierIndex(f.difficulty_tier);
    if (currentTierIdx > minTierIdx) {
      const oldTier = f.difficulty_tier;
      f.difficulty_tier = override.min_tier;
      tierBumps++;
      console.log(`  Tier bump: ${f.name} ${oldTier} → ${f.difficulty_tier}`);
    }
  }

  console.log(`\nOverrides applied: ${overrideCount}`);
  console.log(`  Score bumps: ${scoreBumps}`);
  console.log(`  Tier bumps: ${tierBumps}`);

  // ── Step 2: Anomaly detection ──
  console.log('\n--- Anomaly Scan ---');

  // Check: any player with fame > 75 in harder-than-Amateur tier
  const famousInHardTier = fameScores.filter(f =>
    f.fame_score >= 75 && tierIndex(f.difficulty_tier) > tierIndex('Amateur')
  );
  if (famousInHardTier.length > 0) {
    console.log(`\nWARNING: ${famousInHardTier.length} players with fame >= 75 in hard tiers:`);
    for (const f of famousInHardTier.slice(0, 10)) {
      console.log(`  ${f.name}: score=${f.fame_score}, tier=${f.difficulty_tier}`);
    }
  }

  // Check: any player with fame < 30 in easier-than-Professional tier
  const unknownInEasyTier = fameScores.filter(f =>
    f.fame_score < 30 && tierIndex(f.difficulty_tier) < tierIndex('Professional')
  );
  if (unknownInEasyTier.length > 0) {
    console.log(`\nWARNING: ${unknownInEasyTier.length} players with fame < 30 in easy tiers:`);
    for (const f of unknownInEasyTier.slice(0, 10)) {
      console.log(`  ${f.name}: score=${f.fame_score}, tier=${f.difficulty_tier}`);
    }
  }

  if (famousInHardTier.length === 0 && unknownInEasyTier.length === 0) {
    console.log('No anomalies found.');
  }

  // ── Step 3: Re-validate tier distribution after overrides ──
  console.log('\n--- Final Tier Distribution ---');
  const tierCounts = {};
  for (const f of fameScores) {
    tierCounts[f.difficulty_tier] = (tierCounts[f.difficulty_tier] || 0) + 1;
  }
  for (const tier of TIER_ORDER) {
    const count = tierCounts[tier] || 0;
    console.log(`  ${tier.padEnd(15)} ${String(count).padStart(5)} players (${(count / fameScores.length * 100).toFixed(1)}%)`);
  }

  // ── Step 4: Sample validation ──
  console.log('\n--- Sample Players per Tier ---');
  for (const tier of TIER_ORDER) {
    const inTier = fameScores
      .filter(f => f.difficulty_tier === tier)
      .sort((a, b) => b.fame_score - a.fame_score);
    const samples = inTier.slice(0, 5).map(f => `${f.name} (${f.fame_score})`);
    console.log(`  ${tier}: ${samples.join(', ')}`);
  }

  // ── Step 5: Write calibrated fame_scores.json ──
  const calibratedOutput = fameScores.map(f => ({
    global_id: f.global_id,
    name: f.name,
    fame_score: f.fame_score,
    difficulty_tier: f.difficulty_tier,
    is_modern: f.is_modern,
    metrics: f.metrics,
  }));

  const fameOutputPath = path.join(DATA_DIR, 'fame_scores.json');
  fs.writeFileSync(fameOutputPath, JSON.stringify(calibratedOutput));
  console.log(`\nWritten calibrated fame scores to ${fameOutputPath}`);

  // ── Step 6: Integrate into master_db.json ──
  console.log('\nIntegrating into master_db.json...');

  let integrated = 0;
  for (const player of masterDb.players) {
    const fame = fameMap.get(player.global_id);
    if (fame) {
      player.popularity_score = fame.fame_score;
      // Map difficulty_tier to the DifficultyTier type used in master schema
      const tierMapping = {
        'Beginner': 'beginner',
        'Amateur': 'amateur',
        'Semi-Pro': 'semi_pro',
        'Professional': 'professional',
        'World Class': 'world_class',
        'Legendary': 'legendary',
        'Ultimate': 'legendary', // Merge Ultimate into Legendary for the 6-tier schema
      };
      // Only set career_tier if not already set from career_paths data
      if (!player.career_tier) {
        player.career_tier = tierMapping[fame.difficulty_tier] || 'professional';
      }
      integrated++;
    }
  }

  console.log(`Integrated fame scores for ${integrated} players`);

  // Update stats
  masterDb.stats.players_with_popularity_score = integrated;

  // Write updated master_db
  const masterOutputPath = path.join(DATA_DIR, 'master_db.json');
  fs.writeFileSync(masterOutputPath, JSON.stringify(masterDb));
  const sizeMB = (fs.statSync(masterOutputPath).size / 1024 / 1024).toFixed(2);
  console.log(`Updated master_db.json (${sizeMB} MB)`);

  console.log('\n=== Calibration Complete ===');
}

main();
