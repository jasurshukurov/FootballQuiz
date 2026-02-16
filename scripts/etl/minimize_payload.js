#!/usr/bin/env node
/**
 * minimize_payload.js — Compresses daily puzzle JSON to under 50kb.
 *
 * Usage: node minimize_payload.js [--date YYYY-MM-DD]
 * Default date: today (use --date 2026-02-16 for testing)
 */

const fs = require('fs');
const path = require('path');
const { KEY_COMPRESSION_MAP } = require('./game_mode_router');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let dateArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--date' && args[i + 1]) {
    dateArg = args[i + 1];
    break;
  }
}
const puzzleDate = dateArg || new Date().toISOString().slice(0, 10);

const inputPath = path.resolve(__dirname, `../../data/daily_puzzles/${puzzleDate}.json`);
const outputPath = path.resolve(__dirname, `../../data/daily_puzzles/${puzzleDate}.min.json`);

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Lookup maps
// ---------------------------------------------------------------------------
const NATIONALITY_MAP = {
  'Argentina': 'AR', 'Brazil': 'BR', 'Germany': 'DE', 'France': 'FR',
  'England': 'EN', 'Spain': 'ES', 'Italy': 'IT', 'Portugal': 'PT',
  'Netherlands': 'NL', 'Belgium': 'BE', 'Croatia': 'HR', 'Uruguay': 'UY',
  'Colombia': 'CO', 'Mexico': 'MX', 'United States': 'US', 'Japan': 'JP',
  'Korea, South': 'KR', 'Cameroon': 'CM', 'Senegal': 'SN', 'Ghana': 'GH',
  'Nigeria': 'NG', 'Egypt': 'EG', 'Morocco': 'MA', 'Algeria': 'DZ',
  'Tunisia': 'TN', 'Cote d\'Ivoire': 'CI', 'DR Congo': 'CD',
  'Poland': 'PL_N', 'Austria': 'AT', 'Switzerland': 'CH', 'Serbia': 'RS',
  'Romania': 'RO', 'Czech Republic': 'CZ', 'Denmark': 'DK', 'Sweden': 'SE',
  'Norway': 'NO', 'Finland': 'FI', 'Ireland': 'IE', 'Scotland': 'SC',
  'Wales': 'WL', 'Turkey': 'TR_N', 'Greece': 'GR', 'Ukraine': 'UA',
  'Russia': 'RU', 'Chile': 'CL', 'Peru': 'PE', 'Paraguay': 'PY',
  'Ecuador': 'EC', 'Venezuela': 'VE', 'Bolivia': 'BO',
  'Australia': 'AU', 'New Zealand': 'NZ', 'China': 'CN',
  'Georgia': 'GE', 'Albania': 'AL', 'Bosnia-Herzegovina': 'BA',
  'North Macedonia': 'MK', 'Montenegro': 'ME', 'Slovenia': 'SI',
  'Slovakia': 'SK', 'Hungary': 'HU', 'Bulgaria': 'BG',
  'Lithuania': 'LT', 'Angola': 'AO', 'Gabon': 'GA',
  'Mali': 'ML', 'Burkina Faso': 'BF', 'Guinea': 'GN',
  'Congo': 'CG', 'Zambia': 'ZM', 'Zimbabwe': 'ZW',
  'South Africa': 'ZA', 'Jamaica': 'JM', 'Costa Rica': 'CR_N',
  'Honduras': 'HN', 'Panama': 'PA', 'Canada': 'CA',
  'Iceland': 'IS', 'Northern Ireland': 'NI',
};

const LEAGUE_MAP = {
  'Premier League': 'PL',
  'La Liga': 'LL',
  'Bundesliga': 'BL',
  'Serie A': 'SA',
  'Ligue 1': 'L1',
};

const POSITION_MAP = {
  'Goalkeeper': 'GK',
  'Defender': 'DF',
  'Midfielder': 'MF',
  'Forward': 'FW',
};

// Reverse maps for the lookup table in output
const NATIONALITY_REVERSE = {};
for (const [full, code] of Object.entries(NATIONALITY_MAP)) {
  NATIONALITY_REVERSE[code] = full;
}
const LEAGUE_REVERSE = {};
for (const [full, code] of Object.entries(LEAGUE_MAP)) {
  LEAGUE_REVERSE[code] = full;
}
const POSITION_REVERSE = {};
for (const [full, code] of Object.entries(POSITION_MAP)) {
  POSITION_REVERSE[code] = full;
}

// Key reverse map (short -> long) for the _keys lookup
const KEY_REVERSE = {};
for (const [long, short] of Object.entries(KEY_COMPRESSION_MAP)) {
  KEY_REVERSE[short] = long;
}

// ---------------------------------------------------------------------------
// Compression helpers
// ---------------------------------------------------------------------------

/** Convert market value number to compact string */
function compressMarketValue(val) {
  if (val == null || val === 0) return undefined;
  if (typeof val === 'string') return val; // already formatted like "€3.5m"
  if (val >= 1000000) {
    const m = val / 1000000;
    return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '')) + 'M';
  }
  if (val >= 1000) {
    const k = val / 1000;
    return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '')) + 'K';
  }
  return String(val);
}

/** Strip null, undefined, empty string, and 0 values from an object */
function stripEmpty(obj) {
  if (Array.isArray(obj)) return obj.map(stripEmpty);
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleaned = stripEmpty(v);
      if (cleaned !== null && cleaned !== undefined && cleaned !== '' && cleaned !== 0) {
        result[k] = cleaned;
      }
    }
    return result;
  }
  return obj;
}

/** Find the common image URL prefix */
function findImageBase(data) {
  const urls = [];
  JSON.stringify(data, (key, val) => {
    if ((key === 'img' || key === 'image_url') && typeof val === 'string' && val.startsWith('http')) {
      urls.push(val);
    }
    return val;
  });
  if (urls.length === 0) return null;
  // Find the common transfermarkt prefix
  const tmPrefix = 'https://img.a.transfermarkt.technology/portrait/header/';
  const count = urls.filter(u => u.startsWith(tmPrefix)).length;
  if (count > urls.length * 0.5) return tmPrefix;
  return null;
}

/** Replace image URLs with relative paths given a base prefix */
function deduplicateImages(obj, base) {
  if (!base) return obj;
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(item => deduplicateImages(item, base));
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if ((k === 'img' || k === 'image_url') && typeof v === 'string' && v.startsWith(base)) {
        result[k] = v.slice(base.length);
      } else {
        result[k] = deduplicateImages(v, base);
      }
    }
    return result;
  }
  return obj;
}

/** Compress nationality values */
function compressNationalities(obj) {
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(compressNationalities);
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'nat' && typeof v === 'string' && NATIONALITY_MAP[v]) {
        result[k] = NATIONALITY_MAP[v];
      } else {
        result[k] = compressNationalities(v);
      }
    }
    return result;
  }
  return obj;
}

/** Compress league values */
function compressLeagues(obj) {
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(compressLeagues);
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'league' && typeof v === 'string' && LEAGUE_MAP[v]) {
        result[k] = LEAGUE_MAP[v];
      } else if (k === 'comp' && typeof v === 'string' && LEAGUE_MAP[v]) {
        result[k] = LEAGUE_MAP[v];
      } else {
        result[k] = compressLeagues(v);
      }
    }
    return result;
  }
  return obj;
}

/** Compress position values */
function compressPositions(obj) {
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(compressPositions);
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'pos' && typeof v === 'string' && POSITION_MAP[v]) {
        result[k] = POSITION_MAP[v];
      } else if (k === 'value' && typeof v === 'string' && POSITION_MAP[v]) {
        // grid cols have {type: "position", value: "Midfielder"}
        result[k] = POSITION_MAP[v];
      } else {
        result[k] = compressPositions(v);
      }
    }
    return result;
  }
  return obj;
}

/** Compress market_value / mv fields to compact strings */
function compressMarketValues(obj) {
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(compressMarketValues);
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'mv' && typeof v === 'number') {
        const compressed = compressMarketValue(v);
        if (compressed !== undefined) result[k] = compressed;
      } else {
        result[k] = compressMarketValues(v);
      }
    }
    return result;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const raw = fs.readFileSync(inputPath, 'utf8');
const originalSize = Buffer.byteLength(raw, 'utf8');
let puzzle = JSON.parse(raw);

// 1. Strip empty/null values
puzzle = stripEmpty(puzzle);

// 2. Find image base and deduplicate
const imgBase = findImageBase(puzzle);
if (imgBase) {
  puzzle = deduplicateImages(puzzle, imgBase);
}

// 3. Compress nationalities, leagues, positions, market values
puzzle = compressNationalities(puzzle);
puzzle = compressLeagues(puzzle);
puzzle = compressPositions(puzzle);
puzzle = compressMarketValues(puzzle);

// 4. Build used-lookup subsets (only codes actually present in data)
const usedNat = {};
const usedLg = {};
const usedPos = {};
const serialized = JSON.stringify(puzzle);

for (const [full, code] of Object.entries(NATIONALITY_MAP)) {
  // Check if the code appears as a value in nat fields
  if (serialized.includes(`"nat":"${code}"`)) {
    usedNat[code] = full;
  }
}
for (const [full, code] of Object.entries(LEAGUE_MAP)) {
  if (serialized.includes(`"${code}"`)) {
    usedLg[code] = full;
  }
}
for (const [full, code] of Object.entries(POSITION_MAP)) {
  if (serialized.includes(`"${code}"`)) {
    usedPos[code] = full;
  }
}

// 5. Build output
const output = {
  _v: 1,
  _keys: KEY_REVERSE,
  _nat: usedNat,
  _lg: usedLg,
  _pos: usedPos,
};
if (imgBase) output._imgBase = imgBase;

output.date = puzzle.date;
output.seed = puzzle.seed;

// Package all modes
const modes = {};
for (const key of Object.keys(puzzle)) {
  if (['date', 'seed'].includes(key)) continue;
  modes[key] = puzzle[key];
}
output.modes = modes;

// 6. Serialize (no pretty-printing for size)
const compressed = JSON.stringify(output);
const compressedSize = Buffer.byteLength(compressed, 'utf8');
const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

// 7. Write output
fs.writeFileSync(outputPath, compressed, 'utf8');

// 8. Report
console.log(`=== Payload Minimizer ===`);
console.log(`Date:             ${puzzleDate}`);
console.log(`Input:            ${inputPath}`);
console.log(`Output:           ${outputPath}`);
console.log(`Original size:    ${(originalSize / 1024).toFixed(1)} KB (${originalSize} bytes)`);
console.log(`Compressed size:  ${(compressedSize / 1024).toFixed(1)} KB (${compressedSize} bytes)`);
console.log(`Compression:      ${ratio}%`);

if (compressedSize > 50 * 1024) {
  console.error(`FAIL: Compressed size exceeds 50 KB limit!`);
  process.exit(1);
} else {
  console.log(`PASS: Under 50 KB limit.`);
}

// 9. Validate JSON roundtrip
try {
  JSON.parse(compressed);
  console.log(`Validation:       Valid JSON`);
} catch (e) {
  console.error(`FAIL: Output is not valid JSON: ${e.message}`);
  process.exit(1);
}

// 10. Verify all mode keys preserved
const modeKeys = Object.keys(modes);
console.log(`Modes preserved:  ${modeKeys.join(', ')}`);
