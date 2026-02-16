const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

function loadJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf-8'));
}

// === LOGARITHMIC SCALING ===
// Use log scaling so outliers don't skew the 0-100 range
function logScale(value, min, max) {
  if (value <= 0) return 0;
  const logVal = Math.log10(value + 1);
  const logMin = Math.log10(Math.max(min, 1));
  const logMax = Math.log10(Math.max(max, 2));
  return Math.max(0, Math.min(100, ((logVal - logMin) / (logMax - logMin)) * 100));
}

// === ERA DETECTION ===
function isModernPlayer(player) {
  // Modern = active post-2005
  if (player.career && player.career.length > 0) {
    const latestYear = Math.max(...player.career.map(c => c.to));
    return latestYear >= 2005;
  }
  // If no career data, assume modern (most of the 12k players are current)
  return true;
}

// === FAME SCORE CALCULATION ===
function calculateFameScore(metrics, player) {
  const modern = isModernPlayer(player);

  // Normalize each metric to 0-100 using log scaling
  const wikiScore = logScale(metrics.wikipedia_pageviews, 50, 3500000);
  const gameScore = metrics.peak_game_rating; // Already 0-99 scale
  const valScore = logScale(metrics.peak_valuation_euros, 100000, 250000000);
  const exposureScore = logScale(metrics.elite_exposure, 1, 250);

  let fameScore;

  if (modern) {
    // Modern Players (Active post-2005):
    // Wikipedia Views (40%), Peak Game Rating (30%), Elite Exposure (15%), Peak Valuation (15%)
    fameScore = (
      wikiScore * 0.40 +
      gameScore * 0.30 +
      exposureScore * 0.15 +
      valScore * 0.15
    );
  } else {
    // Historic Players (Active pre-2005):
    // Wikipedia Views (50%), Elite Exposure/Trophies (50%)
    // Ignore game rating and valuation (unreliable for older players)
    fameScore = (
      wikiScore * 0.50 +
      exposureScore * 0.50
    );
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(fameScore * 100) / 100));
}

// === TIER ASSIGNMENT BY PERCENTILES ===
// Beginner:     Top 1%    (99th-100th) -- Household names
// Amateur:      Next 4%   (95th-99th)  -- Mainstream stars
// Semi-Pro:     Next 10%  (85th-95th)  -- Regular starters
// Professional: Next 25%  (60th-85th)  -- Squad players
// World Class:  Next 30%  (30th-60th)  -- Average professionals
// Legendary:    Next 29.9%(0.1th-30th) -- Niche/lower division
// Ultimate:     Bottom 0.1%(0-0.1th)   -- Absolute obscurity

function assignTiers(scoredPlayers) {
  // Sort by fame_score descending
  const sorted = [...scoredPlayers].sort((a, b) => b.fame_score - a.fame_score);
  const total = sorted.length;

  const tiers = {
    'Beginner':     { start: 0,                         end: Math.floor(total * 0.01) },
    'Amateur':      { start: Math.floor(total * 0.01),  end: Math.floor(total * 0.05) },
    'Semi-Pro':     { start: Math.floor(total * 0.05),  end: Math.floor(total * 0.15) },
    'Professional': { start: Math.floor(total * 0.15),  end: Math.floor(total * 0.40) },
    'World Class':  { start: Math.floor(total * 0.40),  end: Math.floor(total * 0.70) },
    'Legendary':    { start: Math.floor(total * 0.70),  end: Math.floor(total * 0.999) },
    'Ultimate':     { start: Math.floor(total * 0.999), end: total },
  };

  for (const [tierName, range] of Object.entries(tiers)) {
    for (let i = range.start; i < range.end; i++) {
      sorted[i].difficulty_tier = tierName;
    }
  }

  return sorted;
}

function main() {
  console.log('=== Fame Score Calculator ===\n');

  // Load data
  const metrics = loadJSON('popularity_metrics.json');
  const masterDb = loadJSON('master_db.json');

  // Build player lookup
  const playerMap = new Map();
  for (const p of masterDb.players) {
    playerMap.set(p.global_id, p);
  }

  console.log(`Loaded ${metrics.length} player metrics`);
  console.log(`Loaded ${masterDb.players.length} master records`);

  // Calculate fame scores
  const scored = metrics.map(m => {
    const player = playerMap.get(m.global_id);
    const fame_score = calculateFameScore(m, player || {});
    return {
      global_id: m.global_id,
      name: m.name,
      fame_score,
      wikipedia_pageviews: m.wikipedia_pageviews,
      peak_game_rating: m.peak_game_rating,
      peak_valuation_euros: m.peak_valuation_euros,
      elite_exposure: m.elite_exposure,
      is_modern: player ? isModernPlayer(player) : true,
    };
  });

  // Assign tiers
  const tiered = assignTiers(scored);

  // Stats
  const scores = tiered.map(p => p.fame_score);
  const sortedScores = [...scores].sort((a, b) => a - b);
  console.log(`\nFame Score Distribution:`);
  console.log(`  Min: ${Math.min(...scores).toFixed(2)}`);
  console.log(`  Max: ${Math.max(...scores).toFixed(2)}`);
  console.log(`  Mean: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)}`);
  console.log(`  Median: ${sortedScores[Math.floor(sortedScores.length / 2)].toFixed(2)}`);

  // Tier counts
  const tierCounts = {};
  for (const p of tiered) {
    tierCounts[p.difficulty_tier] = (tierCounts[p.difficulty_tier] || 0) + 1;
  }
  console.log(`\nTier Distribution:`);
  for (const tier of ['Beginner', 'Amateur', 'Semi-Pro', 'Professional', 'World Class', 'Legendary', 'Ultimate']) {
    const count = tierCounts[tier] || 0;
    console.log(`  ${tier.padEnd(15)} ${String(count).padStart(5)} players (${(count / tiered.length * 100).toFixed(1)}%)`);
  }

  // Sample each tier
  console.log(`\nSample Players per Tier:`);
  for (const tier of ['Beginner', 'Amateur', 'Semi-Pro', 'Professional', 'World Class', 'Legendary', 'Ultimate']) {
    const inTier = tiered.filter(p => p.difficulty_tier === tier);
    const samples = inTier.slice(0, 5).map(p => `${p.name} (${p.fame_score})`);
    console.log(`  ${tier}: ${samples.join(', ')}`);
  }

  // Write output
  const output = tiered.map(p => ({
    global_id: p.global_id,
    name: p.name,
    fame_score: p.fame_score,
    difficulty_tier: p.difficulty_tier,
    is_modern: p.is_modern,
    metrics: {
      wikipedia_pageviews: p.wikipedia_pageviews,
      peak_game_rating: p.peak_game_rating,
      peak_valuation_euros: p.peak_valuation_euros,
      elite_exposure: p.elite_exposure,
    },
  }));

  const outputPath = path.join(DATA_DIR, 'fame_scores.json');
  fs.writeFileSync(outputPath, JSON.stringify(output));
  console.log(`\nWritten to ${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

main();
