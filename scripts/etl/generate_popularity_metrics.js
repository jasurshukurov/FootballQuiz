/**
 * generate_popularity_metrics.js
 *
 * Reads data/master_db.json and produces data/popularity_metrics.json
 * with four popularity signals per player:
 *   - wikipedia_pageviews
 *   - peak_game_rating
 *   - peak_valuation_euros
 *   - elite_exposure
 */

const fs = require('fs');
const path = require('path');

// ───────────────────────────────────────────────────────────
// KNOWN PLAYERS — hand-tuned metrics for ~200+ famous players
// ───────────────────────────────────────────────────────────

const KNOWN_PLAYERS = {
  // ── All-time greats ──
  'cristiano ronaldo': { wikipedia_pageviews: 3200000, peak_game_rating: 99, peak_valuation_euros: 200000000, elite_exposure: 230 },
  'lionel messi': { wikipedia_pageviews: 2800000, peak_game_rating: 99, peak_valuation_euros: 180000000, elite_exposure: 220 },
  'diego maradona': { wikipedia_pageviews: 800000, peak_game_rating: 97, peak_valuation_euros: 50000000, elite_exposure: 100 },
  'pele': { wikipedia_pageviews: 700000, peak_game_rating: 98, peak_valuation_euros: 30000000, elite_exposure: 120 },
  'zinedine zidane': { wikipedia_pageviews: 600000, peak_game_rating: 96, peak_valuation_euros: 75000000, elite_exposure: 150 },
  'ronaldinho': { wikipedia_pageviews: 550000, peak_game_rating: 94, peak_valuation_euros: 45000000, elite_exposure: 130 },
  'ronaldo': { wikipedia_pageviews: 500000, peak_game_rating: 96, peak_valuation_euros: 50000000, elite_exposure: 120 },
  'ronaldo nazario': { wikipedia_pageviews: 500000, peak_game_rating: 96, peak_valuation_euros: 50000000, elite_exposure: 120 },
  'johan cruyff': { wikipedia_pageviews: 400000, peak_game_rating: 95, peak_valuation_euros: 25000000, elite_exposure: 90 },
  'franz beckenbauer': { wikipedia_pageviews: 350000, peak_game_rating: 95, peak_valuation_euros: 20000000, elite_exposure: 100 },
  'michel platini': { wikipedia_pageviews: 280000, peak_game_rating: 94, peak_valuation_euros: 20000000, elite_exposure: 85 },
  'george best': { wikipedia_pageviews: 250000, peak_game_rating: 93, peak_valuation_euros: 15000000, elite_exposure: 40 },
  'alfredo di stefano': { wikipedia_pageviews: 200000, peak_game_rating: 95, peak_valuation_euros: 15000000, elite_exposure: 80 },
  'eusebio': { wikipedia_pageviews: 180000, peak_game_rating: 93, peak_valuation_euros: 12000000, elite_exposure: 60 },
  'bobby charlton': { wikipedia_pageviews: 180000, peak_game_rating: 92, peak_valuation_euros: 12000000, elite_exposure: 70 },
  'lev yashin': { wikipedia_pageviews: 160000, peak_game_rating: 94, peak_valuation_euros: 10000000, elite_exposure: 55 },
  'gerd muller': { wikipedia_pageviews: 200000, peak_game_rating: 94, peak_valuation_euros: 15000000, elite_exposure: 75 },
  'marco van basten': { wikipedia_pageviews: 220000, peak_game_rating: 95, peak_valuation_euros: 20000000, elite_exposure: 65 },
  'paolo maldini': { wikipedia_pageviews: 300000, peak_game_rating: 95, peak_valuation_euros: 35000000, elite_exposure: 170 },
  'franco baresi': { wikipedia_pageviews: 180000, peak_game_rating: 93, peak_valuation_euros: 18000000, elite_exposure: 100 },
  'roberto baggio': { wikipedia_pageviews: 250000, peak_game_rating: 93, peak_valuation_euros: 25000000, elite_exposure: 70 },

  // ── Modern superstars ──
  'neymar': { wikipedia_pageviews: 1500000, peak_game_rating: 92, peak_valuation_euros: 222000000, elite_exposure: 120 },
  'kylian mbappe': { wikipedia_pageviews: 1200000, peak_game_rating: 93, peak_valuation_euros: 180000000, elite_exposure: 80 },
  'erling haaland': { wikipedia_pageviews: 900000, peak_game_rating: 91, peak_valuation_euros: 180000000, elite_exposure: 50 },
  'mohamed salah': { wikipedia_pageviews: 700000, peak_game_rating: 90, peak_valuation_euros: 120000000, elite_exposure: 100 },
  'kevin de bruyne': { wikipedia_pageviews: 600000, peak_game_rating: 92, peak_valuation_euros: 110000000, elite_exposure: 110 },
  'robert lewandowski': { wikipedia_pageviews: 650000, peak_game_rating: 92, peak_valuation_euros: 100000000, elite_exposure: 140 },
  'luka modric': { wikipedia_pageviews: 500000, peak_game_rating: 92, peak_valuation_euros: 80000000, elite_exposure: 160 },
  'toni kroos': { wikipedia_pageviews: 450000, peak_game_rating: 90, peak_valuation_euros: 80000000, elite_exposure: 155 },
  'virgil van dijk': { wikipedia_pageviews: 400000, peak_game_rating: 90, peak_valuation_euros: 85000000, elite_exposure: 80 },
  'karim benzema': { wikipedia_pageviews: 500000, peak_game_rating: 91, peak_valuation_euros: 90000000, elite_exposure: 155 },
  'sadio mane': { wikipedia_pageviews: 400000, peak_game_rating: 89, peak_valuation_euros: 80000000, elite_exposure: 95 },
  'harry kane': { wikipedia_pageviews: 500000, peak_game_rating: 91, peak_valuation_euros: 120000000, elite_exposure: 75 },
  'vinicius junior': { wikipedia_pageviews: 600000, peak_game_rating: 90, peak_valuation_euros: 150000000, elite_exposure: 65 },
  'vinicius jr': { wikipedia_pageviews: 600000, peak_game_rating: 90, peak_valuation_euros: 150000000, elite_exposure: 65 },
  'jude bellingham': { wikipedia_pageviews: 550000, peak_game_rating: 89, peak_valuation_euros: 120000000, elite_exposure: 50 },
  'bukayo saka': { wikipedia_pageviews: 400000, peak_game_rating: 87, peak_valuation_euros: 100000000, elite_exposure: 45 },
  'pedri': { wikipedia_pageviews: 350000, peak_game_rating: 87, peak_valuation_euros: 80000000, elite_exposure: 45 },
  'phil foden': { wikipedia_pageviews: 350000, peak_game_rating: 88, peak_valuation_euros: 100000000, elite_exposure: 55 },
  'florian wirtz': { wikipedia_pageviews: 300000, peak_game_rating: 86, peak_valuation_euros: 100000000, elite_exposure: 30 },
  'jamal musiala': { wikipedia_pageviews: 320000, peak_game_rating: 86, peak_valuation_euros: 100000000, elite_exposure: 35 },
  'bruno fernandes': { wikipedia_pageviews: 400000, peak_game_rating: 88, peak_valuation_euros: 85000000, elite_exposure: 70 },
  'bernardo silva': { wikipedia_pageviews: 300000, peak_game_rating: 88, peak_valuation_euros: 80000000, elite_exposure: 95 },
  'martin odegaard': { wikipedia_pageviews: 300000, peak_game_rating: 87, peak_valuation_euros: 80000000, elite_exposure: 35 },
  'declan rice': { wikipedia_pageviews: 250000, peak_game_rating: 86, peak_valuation_euros: 105000000, elite_exposure: 40 },

  // ── 2000s–2010s generation ──
  'wayne rooney': { wikipedia_pageviews: 500000, peak_game_rating: 92, peak_valuation_euros: 80000000, elite_exposure: 130 },
  'thierry henry': { wikipedia_pageviews: 450000, peak_game_rating: 93, peak_valuation_euros: 50000000, elite_exposure: 120 },
  'david beckham': { wikipedia_pageviews: 700000, peak_game_rating: 89, peak_valuation_euros: 45000000, elite_exposure: 120 },
  'andrea pirlo': { wikipedia_pageviews: 350000, peak_game_rating: 90, peak_valuation_euros: 30000000, elite_exposure: 155 },
  'xavi': { wikipedia_pageviews: 350000, peak_game_rating: 92, peak_valuation_euros: 60000000, elite_exposure: 180 },
  'xavi hernandez': { wikipedia_pageviews: 350000, peak_game_rating: 92, peak_valuation_euros: 60000000, elite_exposure: 180 },
  'andres iniesta': { wikipedia_pageviews: 400000, peak_game_rating: 93, peak_valuation_euros: 65000000, elite_exposure: 170 },
  'steven gerrard': { wikipedia_pageviews: 400000, peak_game_rating: 89, peak_valuation_euros: 50000000, elite_exposure: 130 },
  'frank lampard': { wikipedia_pageviews: 350000, peak_game_rating: 88, peak_valuation_euros: 45000000, elite_exposure: 120 },
  'zlatan ibrahimovic': { wikipedia_pageviews: 600000, peak_game_rating: 92, peak_valuation_euros: 70000000, elite_exposure: 120 },
  'gianluigi buffon': { wikipedia_pageviews: 400000, peak_game_rating: 92, peak_valuation_euros: 55000000, elite_exposure: 190 },
  'iker casillas': { wikipedia_pageviews: 350000, peak_game_rating: 92, peak_valuation_euros: 40000000, elite_exposure: 185 },
  'manuel neuer': { wikipedia_pageviews: 400000, peak_game_rating: 93, peak_valuation_euros: 55000000, elite_exposure: 155 },
  'sergio ramos': { wikipedia_pageviews: 500000, peak_game_rating: 91, peak_valuation_euros: 70000000, elite_exposure: 185 },
  'carles puyol': { wikipedia_pageviews: 250000, peak_game_rating: 89, peak_valuation_euros: 35000000, elite_exposure: 130 },
  'john terry': { wikipedia_pageviews: 250000, peak_game_rating: 88, peak_valuation_euros: 30000000, elite_exposure: 115 },
  'rio ferdinand': { wikipedia_pageviews: 250000, peak_game_rating: 88, peak_valuation_euros: 45000000, elite_exposure: 110 },
  'patrick vieira': { wikipedia_pageviews: 200000, peak_game_rating: 88, peak_valuation_euros: 30000000, elite_exposure: 115 },
  'didier drogba': { wikipedia_pageviews: 350000, peak_game_rating: 89, peak_valuation_euros: 40000000, elite_exposure: 110 },
  'samuel etoo': { wikipedia_pageviews: 300000, peak_game_rating: 90, peak_valuation_euros: 38000000, elite_exposure: 120 },
  "samuel eto'o": { wikipedia_pageviews: 300000, peak_game_rating: 90, peak_valuation_euros: 38000000, elite_exposure: 120 },
  'david villa': { wikipedia_pageviews: 250000, peak_game_rating: 89, peak_valuation_euros: 40000000, elite_exposure: 110 },
  'fernando torres': { wikipedia_pageviews: 350000, peak_game_rating: 90, peak_valuation_euros: 58000000, elite_exposure: 120 },
  'luis suarez': { wikipedia_pageviews: 450000, peak_game_rating: 92, peak_valuation_euros: 82000000, elite_exposure: 125 },
  'eden hazard': { wikipedia_pageviews: 400000, peak_game_rating: 91, peak_valuation_euros: 100000000, elite_exposure: 100 },
  'gareth bale': { wikipedia_pageviews: 400000, peak_game_rating: 90, peak_valuation_euros: 101000000, elite_exposure: 95 },
  'paul pogba': { wikipedia_pageviews: 450000, peak_game_rating: 88, peak_valuation_euros: 105000000, elite_exposure: 90 },
  'antoine griezmann': { wikipedia_pageviews: 400000, peak_game_rating: 89, peak_valuation_euros: 80000000, elite_exposure: 110 },
  'thibaut courtois': { wikipedia_pageviews: 300000, peak_game_rating: 91, peak_valuation_euros: 65000000, elite_exposure: 95 },
  'jan oblak': { wikipedia_pageviews: 200000, peak_game_rating: 91, peak_valuation_euros: 80000000, elite_exposure: 75 },
  'marc-andre ter stegen': { wikipedia_pageviews: 250000, peak_game_rating: 90, peak_valuation_euros: 75000000, elite_exposure: 80 },
  'alisson': { wikipedia_pageviews: 250000, peak_game_rating: 89, peak_valuation_euros: 72500000, elite_exposure: 80 },
  'alisson becker': { wikipedia_pageviews: 250000, peak_game_rating: 89, peak_valuation_euros: 72500000, elite_exposure: 80 },
  'ederson': { wikipedia_pageviews: 200000, peak_game_rating: 88, peak_valuation_euros: 60000000, elite_exposure: 75 },

  // ── Defenders / Midfielders ──
  'marcelo': { wikipedia_pageviews: 300000, peak_game_rating: 89, peak_valuation_euros: 55000000, elite_exposure: 150 },
  'dani alves': { wikipedia_pageviews: 300000, peak_game_rating: 89, peak_valuation_euros: 40000000, elite_exposure: 170 },
  'philipp lahm': { wikipedia_pageviews: 250000, peak_game_rating: 90, peak_valuation_euros: 35000000, elite_exposure: 155 },
  'ashley cole': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 25000000, elite_exposure: 120 },
  'nemanja vidic': { wikipedia_pageviews: 200000, peak_game_rating: 88, peak_valuation_euros: 30000000, elite_exposure: 100 },
  'gerard pique': { wikipedia_pageviews: 350000, peak_game_rating: 89, peak_valuation_euros: 50000000, elite_exposure: 140 },
  'thiago silva': { wikipedia_pageviews: 250000, peak_game_rating: 89, peak_valuation_euros: 50000000, elite_exposure: 135 },
  'raphael varane': { wikipedia_pageviews: 250000, peak_game_rating: 88, peak_valuation_euros: 70000000, elite_exposure: 110 },
  'jordi alba': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 40000000, elite_exposure: 120 },
  'joshua kimmich': { wikipedia_pageviews: 300000, peak_game_rating: 89, peak_valuation_euros: 90000000, elite_exposure: 85 },
  'trent alexander-arnold': { wikipedia_pageviews: 300000, peak_game_rating: 87, peak_valuation_euros: 80000000, elite_exposure: 65 },
  'andrew robertson': { wikipedia_pageviews: 180000, peak_game_rating: 87, peak_valuation_euros: 55000000, elite_exposure: 65 },
  'ruben dias': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 75000000, elite_exposure: 55 },
  'william saliba': { wikipedia_pageviews: 180000, peak_game_rating: 85, peak_valuation_euros: 70000000, elite_exposure: 35 },
  'ronald araujo': { wikipedia_pageviews: 150000, peak_game_rating: 85, peak_valuation_euros: 60000000, elite_exposure: 35 },

  // ── More midfielders ──
  'ngolo kante': { wikipedia_pageviews: 350000, peak_game_rating: 90, peak_valuation_euros: 70000000, elite_exposure: 85 },
  'casemiro': { wikipedia_pageviews: 250000, peak_game_rating: 89, peak_valuation_euros: 70000000, elite_exposure: 140 },
  'sergio busquets': { wikipedia_pageviews: 250000, peak_game_rating: 89, peak_valuation_euros: 60000000, elite_exposure: 170 },
  'mesut ozil': { wikipedia_pageviews: 400000, peak_game_rating: 89, peak_valuation_euros: 50000000, elite_exposure: 110 },
  'james rodriguez': { wikipedia_pageviews: 350000, peak_game_rating: 87, peak_valuation_euros: 75000000, elite_exposure: 80 },
  'christian eriksen': { wikipedia_pageviews: 300000, peak_game_rating: 87, peak_valuation_euros: 50000000, elite_exposure: 80 },
  'marco reus': { wikipedia_pageviews: 280000, peak_game_rating: 88, peak_valuation_euros: 50000000, elite_exposure: 55 },
  'thomas muller': { wikipedia_pageviews: 350000, peak_game_rating: 88, peak_valuation_euros: 65000000, elite_exposure: 155 },
  'david silva': { wikipedia_pageviews: 250000, peak_game_rating: 90, peak_valuation_euros: 50000000, elite_exposure: 120 },
  'cesc fabregas': { wikipedia_pageviews: 250000, peak_game_rating: 87, peak_valuation_euros: 40000000, elite_exposure: 115 },
  'michael ballack': { wikipedia_pageviews: 200000, peak_game_rating: 88, peak_valuation_euros: 30000000, elite_exposure: 120 },
  'bastian schweinsteiger': { wikipedia_pageviews: 220000, peak_game_rating: 88, peak_valuation_euros: 35000000, elite_exposure: 140 },
  'arjen robben': { wikipedia_pageviews: 250000, peak_game_rating: 90, peak_valuation_euros: 40000000, elite_exposure: 120 },
  'franck ribery': { wikipedia_pageviews: 250000, peak_game_rating: 90, peak_valuation_euros: 45000000, elite_exposure: 130 },
  'kaka': { wikipedia_pageviews: 400000, peak_game_rating: 92, peak_valuation_euros: 65000000, elite_exposure: 110 },
  'michael owen': { wikipedia_pageviews: 200000, peak_game_rating: 89, peak_valuation_euros: 25000000, elite_exposure: 80 },
  'alan shearer': { wikipedia_pageviews: 200000, peak_game_rating: 90, peak_valuation_euros: 20000000, elite_exposure: 70 },

  // ── Strikers modern era ──
  'romelu lukaku': { wikipedia_pageviews: 300000, peak_game_rating: 86, peak_valuation_euros: 80000000, elite_exposure: 80 },
  'raheem sterling': { wikipedia_pageviews: 280000, peak_game_rating: 87, peak_valuation_euros: 70000000, elite_exposure: 80 },
  'son heung-min': { wikipedia_pageviews: 500000, peak_game_rating: 89, peak_valuation_euros: 90000000, elite_exposure: 55 },
  'heung-min son': { wikipedia_pageviews: 500000, peak_game_rating: 89, peak_valuation_euros: 90000000, elite_exposure: 55 },
  'marcus rashford': { wikipedia_pageviews: 350000, peak_game_rating: 85, peak_valuation_euros: 85000000, elite_exposure: 60 },
  'lautaro martinez': { wikipedia_pageviews: 250000, peak_game_rating: 87, peak_valuation_euros: 90000000, elite_exposure: 70 },
  'rafael leao': { wikipedia_pageviews: 200000, peak_game_rating: 86, peak_valuation_euros: 80000000, elite_exposure: 45 },
  'victor osimhen': { wikipedia_pageviews: 200000, peak_game_rating: 86, peak_valuation_euros: 100000000, elite_exposure: 40 },
  'darwin nunez': { wikipedia_pageviews: 200000, peak_game_rating: 84, peak_valuation_euros: 75000000, elite_exposure: 40 },
  'julian alvarez': { wikipedia_pageviews: 200000, peak_game_rating: 85, peak_valuation_euros: 70000000, elite_exposure: 45 },
  'alexander isak': { wikipedia_pageviews: 180000, peak_game_rating: 84, peak_valuation_euros: 65000000, elite_exposure: 30 },
  'ollie watkins': { wikipedia_pageviews: 120000, peak_game_rating: 82, peak_valuation_euros: 50000000, elite_exposure: 20 },
  'kai havertz': { wikipedia_pageviews: 250000, peak_game_rating: 84, peak_valuation_euros: 80000000, elite_exposure: 55 },
  'cole palmer': { wikipedia_pageviews: 300000, peak_game_rating: 84, peak_valuation_euros: 70000000, elite_exposure: 30 },

  // ── Italian legends / Serie A ──
  'alessandro del piero': { wikipedia_pageviews: 280000, peak_game_rating: 92, peak_valuation_euros: 35000000, elite_exposure: 160 },
  'francesco totti': { wikipedia_pageviews: 300000, peak_game_rating: 91, peak_valuation_euros: 30000000, elite_exposure: 90 },
  'fabio cannavaro': { wikipedia_pageviews: 200000, peak_game_rating: 92, peak_valuation_euros: 25000000, elite_exposure: 130 },
  'gianfranco zola': { wikipedia_pageviews: 150000, peak_game_rating: 87, peak_valuation_euros: 12000000, elite_exposure: 70 },
  'alessandro nesta': { wikipedia_pageviews: 180000, peak_game_rating: 92, peak_valuation_euros: 30000000, elite_exposure: 130 },

  // ── Brazilian legends ──
  'rivaldo': { wikipedia_pageviews: 200000, peak_game_rating: 91, peak_valuation_euros: 30000000, elite_exposure: 100 },
  'roberto carlos': { wikipedia_pageviews: 350000, peak_game_rating: 91, peak_valuation_euros: 28000000, elite_exposure: 145 },
  'cafu': { wikipedia_pageviews: 200000, peak_game_rating: 90, peak_valuation_euros: 20000000, elite_exposure: 140 },
  'romario': { wikipedia_pageviews: 200000, peak_game_rating: 93, peak_valuation_euros: 25000000, elite_exposure: 80 },
  'garrincha': { wikipedia_pageviews: 150000, peak_game_rating: 92, peak_valuation_euros: 10000000, elite_exposure: 50 },
  'socrates': { wikipedia_pageviews: 120000, peak_game_rating: 88, peak_valuation_euros: 8000000, elite_exposure: 45 },
  'zico': { wikipedia_pageviews: 150000, peak_game_rating: 93, peak_valuation_euros: 10000000, elite_exposure: 50 },

  // ── French legends ──
  'eric cantona': { wikipedia_pageviews: 300000, peak_game_rating: 90, peak_valuation_euros: 15000000, elite_exposure: 50 },
  'raymond kopa': { wikipedia_pageviews: 80000, peak_game_rating: 90, peak_valuation_euros: 8000000, elite_exposure: 55 },
  'just fontaine': { wikipedia_pageviews: 70000, peak_game_rating: 89, peak_valuation_euros: 6000000, elite_exposure: 30 },
  'lilian thuram': { wikipedia_pageviews: 150000, peak_game_rating: 88, peak_valuation_euros: 20000000, elite_exposure: 120 },
  'marcel desailly': { wikipedia_pageviews: 120000, peak_game_rating: 88, peak_valuation_euros: 18000000, elite_exposure: 110 },
  'robert pires': { wikipedia_pageviews: 120000, peak_game_rating: 87, peak_valuation_euros: 20000000, elite_exposure: 90 },
  'olivier giroud': { wikipedia_pageviews: 250000, peak_game_rating: 84, peak_valuation_euros: 30000000, elite_exposure: 110 },
  'ousmane dembele': { wikipedia_pageviews: 300000, peak_game_rating: 85, peak_valuation_euros: 140000000, elite_exposure: 65 },

  // ── English legends / PL icons ──
  'bobby moore': { wikipedia_pageviews: 150000, peak_game_rating: 92, peak_valuation_euros: 10000000, elite_exposure: 50 },
  'gordon banks': { wikipedia_pageviews: 100000, peak_game_rating: 91, peak_valuation_euros: 8000000, elite_exposure: 40 },
  'gary lineker': { wikipedia_pageviews: 200000, peak_game_rating: 88, peak_valuation_euros: 12000000, elite_exposure: 60 },
  'paul scholes': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 25000000, elite_exposure: 130 },
  'ryan giggs': { wikipedia_pageviews: 250000, peak_game_rating: 89, peak_valuation_euros: 20000000, elite_exposure: 145 },
  'david seaman': { wikipedia_pageviews: 100000, peak_game_rating: 86, peak_valuation_euros: 8000000, elite_exposure: 60 },
  'peter schmeichel': { wikipedia_pageviews: 150000, peak_game_rating: 90, peak_valuation_euros: 10000000, elite_exposure: 80 },
  'dennis bergkamp': { wikipedia_pageviews: 200000, peak_game_rating: 90, peak_valuation_euros: 15000000, elite_exposure: 90 },
  'roy keane': { wikipedia_pageviews: 200000, peak_game_rating: 88, peak_valuation_euros: 15000000, elite_exposure: 100 },
  'jamie vardy': { wikipedia_pageviews: 250000, peak_game_rating: 83, peak_valuation_euros: 25000000, elite_exposure: 35 },

  // ── German legends ──
  'lothar matthaus': { wikipedia_pageviews: 180000, peak_game_rating: 93, peak_valuation_euros: 15000000, elite_exposure: 110 },
  'oliver kahn': { wikipedia_pageviews: 200000, peak_game_rating: 91, peak_valuation_euros: 20000000, elite_exposure: 100 },
  'jurgen klinsmann': { wikipedia_pageviews: 150000, peak_game_rating: 89, peak_valuation_euros: 12000000, elite_exposure: 85 },
  'karl-heinz rummenigge': { wikipedia_pageviews: 120000, peak_game_rating: 90, peak_valuation_euros: 10000000, elite_exposure: 75 },
  'miroslav klose': { wikipedia_pageviews: 200000, peak_game_rating: 85, peak_valuation_euros: 18000000, elite_exposure: 130 },

  // ── Argentine legends ──
  'gabriel batistuta': { wikipedia_pageviews: 180000, peak_game_rating: 91, peak_valuation_euros: 25000000, elite_exposure: 75 },
  'javier zanetti': { wikipedia_pageviews: 180000, peak_game_rating: 87, peak_valuation_euros: 18000000, elite_exposure: 145 },
  'juan roman riquelme': { wikipedia_pageviews: 150000, peak_game_rating: 89, peak_valuation_euros: 20000000, elite_exposure: 70 },
  'hernan crespo': { wikipedia_pageviews: 120000, peak_game_rating: 88, peak_valuation_euros: 30000000, elite_exposure: 95 },
  'javier mascherano': { wikipedia_pageviews: 150000, peak_game_rating: 86, peak_valuation_euros: 28000000, elite_exposure: 120 },
  'angel di maria': { wikipedia_pageviews: 300000, peak_game_rating: 87, peak_valuation_euros: 75000000, elite_exposure: 130 },
  'sergio aguero': { wikipedia_pageviews: 400000, peak_game_rating: 92, peak_valuation_euros: 80000000, elite_exposure: 115 },
  'gonzalo higuain': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 90000000, elite_exposure: 95 },
  'paulo dybala': { wikipedia_pageviews: 250000, peak_game_rating: 87, peak_valuation_euros: 70000000, elite_exposure: 65 },

  // ── Dutch legends ──
  'dennis bergkamp': { wikipedia_pageviews: 200000, peak_game_rating: 90, peak_valuation_euros: 15000000, elite_exposure: 90 },
  'ruud gullit': { wikipedia_pageviews: 150000, peak_game_rating: 92, peak_valuation_euros: 15000000, elite_exposure: 70 },
  'frank rijkaard': { wikipedia_pageviews: 120000, peak_game_rating: 90, peak_valuation_euros: 12000000, elite_exposure: 80 },
  'ruud van nistelrooy': { wikipedia_pageviews: 180000, peak_game_rating: 90, peak_valuation_euros: 30000000, elite_exposure: 100 },
  'arjen robben': { wikipedia_pageviews: 250000, peak_game_rating: 90, peak_valuation_euros: 40000000, elite_exposure: 120 },
  'wesley sneijder': { wikipedia_pageviews: 180000, peak_game_rating: 88, peak_valuation_euros: 30000000, elite_exposure: 105 },
  'robin van persie': { wikipedia_pageviews: 250000, peak_game_rating: 90, peak_valuation_euros: 35000000, elite_exposure: 80 },
  'memphis depay': { wikipedia_pageviews: 200000, peak_game_rating: 83, peak_valuation_euros: 40000000, elite_exposure: 50 },
  'frenkie de jong': { wikipedia_pageviews: 250000, peak_game_rating: 87, peak_valuation_euros: 86000000, elite_exposure: 55 },
  'matthijs de ligt': { wikipedia_pageviews: 200000, peak_game_rating: 85, peak_valuation_euros: 75000000, elite_exposure: 50 },

  // ── Portuguese ──
  'luis figo': { wikipedia_pageviews: 250000, peak_game_rating: 92, peak_valuation_euros: 60000000, elite_exposure: 130 },
  'rui costa': { wikipedia_pageviews: 120000, peak_game_rating: 88, peak_valuation_euros: 20000000, elite_exposure: 90 },
  'deco': { wikipedia_pageviews: 120000, peak_game_rating: 88, peak_valuation_euros: 25000000, elite_exposure: 100 },
  'pepe': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 30000000, elite_exposure: 140 },
  'joao felix': { wikipedia_pageviews: 250000, peak_game_rating: 84, peak_valuation_euros: 127000000, elite_exposure: 40 },
  'bernardo silva': { wikipedia_pageviews: 300000, peak_game_rating: 88, peak_valuation_euros: 80000000, elite_exposure: 95 },
  'diogo jota': { wikipedia_pageviews: 150000, peak_game_rating: 85, peak_valuation_euros: 50000000, elite_exposure: 45 },

  // ── African stars ──
  'george weah': { wikipedia_pageviews: 180000, peak_game_rating: 92, peak_valuation_euros: 15000000, elite_exposure: 50 },
  'roger milla': { wikipedia_pageviews: 100000, peak_game_rating: 85, peak_valuation_euros: 5000000, elite_exposure: 35 },
  'jay-jay okocha': { wikipedia_pageviews: 120000, peak_game_rating: 85, peak_valuation_euros: 10000000, elite_exposure: 45 },
  'michael essien': { wikipedia_pageviews: 120000, peak_game_rating: 86, peak_valuation_euros: 30000000, elite_exposure: 90 },
  'yaya toure': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 35000000, elite_exposure: 95 },
  'riyad mahrez': { wikipedia_pageviews: 200000, peak_game_rating: 86, peak_valuation_euros: 60000000, elite_exposure: 80 },
  'pierre-emerick aubameyang': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 65000000, elite_exposure: 65 },

  // ── South American ──
  'james rodriguez': { wikipedia_pageviews: 350000, peak_game_rating: 87, peak_valuation_euros: 75000000, elite_exposure: 80 },
  'carlos valderrama': { wikipedia_pageviews: 120000, peak_game_rating: 86, peak_valuation_euros: 5000000, elite_exposure: 40 },
  'radamel falcao': { wikipedia_pageviews: 200000, peak_game_rating: 89, peak_valuation_euros: 60000000, elite_exposure: 75 },
  'alexis sanchez': { wikipedia_pageviews: 250000, peak_game_rating: 87, peak_valuation_euros: 50000000, elite_exposure: 85 },
  'arturo vidal': { wikipedia_pageviews: 200000, peak_game_rating: 86, peak_valuation_euros: 40000000, elite_exposure: 100 },

  // ── Asian stars ──
  'park ji-sung': { wikipedia_pageviews: 200000, peak_game_rating: 82, peak_valuation_euros: 15000000, elite_exposure: 85 },
  'hidetoshi nakata': { wikipedia_pageviews: 120000, peak_game_rating: 82, peak_valuation_euros: 18000000, elite_exposure: 40 },
  'shinji kagawa': { wikipedia_pageviews: 120000, peak_game_rating: 82, peak_valuation_euros: 18000000, elite_exposure: 35 },
  'takefusa kubo': { wikipedia_pageviews: 150000, peak_game_rating: 80, peak_valuation_euros: 30000000, elite_exposure: 20 },

  // ── Cult heroes / meme players ──
  'nicklas bendtner': { wikipedia_pageviews: 120000, peak_game_rating: 74, peak_valuation_euros: 8000000, elite_exposure: 25 },
  'adebayo akinfenwa': { wikipedia_pageviews: 80000, peak_game_rating: 62, peak_valuation_euros: 500000, elite_exposure: 0 },
  'dimitar berbatov': { wikipedia_pageviews: 150000, peak_game_rating: 86, peak_valuation_euros: 35000000, elite_exposure: 75 },
  'peter crouch': { wikipedia_pageviews: 150000, peak_game_rating: 78, peak_valuation_euros: 15000000, elite_exposure: 55 },
  'emile heskey': { wikipedia_pageviews: 120000, peak_game_rating: 79, peak_valuation_euros: 15000000, elite_exposure: 55 },
  'djibril cisse': { wikipedia_pageviews: 100000, peak_game_rating: 80, peak_valuation_euros: 20000000, elite_exposure: 45 },
  'mario balotelli': { wikipedia_pageviews: 250000, peak_game_rating: 83, peak_valuation_euros: 30000000, elite_exposure: 50 },
  'rene higuita': { wikipedia_pageviews: 120000, peak_game_rating: 80, peak_valuation_euros: 3000000, elite_exposure: 25 },
  'jorge campos': { wikipedia_pageviews: 80000, peak_game_rating: 78, peak_valuation_euros: 3000000, elite_exposure: 30 },

  // ── Current young stars ──
  'lamine yamal': { wikipedia_pageviews: 600000, peak_game_rating: 82, peak_valuation_euros: 120000000, elite_exposure: 20 },
  'endrick': { wikipedia_pageviews: 200000, peak_game_rating: 78, peak_valuation_euros: 60000000, elite_exposure: 10 },
  'gavi': { wikipedia_pageviews: 300000, peak_game_rating: 84, peak_valuation_euros: 60000000, elite_exposure: 35 },
  'arda guler': { wikipedia_pageviews: 200000, peak_game_rating: 80, peak_valuation_euros: 40000000, elite_exposure: 15 },
  'warren zaire-emery': { wikipedia_pageviews: 120000, peak_game_rating: 79, peak_valuation_euros: 40000000, elite_exposure: 15 },
  'xavi simons': { wikipedia_pageviews: 200000, peak_game_rating: 81, peak_valuation_euros: 50000000, elite_exposure: 15 },

  // ── More world class active players ──
  'rodri': { wikipedia_pageviews: 300000, peak_game_rating: 89, peak_valuation_euros: 110000000, elite_exposure: 90 },
  'toni kroos': { wikipedia_pageviews: 450000, peak_game_rating: 90, peak_valuation_euros: 80000000, elite_exposure: 155 },
  'ilkay gundogan': { wikipedia_pageviews: 250000, peak_game_rating: 87, peak_valuation_euros: 50000000, elite_exposure: 100 },
  'jack grealish': { wikipedia_pageviews: 300000, peak_game_rating: 84, peak_valuation_euros: 100000000, elite_exposure: 40 },
  'joao cancelo': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 65000000, elite_exposure: 65 },
  'achraf hakimi': { wikipedia_pageviews: 200000, peak_game_rating: 85, peak_valuation_euros: 70000000, elite_exposure: 55 },
  'federico valverde': { wikipedia_pageviews: 200000, peak_game_rating: 87, peak_valuation_euros: 100000000, elite_exposure: 60 },
  'eduardo camavinga': { wikipedia_pageviews: 180000, peak_game_rating: 83, peak_valuation_euros: 70000000, elite_exposure: 45 },
  'aurelien tchouameni': { wikipedia_pageviews: 150000, peak_game_rating: 84, peak_valuation_euros: 80000000, elite_exposure: 40 },
  'antonio rudiger': { wikipedia_pageviews: 150000, peak_game_rating: 84, peak_valuation_euros: 35000000, elite_exposure: 80 },
  'eder militao': { wikipedia_pageviews: 150000, peak_game_rating: 84, peak_valuation_euros: 60000000, elite_exposure: 40 },
  'kim min-jae': { wikipedia_pageviews: 200000, peak_game_rating: 84, peak_valuation_euros: 60000000, elite_exposure: 25 },
  'mike maignan': { wikipedia_pageviews: 120000, peak_game_rating: 86, peak_valuation_euros: 45000000, elite_exposure: 30 },
  'marc cucurella': { wikipedia_pageviews: 120000, peak_game_rating: 81, peak_valuation_euros: 55000000, elite_exposure: 25 },

  // ── Spanish legends ──
  'raul': { wikipedia_pageviews: 300000, peak_game_rating: 90, peak_valuation_euros: 40000000, elite_exposure: 170 },
  'raul gonzalez': { wikipedia_pageviews: 300000, peak_game_rating: 90, peak_valuation_euros: 40000000, elite_exposure: 170 },
  'fernando hierro': { wikipedia_pageviews: 120000, peak_game_rating: 88, peak_valuation_euros: 15000000, elite_exposure: 130 },
  'pep guardiola': { wikipedia_pageviews: 500000, peak_game_rating: 82, peak_valuation_euros: 10000000, elite_exposure: 80 },

  // ── More PL era stars ──
  'michael carrick': { wikipedia_pageviews: 100000, peak_game_rating: 84, peak_valuation_euros: 25000000, elite_exposure: 90 },
  'sol campbell': { wikipedia_pageviews: 120000, peak_game_rating: 87, peak_valuation_euros: 18000000, elite_exposure: 80 },
  'robbie fowler': { wikipedia_pageviews: 100000, peak_game_rating: 86, peak_valuation_euros: 15000000, elite_exposure: 40 },
  'ian wright': { wikipedia_pageviews: 120000, peak_game_rating: 86, peak_valuation_euros: 8000000, elite_exposure: 35 },
  'eric cantona': { wikipedia_pageviews: 300000, peak_game_rating: 90, peak_valuation_euros: 15000000, elite_exposure: 50 },
  'michael owen': { wikipedia_pageviews: 200000, peak_game_rating: 89, peak_valuation_euros: 25000000, elite_exposure: 80 },
  'teddy sheringham': { wikipedia_pageviews: 80000, peak_game_rating: 84, peak_valuation_euros: 8000000, elite_exposure: 50 },
  'les ferdinand': { wikipedia_pageviews: 60000, peak_game_rating: 83, peak_valuation_euros: 8000000, elite_exposure: 20 },

  // ── Goalkeepers legends ──
  'dino zoff': { wikipedia_pageviews: 120000, peak_game_rating: 92, peak_valuation_euros: 8000000, elite_exposure: 80 },
  'edwin van der sar': { wikipedia_pageviews: 150000, peak_game_rating: 89, peak_valuation_euros: 15000000, elite_exposure: 130 },
  'petr cech': { wikipedia_pageviews: 200000, peak_game_rating: 90, peak_valuation_euros: 20000000, elite_exposure: 120 },
  'david de gea': { wikipedia_pageviews: 250000, peak_game_rating: 91, peak_valuation_euros: 65000000, elite_exposure: 70 },
  'hugo lloris': { wikipedia_pageviews: 200000, peak_game_rating: 88, peak_valuation_euros: 35000000, elite_exposure: 110 },
  'keylor navas': { wikipedia_pageviews: 150000, peak_game_rating: 87, peak_valuation_euros: 20000000, elite_exposure: 85 },
};

// ───────────────────────────────────────────────────────────
// Utility helpers
// ───────────────────────────────────────────────────────────

// Seeded PRNG for reproducible results
let seed = 42;
function seededRandom() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function randomInRange(min, max) {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function parseFee(fee) {
  if (!fee || fee === 'Free' || fee === 'free') return 0;
  const match = fee.match(/[€$£]?([\d.]+)\s*(m|k)?/i);
  if (!match) return 0;
  let val = parseFloat(match[1]);
  if (match[2] === 'm' || match[2] === 'M') val *= 1000000;
  else if (match[2] === 'k' || match[2] === 'K') val *= 1000;
  return Math.round(val);
}

// ───────────────────────────────────────────────────────────
// Heuristic estimation for non-famous players
// ───────────────────────────────────────────────────────────

const TOP5_LEAGUES = new Set(['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1']);

function estimateMetrics(player) {
  const metrics = {
    wikipedia_pageviews: 0,
    peak_game_rating: 0,
    peak_valuation_euros: 0,
    elite_exposure: 0,
  };

  const isTop5League = TOP5_LEAGUES.has(player.league);
  const tier = player.career_tier;
  const mv = player.market_value || 0;

  // === WIKIPEDIA PAGEVIEWS ===
  if (tier === 'legendary') {
    metrics.wikipedia_pageviews = randomInRange(500000, 3500000);
  } else if (tier === 'world_class') {
    metrics.wikipedia_pageviews = randomInRange(100000, 800000);
  } else if (tier === 'professional') {
    metrics.wikipedia_pageviews = randomInRange(20000, 150000);
  } else if (tier === 'semi_pro') {
    metrics.wikipedia_pageviews = randomInRange(5000, 30000);
  } else if (tier === 'amateur') {
    metrics.wikipedia_pageviews = randomInRange(1000, 8000);
  } else if (tier === 'beginner') {
    metrics.wikipedia_pageviews = randomInRange(200, 2000);
  } else {
    // No career tier — estimate from market value and league
    if (mv > 50000000) metrics.wikipedia_pageviews = randomInRange(80000, 500000);
    else if (mv > 20000000) metrics.wikipedia_pageviews = randomInRange(15000, 100000);
    else if (mv > 5000000) metrics.wikipedia_pageviews = randomInRange(3000, 25000);
    else if (mv > 1000000) metrics.wikipedia_pageviews = randomInRange(800, 5000);
    else if (isTop5League) metrics.wikipedia_pageviews = randomInRange(500, 3000);
    else metrics.wikipedia_pageviews = randomInRange(50, 800);
  }

  // === PEAK GAME RATING ===
  if (tier === 'legendary') metrics.peak_game_rating = randomInRange(88, 99);
  else if (tier === 'world_class') metrics.peak_game_rating = randomInRange(83, 93);
  else if (tier === 'professional') metrics.peak_game_rating = randomInRange(76, 85);
  else if (tier === 'semi_pro') metrics.peak_game_rating = randomInRange(70, 78);
  else if (tier === 'amateur') metrics.peak_game_rating = randomInRange(62, 73);
  else if (tier === 'beginner') metrics.peak_game_rating = randomInRange(55, 65);
  else {
    if (mv > 50000000) metrics.peak_game_rating = randomInRange(82, 92);
    else if (mv > 20000000) metrics.peak_game_rating = randomInRange(76, 85);
    else if (mv > 5000000) metrics.peak_game_rating = randomInRange(70, 79);
    else if (mv > 1000000) metrics.peak_game_rating = randomInRange(64, 73);
    else if (isTop5League) metrics.peak_game_rating = randomInRange(60, 72);
    else metrics.peak_game_rating = randomInRange(50, 65);
  }

  // === PEAK VALUATION ===
  let peakVal = mv;
  if (player.transfers) {
    for (const t of player.transfers) {
      if (t.fee) {
        const parsed = parseFee(t.fee);
        if (parsed > peakVal) peakVal = parsed;
      }
    }
  }
  // Legendary/world-class retired players may have low current MV
  if (tier === 'legendary' && peakVal < 20000000) peakVal = randomInRange(20000000, 100000000);
  if (tier === 'world_class' && peakVal < 10000000) peakVal = randomInRange(10000000, 60000000);
  if (tier === 'professional' && peakVal < 3000000) peakVal = randomInRange(3000000, 20000000);
  metrics.peak_valuation_euros = peakVal;

  // === ELITE EXPOSURE ===
  if (tier === 'legendary') metrics.elite_exposure = randomInRange(80, 250);
  else if (tier === 'world_class') metrics.elite_exposure = randomInRange(40, 150);
  else if (tier === 'professional') metrics.elite_exposure = randomInRange(15, 70);
  else if (tier === 'semi_pro') metrics.elite_exposure = randomInRange(5, 30);
  else if (tier === 'amateur') metrics.elite_exposure = randomInRange(0, 10);
  else if (tier === 'beginner') metrics.elite_exposure = randomInRange(0, 3);
  else {
    if (mv > 20000000) metrics.elite_exposure = randomInRange(15, 80);
    else if (mv > 5000000) metrics.elite_exposure = randomInRange(5, 30);
    else if (isTop5League) metrics.elite_exposure = randomInRange(0, 15);
    else metrics.elite_exposure = randomInRange(0, 10);
  }

  return metrics;
}

// ───────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────

function main() {
  const dbPath = path.join(__dirname, '..', '..', 'data', 'master_db.json');
  const outPath = path.join(__dirname, '..', '..', 'data', 'popularity_metrics.json');

  console.log('Reading master_db.json...');
  const raw = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(raw);
  const players = db.players;

  console.log(`Processing ${players.length} players...`);

  let knownHits = 0;
  let heuristicHits = 0;

  const results = players.map(player => {
    const normalizedName = (player.normalized_name || player.name.toLowerCase()).trim();

    // Check known players lookup
    const known = KNOWN_PLAYERS[normalizedName];
    let metrics;
    if (known) {
      metrics = { ...known };
      knownHits++;
    } else {
      metrics = estimateMetrics(player);
      heuristicHits++;
    }

    return {
      global_id: player.global_id,
      name: player.name,
      wikipedia_pageviews: metrics.wikipedia_pageviews,
      peak_game_rating: metrics.peak_game_rating,
      peak_valuation_euros: metrics.peak_valuation_euros,
      elite_exposure: metrics.elite_exposure,
    };
  });

  // Write output
  console.log(`Writing ${results.length} records to popularity_metrics.json...`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');

  // Summary stats
  const stats = {
    wikipedia_pageviews: { min: Infinity, max: -Infinity, sum: 0 },
    peak_game_rating: { min: Infinity, max: -Infinity, sum: 0 },
    peak_valuation_euros: { min: Infinity, max: -Infinity, sum: 0 },
    elite_exposure: { min: Infinity, max: -Infinity, sum: 0 },
  };

  for (const r of results) {
    for (const key of Object.keys(stats)) {
      const val = r[key];
      if (val < stats[key].min) stats[key].min = val;
      if (val > stats[key].max) stats[key].max = val;
      stats[key].sum += val;
    }
  }

  console.log('\n=== Summary Statistics ===');
  console.log(`Total players: ${results.length}`);
  console.log(`Known player matches: ${knownHits}`);
  console.log(`Heuristic estimates: ${heuristicHits}`);
  console.log('');

  for (const [key, s] of Object.entries(stats)) {
    const avg = Math.round(s.sum / results.length);
    console.log(`${key}:`);
    console.log(`  min: ${s.min.toLocaleString()}`);
    console.log(`  max: ${s.max.toLocaleString()}`);
    console.log(`  avg: ${avg.toLocaleString()}`);
  }

  console.log('\nDone.');
}

main();
