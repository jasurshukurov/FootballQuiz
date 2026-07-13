/**
 * Entity Resolution Pipeline
 *
 * Reads all 4 data sources (players_db, career_paths, transfers, matches_db),
 * cross-references entities by normalized/fuzzy name matching,
 * and outputs resolved mapping files:
 *   - data/player_id_map.json
 *   - data/club_id_map.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlayersDbEntry {
  id: number;
  name: string;
  normalized_name: string;
  nationality: string;
  current_team: string;
  league: string;
  position: string;
  market_value: number;
  image_url: string;
}

interface CareerStep {
  club: string;
  from: number;
  to: number;
}

interface CareerPathEntry {
  id: number;
  name: string;
  normalized_name: string;
  nationality: string;
  position: string;
  tier: string;
  career: CareerStep[];
  image_url: string;
}

interface Transfer {
  club_name: string;
  club_id: string;
  date_joined: string;
  date_left: string | null;
  fee: string | null;
}

interface TransferEntry {
  player_id: number;
  player_name: string;
  transfers: Transfer[];
}

interface MatchEntry {
  match_id: string;
  date: string;
  competition: string;
  season: string;
  opponent_a: string;
  opponent_b: string;
  score: string;
  lineup_a_ids: number[];
  lineup_b_ids: number[];
  lineup_a_names: string[];
  lineup_b_names: string[];
}

// ─── Name normalization ──────────────────────────────────────────────────────

function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z\s]/g, '') // strip non-alpha
    .trim()
    .replace(/\s+/g, ' '); // collapse whitespace
}

function getLastName(normalized: string): string {
  const parts = normalized.split(' ');
  return parts[parts.length - 1];
}

function getFirstAndLast(normalized: string): string {
  const parts = normalized.split(' ');
  if (parts.length <= 2) return normalized;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

// ─── Club name canonicalization ──────────────────────────────────────────────

// Maps lowercased club strings -> canonical short name
const CLUB_ALIASES: Record<string, string> = {
  // England - Premier League
  'arsenal football club': 'Arsenal',
  'arsenal fc': 'Arsenal',
  arsenal: 'Arsenal',
  'chelsea football club': 'Chelsea',
  'chelsea fc': 'Chelsea',
  chelsea: 'Chelsea',
  'liverpool football club': 'Liverpool',
  'liverpool fc': 'Liverpool',
  liverpool: 'Liverpool',
  'manchester united football club': 'Manchester United',
  'manchester united fc': 'Manchester United',
  'manchester united': 'Manchester United',
  'man united': 'Manchester United',
  'man utd': 'Manchester United',
  'manchester city football club': 'Manchester City',
  'manchester city fc': 'Manchester City',
  'manchester city': 'Manchester City',
  'man city': 'Manchester City',
  'tottenham hotspur football club': 'Tottenham Hotspur',
  'tottenham hotspur fc': 'Tottenham Hotspur',
  'tottenham hotspur': 'Tottenham Hotspur',
  tottenham: 'Tottenham Hotspur',
  spurs: 'Tottenham Hotspur',
  'aston villa football club': 'Aston Villa',
  'aston villa fc': 'Aston Villa',
  'aston villa': 'Aston Villa',
  'newcastle united football club': 'Newcastle United',
  'newcastle united fc': 'Newcastle United',
  'newcastle united': 'Newcastle United',
  newcastle: 'Newcastle United',
  'west ham united football club': 'West Ham United',
  'west ham united fc': 'West Ham United',
  'west ham united': 'West Ham United',
  'west ham': 'West Ham United',
  'wolverhampton wanderers football club': 'Wolverhampton Wanderers',
  'wolverhampton wanderers fc': 'Wolverhampton Wanderers',
  'wolverhampton wanderers': 'Wolverhampton Wanderers',
  wolves: 'Wolverhampton Wanderers',
  'brighton & hove albion football club': 'Brighton & Hove Albion',
  'brighton & hove albion fc': 'Brighton & Hove Albion',
  'brighton & hove albion': 'Brighton & Hove Albion',
  brighton: 'Brighton & Hove Albion',
  'crystal palace football club': 'Crystal Palace',
  'crystal palace fc': 'Crystal Palace',
  'crystal palace': 'Crystal Palace',
  'everton football club': 'Everton',
  'everton fc': 'Everton',
  everton: 'Everton',
  'fulham football club': 'Fulham',
  'fulham fc': 'Fulham',
  fulham: 'Fulham',
  'association football club bournemouth': 'AFC Bournemouth',
  'afc bournemouth': 'AFC Bournemouth',
  bournemouth: 'AFC Bournemouth',
  'nottingham forest football club': 'Nottingham Forest',
  'nottingham forest fc': 'Nottingham Forest',
  'nottingham forest': 'Nottingham Forest',
  'nottm forest': 'Nottingham Forest',
  'brentford football club': 'Brentford',
  'brentford fc': 'Brentford',
  brentford: 'Brentford',
  'leicester city football club': 'Leicester City',
  'leicester city fc': 'Leicester City',
  'leicester city': 'Leicester City',
  leicester: 'Leicester City',
  'leeds united football club': 'Leeds United',
  'leeds united fc': 'Leeds United',
  'leeds united': 'Leeds United',
  leeds: 'Leeds United',
  'southampton football club': 'Southampton',
  'southampton fc': 'Southampton',
  southampton: 'Southampton',
  'burnley football club': 'Burnley',
  'burnley fc': 'Burnley',
  burnley: 'Burnley',
  'watford football club': 'Watford',
  'watford fc': 'Watford',
  watford: 'Watford',
  'sheffield united football club': 'Sheffield United',
  'sheffield united': 'Sheffield United',
  'west bromwich albion football club': 'West Bromwich Albion',
  'west bromwich albion': 'West Bromwich Albion',
  'west brom': 'West Bromwich Albion',
  'blackburn rovers': 'Blackburn Rovers',
  'bolton wanderers': 'Bolton Wanderers',
  bolton: 'Bolton Wanderers',
  sunderland: 'Sunderland',
  middlesbrough: 'Middlesbrough',
  'ipswich town football club': 'Ipswich Town',
  'ipswich town': 'Ipswich Town',

  // Spain - La Liga
  'futbol club barcelona': 'Barcelona',
  'fc barcelona': 'Barcelona',
  barcelona: 'Barcelona',
  barca: 'Barcelona',
  'real madrid club de futbol': 'Real Madrid',
  'real madrid cf': 'Real Madrid',
  'real madrid': 'Real Madrid',
  'club atletico de madrid s.a.d.': 'Atletico Madrid',
  'club atletico de madrid': 'Atletico Madrid',
  'atletico de madrid': 'Atletico Madrid',
  'atletico madrid': 'Atletico Madrid',
  atletico: 'Atletico Madrid',
  'sevilla futbol club s.a.d.': 'Sevilla',
  'sevilla fc': 'Sevilla',
  sevilla: 'Sevilla',
  'real sociedad de futbol s.a.d.': 'Real Sociedad',
  'real sociedad': 'Real Sociedad',
  'real betis balompie s.a.d.': 'Real Betis',
  'real betis': 'Real Betis',
  betis: 'Real Betis',
  'villarreal club de futbol s.a.d.': 'Villarreal',
  'villarreal cf': 'Villarreal',
  villarreal: 'Villarreal',
  'valencia club de futbol s.a.d.': 'Valencia',
  'valencia cf': 'Valencia',
  valencia: 'Valencia',
  'athletic club bilbao': 'Athletic Bilbao',
  'athletic bilbao': 'Athletic Bilbao',
  'athletic club': 'Athletic Bilbao',
  'real club celta de vigo s.a.d.': 'Celta Vigo',
  'celta vigo': 'Celta Vigo',
  'celta de vigo': 'Celta Vigo',
  'reial club deportiu espanyol de barcelona s.a.d.': 'Espanyol',
  espanyol: 'Espanyol',
  'rcd espanyol': 'Espanyol',
  'rayo vallecano de madrid s. a. d.': 'Rayo Vallecano',
  'rayo vallecano': 'Rayo Vallecano',
  'deportivo alaves s.a.d.': 'Alaves',
  'deportivo alaves': 'Alaves',
  alaves: 'Alaves',
  'real club deportivo de la coruna s.a.d.': 'Deportivo La Coruna',
  'deportivo la coruna': 'Deportivo La Coruna',
  deportivo: 'Deportivo La Coruna',
  'getafe club de futbol s.a.d.': 'Getafe',
  'getafe cf': 'Getafe',
  getafe: 'Getafe',
  'real zaragoza': 'Real Zaragoza',
  zaragoza: 'Real Zaragoza',
  'malaga cf': 'Malaga',
  malaga: 'Malaga',
  almeria: 'Almeria',
  'ud almeria': 'Almeria',
  osasuna: 'Osasuna',
  'club atletico osasuna': 'Osasuna',
  'real valladolid club de futbol': 'Real Valladolid',
  'real valladolid': 'Real Valladolid',
  valladolid: 'Real Valladolid',
  'girona futbol club s.a.d.': 'Girona',
  'girona fc': 'Girona',
  girona: 'Girona',
  albacete: 'Albacete',
  'ud las palmas': 'Las Palmas',
  'las palmas': 'Las Palmas',
  'cadiz club de futbol s.a.d.': 'Cadiz',
  'cadiz cf': 'Cadiz',
  cadiz: 'Cadiz',
  'real mallorca': 'Mallorca',
  mallorca: 'Mallorca',
  'racing santander': 'Racing Santander',
  numancia: 'Numancia',
  'recreativo huelva': 'Recreativo Huelva',

  // Italy - Serie A
  'juventus football club': 'Juventus',
  'juventus fc': 'Juventus',
  juventus: 'Juventus',
  juve: 'Juventus',
  'associazione calcio milan': 'AC Milan',
  'ac milan': 'AC Milan',
  milan: 'AC Milan',
  'football club internazionale milano s.p.a.': 'Inter Milan',
  'fc internazionale milano': 'Inter Milan',
  'inter milan': 'Inter Milan',
  internazionale: 'Inter Milan',
  inter: 'Inter Milan',
  'societa sportiva lazio s.p.a.': 'Lazio',
  'ss lazio': 'Lazio',
  lazio: 'Lazio',
  'associazione sportiva roma': 'AS Roma',
  'as roma': 'AS Roma',
  roma: 'AS Roma',
  'societa sportiva calcio napoli s.p.a.': 'Napoli',
  'ssc napoli': 'Napoli',
  napoli: 'Napoli',
  'associazione calcio fiorentina': 'Fiorentina',
  'acf fiorentina': 'Fiorentina',
  fiorentina: 'Fiorentina',
  'atalanta bergamasca calcio s.p.a.': 'Atalanta',
  'atalanta bc': 'Atalanta',
  atalanta: 'Atalanta',
  'bologna football club 1909': 'Bologna',
  'bologna fc': 'Bologna',
  bologna: 'Bologna',
  'unione calcio sampdoria': 'Sampdoria',
  sampdoria: 'Sampdoria',
  'unione sportiva sassuolo calcio': 'Sassuolo',
  sassuolo: 'Sassuolo',
  'genoa cricket and football club s.p.a.': 'Genoa',
  'genoa cfc': 'Genoa',
  genoa: 'Genoa',
  'udinese calcio s.p.a.': 'Udinese',
  udinese: 'Udinese',
  'empoli football club': 'Empoli',
  empoli: 'Empoli',
  'hellas verona football club s.r.l.': 'Hellas Verona',
  'hellas verona': 'Hellas Verona',
  verona: 'Hellas Verona',
  'torino football club s.p.a.': 'Torino',
  'torino fc': 'Torino',
  torino: 'Torino',
  'us lecce': 'Lecce',
  lecce: 'Lecce',
  'cagliari calcio': 'Cagliari',
  cagliari: 'Cagliari',
  'us salernitana 1919': 'Salernitana',
  salernitana: 'Salernitana',
  'parma calcio 1913 s.r.l.': 'Parma',
  'parma calcio': 'Parma',
  parma: 'Parma',
  'benevento calcio': 'Benevento',
  benevento: 'Benevento',
  'ac monza': 'Monza',
  monza: 'Monza',
  'brescia calcio': 'Brescia',
  brescia: 'Brescia',
  perugia: 'Perugia',
  reggina: 'Reggina',
  ascoli: 'Ascoli',
  bari: 'Bari',
  'como 1907': 'Como',
  como: 'Como',
  'frosinone calcio': 'Frosinone',
  frosinone: 'Frosinone',
  spal: 'SPAL',
  'venezia fc': 'Venezia',
  venezia: 'Venezia',
  'ac carpi': 'Carpi',
  carpi: 'Carpi',
  'ac cesena': 'Cesena',
  cesena: 'Cesena',
  'chievo verona': 'Chievo Verona',
  chievo: 'Chievo Verona',
  crotone: 'Crotone',
  livorno: 'Livorno',
  palermo: 'Palermo',
  pescara: 'Pescara',
  siena: 'Siena',
  'spezia calcio': 'Spezia',
  spezia: 'Spezia',

  // Germany - Bundesliga
  'fc bayern munchen': 'Bayern Munich',
  'fc bayern münchen': 'Bayern Munich',
  'bayern munich': 'Bayern Munich',
  'bayern munchen': 'Bayern Munich',
  bayern: 'Bayern Munich',
  'borussia dortmund': 'Borussia Dortmund',
  bvb: 'Borussia Dortmund',
  dortmund: 'Borussia Dortmund',
  'rasenballsport leipzig': 'RB Leipzig',
  'rb leipzig': 'RB Leipzig',
  'bayer 04 leverkusen fussball': 'Bayer Leverkusen',
  'bayer 04 leverkusen': 'Bayer Leverkusen',
  'bayer leverkusen': 'Bayer Leverkusen',
  leverkusen: 'Bayer Leverkusen',
  'vfl wolfsburg': 'VfL Wolfsburg',
  wolfsburg: 'VfL Wolfsburg',
  'eintracht frankfurt': 'Eintracht Frankfurt',
  'eintracht frankfurt fussball': 'Eintracht Frankfurt',
  frankfurt: 'Eintracht Frankfurt',
  'sport-club freiburg': 'SC Freiburg',
  'sc freiburg': 'SC Freiburg',
  freiburg: 'SC Freiburg',
  '1. fussball-club koln': 'FC Koln',
  '1. fc koln': 'FC Koln',
  'fc koln': 'FC Koln',
  koln: 'FC Koln',
  '1. fussball- und sportverein mainz 05': 'Mainz 05',
  '1. fsv mainz 05': 'Mainz 05',
  'mainz 05': 'Mainz 05',
  mainz: 'Mainz 05',
  'fc augsburg': 'Augsburg',
  augsburg: 'Augsburg',
  'verein fur bewegungsspiele stuttgart 1893': 'VfB Stuttgart',
  'vfb stuttgart': 'VfB Stuttgart',
  stuttgart: 'VfB Stuttgart',
  'borussia monchengladbach': 'Borussia Monchengladbach',
  "borussia m'gladbach": 'Borussia Monchengladbach',
  gladbach: 'Borussia Monchengladbach',
  monchengladbach: 'Borussia Monchengladbach',
  'tsg 1899 hoffenheim fussball-spielbetriebs gmbh': 'TSG Hoffenheim',
  'tsg hoffenheim': 'TSG Hoffenheim',
  hoffenheim: 'TSG Hoffenheim',
  'hertha berlin': 'Hertha Berlin',
  'hertha bsc': 'Hertha Berlin',
  '1. fussballclub heidenheim 1846': 'Heidenheim',
  '1. fc heidenheim': 'Heidenheim',
  heidenheim: 'Heidenheim',
  '1. fussballclub union berlin': 'Union Berlin',
  '1. fc union berlin': 'Union Berlin',
  'union berlin': 'Union Berlin',
  'fc schalke 04': 'Schalke 04',
  'schalke 04': 'Schalke 04',
  schalke: 'Schalke 04',
  'sv werder bremen': 'Werder Bremen',
  'werder bremen': 'Werder Bremen',
  'arminia bielefeld': 'Arminia Bielefeld',
  'fc st. pauli': 'St. Pauli',
  'st. pauli': 'St. Pauli',
  'st pauli': 'St. Pauli',
  '1860 munich': '1860 Munich',
  'hamburger sportverein': 'Hamburger SV',
  'hamburger sv': 'Hamburger SV',
  hamburg: 'Hamburger SV',
  '1.fc nuremberg': 'Nuremberg',
  '1. fc nurnberg': 'Nuremberg',
  nuremberg: 'Nuremberg',
  'fortuna dusseldorf': 'Fortuna Dusseldorf',
  darmstadt: 'Darmstadt 98',
  'sv darmstadt 98': 'Darmstadt 98',
  'darmstadt 98': 'Darmstadt 98',
  'greuther furth': 'Greuther Furth',
  'holstein kiel': 'Holstein Kiel',
  kaiserslautern: 'Kaiserslautern',
  '1. fc kaiserslautern': 'Kaiserslautern',
  paderborn: 'Paderborn',
  'sc paderborn': 'Paderborn',

  // France - Ligue 1
  'paris saint-germain football club': 'Paris Saint-Germain',
  'paris saint-germain fc': 'Paris Saint-Germain',
  'paris saint-germain': 'Paris Saint-Germain',
  'paris sg': 'Paris Saint-Germain',
  psg: 'Paris Saint-Germain',
  'association sportive de monaco football club': 'AS Monaco',
  'as monaco fc': 'AS Monaco',
  'as monaco': 'AS Monaco',
  monaco: 'AS Monaco',
  'olympique lyonnais': 'Olympique Lyon',
  'olympique lyon': 'Olympique Lyon',
  lyon: 'Olympique Lyon',
  ol: 'Olympique Lyon',
  'olympique de marseille': 'Olympique Marseille',
  'olympique marseille': 'Olympique Marseille',
  marseille: 'Olympique Marseille',
  om: 'Olympique Marseille',
  'lille olympique sporting club': 'Lille',
  'losc lille': 'Lille',
  'lille osc': 'Lille',
  lille: 'Lille',
  'stade rennais football club': 'Rennes',
  'stade rennais': 'Rennes',
  rennes: 'Rennes',
  'racing club de lens': 'Lens',
  'rc lens': 'Lens',
  lens: 'Lens',
  'ogc nice': 'Nice',
  nice: 'Nice',
  'stade de reims': 'Reims',
  reims: 'Reims',
  'association de la jeunesse auxerroise': 'Auxerre',
  'aj auxerre': 'Auxerre',
  auxerre: 'Auxerre',
  'racing club de strasbourg': 'Strasbourg',
  'rc strasbourg': 'Strasbourg',
  strasbourg: 'Strasbourg',
  'montpellier herault sport club': 'Montpellier',
  'montpellier hsc': 'Montpellier',
  montpellier: 'Montpellier',
  'stade brestois 29': 'Brest',
  brest: 'Brest',
  'toulouse football club': 'Toulouse',
  'toulouse fc': 'Toulouse',
  toulouse: 'Toulouse',
  'fc nantes': 'Nantes',
  nantes: 'Nantes',
  'girondins de bordeaux': 'Bordeaux',
  bordeaux: 'Bordeaux',
  'as saint-etienne': 'Saint-Etienne',
  'saint-etienne': 'Saint-Etienne',
  "angers sporting club de l'ouest": 'Angers',
  'angers sco': 'Angers',
  angers: 'Angers',
  'amiens sc': 'Amiens',
  amiens: 'Amiens',
  "dijon football cote-d'or": 'Dijon',
  'dijon fco': 'Dijon',
  dijon: 'Dijon',
  'fc lorient': 'Lorient',
  lorient: 'Lorient',
  'fc metz': 'Metz',
  metz: 'Metz',
  'as nancy-lorraine': 'Nancy',
  nancy: 'Nancy',
  'ac ajaccio': 'AC Ajaccio',
  bastia: 'Bastia',
  caen: 'Caen',
  'sm caen': 'Caen',
  guingamp: 'Guingamp',
  troyes: 'Troyes',
  'es troyes ac': 'Troyes',
  'le havre athletic club': 'Le Havre',
  'le havre': 'Le Havre',
  'paris football club': 'Paris FC',
  'paris fc': 'Paris FC',
  ales: 'Ales',
  'arles-avignon': 'Arles-Avignon',

  // Portugal
  'sport lisboa e benfica': 'Benfica',
  'sl benfica': 'Benfica',
  benfica: 'Benfica',
  'futebol clube do porto': 'Porto',
  'fc porto': 'Porto',
  porto: 'Porto',
  'sporting clube de portugal': 'Sporting CP',
  'sporting cp': 'Sporting CP',
  'sporting lisbon': 'Sporting CP',
  sporting: 'Sporting CP',
  'sporting clube de braga': 'Braga',
  'sc braga': 'Braga',
  braga: 'Braga',
  boavista: 'Boavista',
  belenenses: 'Belenenses',
  'vitoria guimaraes': 'Vitoria Guimaraes',

  // Netherlands
  'afc ajax': 'Ajax',
  'ajax amsterdam': 'Ajax',
  ajax: 'Ajax',
  'feyenoord rotterdam': 'Feyenoord',
  feyenoord: 'Feyenoord',
  'psv eindhoven': 'PSV Eindhoven',
  psv: 'PSV Eindhoven',
  'az alkmaar': 'AZ Alkmaar',
  az: 'AZ Alkmaar',
  twente: 'FC Twente',
  'fc twente': 'FC Twente',
  heerenveen: 'Heerenveen',
  'sc heerenveen': 'Heerenveen',
  'fc groningen': 'Groningen',
  groningen: 'Groningen',
  vitesse: 'Vitesse',

  // Turkey
  galatasaray: 'Galatasaray',
  'galatasaray istanbul': 'Galatasaray',
  fenerbahce: 'Fenerbahce',
  'fenerbahce istanbul': 'Fenerbahce',
  besiktas: 'Besiktas',
  'besiktas istanbul': 'Besiktas',
  trabzonspor: 'Trabzonspor',
  antalyaspor: 'Antalyaspor',
  basaksehir: 'Basaksehir',
  'istanbul basaksehir': 'Basaksehir',

  // Russia
  'zenit st. petersburg': 'Zenit St. Petersburg',
  'zenit st petersburg': 'Zenit St. Petersburg',
  zenit: 'Zenit St. Petersburg',
  'cska moscow': 'CSKA Moscow',
  'spartak moscow': 'Spartak Moscow',
  'lokomotiv moscow': 'Lokomotiv Moscow',
  'anzhi makhachkala': 'Anzhi Makhachkala',
  'dynamo moscow': 'Dynamo Moscow',
  'rubin kazan': 'Rubin Kazan',

  // Scotland
  'celtic football club': 'Celtic',
  'celtic fc': 'Celtic',
  celtic: 'Celtic',
  'rangers football club': 'Rangers',
  'rangers fc': 'Rangers',
  rangers: 'Rangers',
  aberdeen: 'Aberdeen',

  // South America
  'club atletico boca juniors': 'Boca Juniors',
  'boca juniors': 'Boca Juniors',
  'club atletico river plate': 'River Plate',
  'river plate': 'River Plate',
  'santos fc': 'Santos',
  santos: 'Santos',
  'sao paulo fc': 'Sao Paulo',
  'sao paulo': 'Sao Paulo',
  flamengo: 'Flamengo',
  fluminense: 'Fluminense',
  corinthians: 'Corinthians',
  palmeiras: 'Palmeiras',
  cruzeiro: 'Cruzeiro',
  gremio: 'Gremio',
  internacional: 'Internacional',
  'atletico mineiro': 'Atletico Mineiro',
  'atletico paranaense': 'Atletico Paranaense',
  'vasco da gama': 'Vasco da Gama',
  botafogo: 'Botafogo',
  bahia: 'Bahia',
  'america mineiro': 'America Mineiro',
  banfield: 'Banfield',
  belgrano: 'Belgrano',
  'argentinos juniors': 'Argentinos Juniors',
  "newell's old boys": "Newell's Old Boys",
  'newells old boys': "Newell's Old Boys",
  'racing club': 'Racing Club',
  independiente: 'Independiente',
  'velez sarsfield': 'Velez Sarsfield',
  estudiantes: 'Estudiantes',
  lanus: 'Lanus',
  'san lorenzo': 'San Lorenzo',
  penarol: 'Penarol',
  nacional: 'Nacional',

  // Middle East
  'al-nassr': 'Al-Nassr',
  'al nassr': 'Al-Nassr',
  'al-hilal': 'Al-Hilal',
  'al hilal': 'Al-Hilal',
  'al-ahli': 'Al-Ahli',
  'al ahli': 'Al-Ahli',
  'al-ittihad': 'Al-Ittihad',
  'al ittihad': 'Al-Ittihad',
  'al ahly': 'Al Ahly',
  'al-duhail': 'Al-Duhail',
  'al duhail': 'Al-Duhail',
  'al sadd': 'Al Sadd',
  'al-sadd': 'Al Sadd',
  'al-gharafa': 'Al-Gharafa',
  'al gharafa': 'Al-Gharafa',
  'al-shabab': 'Al-Shabab',
  'al shabab': 'Al-Shabab',
  'al-rayyan': 'Al-Rayyan',
  'al-arabi': 'Al-Arabi',
  'al-wahda': 'Al-Wahda',
  'al-qadsiah': 'Al-Qadsiah',
  baniyas: 'Baniyas',

  // Belgium
  'rsc anderlecht': 'Anderlecht',
  anderlecht: 'Anderlecht',
  'club brugge kv': 'Club Brugge',
  'club brugge': 'Club Brugge',
  'standard liege': 'Standard Liege',
  'krc genk': 'Genk',
  genk: 'Genk',
  antwerp: 'Antwerp',
  beveren: 'Beveren',

  // USA / MLS
  'inter miami cf': 'Inter Miami',
  'inter miami': 'Inter Miami',
  'la galaxy': 'LA Galaxy',
  'atlanta united': 'Atlanta United',
  'new york red bulls': 'New York Red Bulls',
  'new york city fc': 'New York City FC',

  // Other
  'dynamo kyiv': 'Dynamo Kyiv',
  'dynamo kiev': 'Dynamo Kyiv',
  'shakhtar donetsk': 'Shakhtar Donetsk',
  'red star belgrade': 'Red Star Belgrade',
  'partizan belgrade': 'Partizan',
  partizan: 'Partizan',
  olympiacos: 'Olympiacos',
  panathinaikos: 'Panathinaikos',
  'aek athens': 'AEK Athens',
  'steaua bucharest': 'Steaua Bucharest',
  'rapid vienna': 'Rapid Vienna',
  'red bull salzburg': 'Red Bull Salzburg',
  'rb salzburg': 'Red Bull Salzburg',
  salzburg: 'Red Bull Salzburg',
  'fc basel': 'Basel',
  basel: 'Basel',
  'young boys': 'Young Boys',
  'bsc young boys': 'Young Boys',
  'fc copenhagen': 'FC Copenhagen',
  copenhagen: 'FC Copenhagen',
  malmo: 'Malmo',
  'malmo ff': 'Malmo',
  aik: 'AIK',

  // Asia
  'beijing guoan': 'Beijing Guoan',
  'shanghai shenhua': 'Shanghai Shenhua',
  'guangzhou evergrande': 'Guangzhou Evergrande',
  'tianjin quanjian': 'Tianjin Quanjian',
  'jiangsu suning': 'Jiangsu Suning',
  'kashima antlers': 'Kashima Antlers',
  'yokohama f. marinos': 'Yokohama F. Marinos',
  'urawa red diamonds': 'Urawa Red Diamonds',
  'bellmare hiratsuka': 'Bellmare Hiratsuka',
  'avispa fukuoka': 'Avispa Fukuoka',
  'nagoya grampus': 'Nagoya Grampus',
  'vissel kobe': 'Vissel Kobe',

  // Mexico
  america: 'Club America',
  'club america': 'Club America',
  atlas: 'Atlas',
  'atletico celaya': 'Atletico Celaya',
  leon: 'Leon',
  guadalajara: 'Guadalajara',
  chivas: 'Guadalajara',
  'cruz azul': 'Cruz Azul',
  monterrey: 'Monterrey',
  'cf monterrey': 'Monterrey',
  pachuca: 'Pachuca',
  'santos laguna': 'Santos Laguna',
  tigres: 'Tigres UANL',
  'tigres uanl': 'Tigres UANL',
  necaxa: 'Necaxa',
  toluca: 'Toluca',

  // Other countries / misc
  barranquilla: 'Barranquilla',
  'africa sports': 'Africa Sports',
  'abiola babes': 'Abiola Babes',
  'al ain': 'Al Ain',
};

function canonicalizeClub(name: string): string {
  const lower = normalizeName(name);
  // Try exact match on lowered original first
  const lowerOrig = name.toLowerCase().trim();
  if (CLUB_ALIASES[lowerOrig]) return CLUB_ALIASES[lowerOrig];
  // Try normalized (stripped diacritics)
  if (CLUB_ALIASES[lower]) return CLUB_ALIASES[lower];
  // Return the original name with trimming as fallback
  return name.trim();
}

function generateClubId(canonicalName: string): string {
  return normalizeName(canonicalName)
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Data loading ────────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname || __dirname, '../..');

function loadJSON<T>(relPath: string): T {
  const raw = readFileSync(resolve(ROOT, relPath), 'utf-8');
  return JSON.parse(raw);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('=== Entity Resolution Pipeline ===\n');

  // 1. Load data
  console.log('Loading datasets...');
  const playersDb = loadJSON<PlayersDbEntry[]>('data/players_db_v1.json');
  const careerPaths = loadJSON<CareerPathEntry[]>('data/career_paths.json');
  const transfers = loadJSON<TransferEntry[]>('data/transfers.json');
  const matches = loadJSON<MatchEntry[]>('data/matches_db.json');

  console.log(`  players_db:    ${playersDb.length} players`);
  console.log(`  career_paths:  ${careerPaths.length} players`);
  console.log(`  transfers:     ${transfers.length} players`);
  console.log(`  matches:       ${matches.length} matches`);

  // 2. Build players_db indexes
  console.log('\nBuilding player indexes...');

  // normalized_name -> PlayersDbEntry[]
  const pdbByNorm = new Map<string, PlayersDbEntry[]>();
  // last name -> PlayersDbEntry[]
  const pdbByLastName = new Map<string, PlayersDbEntry[]>();

  for (const p of playersDb) {
    const nn = normalizeName(p.name);
    if (!pdbByNorm.has(nn)) pdbByNorm.set(nn, []);
    pdbByNorm.get(nn)!.push(p);

    const ln = getLastName(nn);
    if (!pdbByLastName.has(ln)) pdbByLastName.set(ln, []);
    pdbByLastName.get(ln)!.push(p);
  }

  console.log(`  Unique normalized names: ${pdbByNorm.size}`);

  // 3. Resolution functions

  function findInPlayersDb(
    name: string,
    nationality?: string,
    position?: string,
  ): PlayersDbEntry | null {
    const nn = normalizeName(name);
    // Exact normalized match
    const exact = pdbByNorm.get(nn);

    if (exact) {
      if (exact.length === 1) return exact[0];
      // Disambiguate by nationality
      if (nationality) {
        const byNat = exact.filter(
          (p) => normalizeName(p.nationality) === normalizeName(nationality),
        );
        if (byNat.length === 1) return byNat[0];
      }
      // Disambiguate by position
      if (position) {
        const posNorm = normalizeName(position);
        const byPos = exact.filter((p) => {
          const pPos = normalizeName(p.position);
          return pPos === posNorm || pPos.includes(posNorm) || posNorm.includes(pPos);
        });
        if (byPos.length === 1) return byPos[0];
      }
      // Return first if all else fails
      return exact[0];
    }

    // Try reversed name (e.g. "Son Heung-min" -> "heungmin son")
    const parts2 = nn.split(' ');
    if (parts2.length >= 2) {
      const reversed = [...parts2].reverse().join(' ');
      const revMatch = pdbByNorm.get(reversed);
      if (revMatch) {
        if (revMatch.length === 1) return revMatch[0];
        if (nationality) {
          const byNat = revMatch.filter(
            (p) => normalizeName(p.nationality) === normalizeName(nationality),
          );
          if (byNat.length === 1) return byNat[0];
        }
        return revMatch[0];
      }
    }

    // Try first+last name match
    const fl = getFirstAndLast(nn);
    if (fl !== nn) {
      const flMatch = pdbByNorm.get(fl);
      if (flMatch) {
        if (flMatch.length === 1) return flMatch[0];
        if (nationality) {
          const byNat = flMatch.filter(
            (p) => normalizeName(p.nationality) === normalizeName(nationality),
          );
          if (byNat.length === 1) return byNat[0];
        }
        return flMatch[0];
      }
    }

    // Try all permutations of multi-word names (for 2-3 word names)
    if (parts2.length === 2) {
      // Already handled by reversed above
    } else if (parts2.length === 3) {
      const perms = [
        `${parts2[0]} ${parts2[2]} ${parts2[1]}`,
        `${parts2[1]} ${parts2[0]} ${parts2[2]}`,
        `${parts2[1]} ${parts2[2]} ${parts2[0]}`,
        `${parts2[2]} ${parts2[0]} ${parts2[1]}`,
        `${parts2[2]} ${parts2[1]} ${parts2[0]}`,
      ];
      for (const perm of perms) {
        const permMatch = pdbByNorm.get(perm);
        if (permMatch) {
          if (permMatch.length === 1) return permMatch[0];
          if (nationality) {
            const byNat = permMatch.filter(
              (p) => normalizeName(p.nationality) === normalizeName(nationality),
            );
            if (byNat.length === 1) return byNat[0];
          }
          return permMatch[0];
        }
      }
    }

    // Last name only matching (only if last name has 4+ chars to avoid false positives)
    const ln = getLastName(nn);
    const searchFirstName = nn.split(' ').length > 1 ? nn.split(' ')[0] : null;
    if (ln.length >= 4) {
      const lastNameCandidates = pdbByLastName.get(ln);
      if (lastNameCandidates) {
        // If we have a first name, always verify it matches before returning
        if (searchFirstName && searchFirstName.length >= 3) {
          const byFirst = lastNameCandidates.filter((p) => {
            const pFirst = normalizeName(p.name).split(' ')[0];
            return pFirst === searchFirstName;
          });
          if (byFirst.length === 0) {
            // First name doesn't match ANY candidate -> skip last-name matching entirely
            // (prevents matching "Zinedine Zidane" -> "Theo Zidane")
          } else if (byFirst.length === 1) {
            return byFirst[0];
          } else {
            // Multiple first+last matches, try nationality
            if (nationality) {
              const byNat = byFirst.filter(
                (p) => normalizeName(p.nationality) === normalizeName(nationality),
              );
              if (byNat.length === 1) return byNat[0];
            }
          }
        } else {
          // No first name available (single-word name)
          // If unique match, return it
          if (lastNameCandidates.length === 1) return lastNameCandidates[0];
          // Otherwise use nationality/position
          if (nationality) {
            const byNat = lastNameCandidates.filter(
              (p) => normalizeName(p.nationality) === normalizeName(nationality),
            );
            if (byNat.length === 1) return byNat[0];
            if (position && byNat.length > 1) {
              const posNorm = normalizeName(position);
              const byPos = byNat.filter((p) => {
                const pPos = normalizeName(p.position);
                return pPos === posNorm || pPos.includes(posNorm) || posNorm.includes(pPos);
              });
              if (byPos.length === 1) return byPos[0];
            }
          }
        }
      }
    }

    // Try substring matching: check if normalized name is contained in any pdb name or vice versa
    const parts = nn.split(' ');
    if (parts.length === 1 && nn.length >= 5) {
      // Single name like "Ronaldinho", "Pele", "Eusebio"
      for (const [key, entries] of pdbByNorm) {
        if (key.includes(nn) || nn.includes(key)) {
          if (entries.length === 1) return entries[0];
          if (nationality) {
            const byNat = entries.filter(
              (p) => normalizeName(p.nationality) === normalizeName(nationality),
            );
            if (byNat.length === 1) return byNat[0];
          }
        }
      }
    }

    return null;
  }

  // Build career_paths normalized index for match resolution
  const careerByNorm = new Map<string, CareerPathEntry>();
  for (const cp of careerPaths) {
    careerByNorm.set(normalizeName(cp.name), cp);
  }
  // Also index by last name
  const careerByLastName = new Map<string, CareerPathEntry[]>();
  for (const cp of careerPaths) {
    const ln = getLastName(normalizeName(cp.name));
    if (!careerByLastName.has(ln)) careerByLastName.set(ln, []);
    careerByLastName.get(ln)!.push(cp);
  }

  // Match lineups: try normalized, last name, reversed, and word-set matching
  function findMatchPlayer(name: string): { pdbId: number | null; careerId: number | null } | null {
    const nn = normalizeName(name);
    if (!nn) return null;

    // Exact match in players_db
    const exact = pdbByNorm.get(nn);
    if (exact) return { pdbId: exact[0].id, careerId: null };

    // Try reversed name in players_db
    const parts = nn.split(' ');
    if (parts.length >= 2) {
      const reversed = [...parts].reverse().join(' ');
      const revMatch = pdbByNorm.get(reversed);
      if (revMatch) return { pdbId: revMatch[0].id, careerId: null };
    }

    // Exact match in career_paths
    const careerExact = careerByNorm.get(nn);
    if (careerExact) return { pdbId: null, careerId: careerExact.id };

    // Last name matching in players_db (4+ chars, unique match)
    const ln = getLastName(nn);
    if (ln.length >= 4) {
      const cands = pdbByLastName.get(ln);
      if (cands && cands.length === 1) return { pdbId: cands[0].id, careerId: null };

      // Last name in career_paths
      const careerCands = careerByLastName.get(ln);
      if (careerCands && careerCands.length === 1)
        return { pdbId: null, careerId: careerCands[0].id };
    }

    return null;
  }

  // 4. Resolve career_paths players
  console.log('\nResolving career_paths...');
  const resolvedPlayers: {
    global_id: number;
    players_db_id: number | null;
    career_paths_id: number | null;
    transfers_id: number | null;
    canonical_name: string;
    normalized_name: string;
    nationality: string;
  }[] = [];
  const unresolvedCareer: string[] = [];
  const unresolvedTransfers: string[] = [];

  // Track which players_db entries have been matched
  const matchedPdbIds = new Set<number>();
  // career_id -> players_db_id
  const careerToPdb = new Map<number, number>();

  for (const cp of careerPaths) {
    const match = findInPlayersDb(cp.name, cp.nationality, cp.position);
    if (match) {
      careerToPdb.set(cp.id, match.id);
      matchedPdbIds.add(match.id);
    } else {
      unresolvedCareer.push(cp.name);
    }
  }

  console.log(`  Resolved: ${careerToPdb.size} / ${careerPaths.length}`);
  console.log(`  Unresolved: ${unresolvedCareer.length}`);

  // 5. Resolve transfers (same IDs as career_paths)
  console.log('\nResolving transfers...');
  const transferToPdb = new Map<number, number>();

  for (const tr of transfers) {
    // Since career_paths and transfers share IDs, check if already resolved
    if (careerToPdb.has(tr.player_id)) {
      transferToPdb.set(tr.player_id, careerToPdb.get(tr.player_id)!);
    } else {
      const match = findInPlayersDb(tr.player_name);
      if (match) {
        transferToPdb.set(tr.player_id, match.id);
        matchedPdbIds.add(match.id);
      } else {
        unresolvedTransfers.push(tr.player_name);
      }
    }
  }

  console.log(`  Resolved: ${transferToPdb.size} / ${transfers.length}`);
  console.log(`  Unresolved: ${unresolvedTransfers.length}`);

  // 6. Resolve match lineup players
  console.log('\nResolving match lineup players...');
  const allMatchNames = new Set<string>();
  for (const m of matches) {
    for (const n of m.lineup_a_names) allMatchNames.add(n);
    for (const n of m.lineup_b_names) allMatchNames.add(n);
  }

  // matchName -> { pdbId, careerId }
  const matchNameResolved = new Map<string, { pdbId: number | null; careerId: number | null }>();
  const unresolvedMatchNames: string[] = [];

  for (const name of allMatchNames) {
    const match = findMatchPlayer(name);
    if (match) {
      matchNameResolved.set(name, match);
    } else {
      unresolvedMatchNames.push(name);
    }
  }

  console.log(`  Unique names: ${allMatchNames.size}`);
  console.log(`  Resolved: ${matchNameResolved.size} / ${allMatchNames.size}`);
  console.log(`  Unresolved: ${unresolvedMatchNames.length}`);

  // 7. Build unified player records
  console.log('\nBuilding unified player records...');

  let globalIdCounter = 1;

  // First: add all resolved career/transfer players
  const pdbIdToGlobal = new Map<number, number>();

  for (const cp of careerPaths) {
    const pdbId = careerToPdb.get(cp.id) ?? null;
    let globalId: number;

    if (pdbId !== null && pdbIdToGlobal.has(pdbId)) {
      globalId = pdbIdToGlobal.get(pdbId)!;
    } else {
      globalId = globalIdCounter++;
      if (pdbId !== null) pdbIdToGlobal.set(pdbId, globalId);
    }

    const pdbEntry = pdbId !== null ? playersDb.find((p) => p.id === pdbId) : null;

    resolvedPlayers.push({
      global_id: globalId,
      players_db_id: pdbId,
      career_paths_id: cp.id,
      transfers_id: cp.id, // same as career_paths
      canonical_name: pdbEntry ? pdbEntry.name : cp.name,
      normalized_name: normalizeName(pdbEntry ? pdbEntry.name : cp.name),
      nationality: cp.nationality,
    });
  }

  // Add remaining players_db entries that weren't matched
  for (const p of playersDb) {
    if (!pdbIdToGlobal.has(p.id)) {
      const globalId = globalIdCounter++;
      pdbIdToGlobal.set(p.id, globalId);
      resolvedPlayers.push({
        global_id: globalId,
        players_db_id: p.id,
        career_paths_id: null,
        transfers_id: null,
        canonical_name: p.name,
        normalized_name: normalizeName(p.name),
        nationality: p.nationality,
      });
    }
  }

  // 8. Build club mapping
  console.log('\nBuilding club mapping...');
  const clubNameSet = new Set<string>();
  const clubSourceMap = new Map<string, Set<string>>(); // original name -> sources
  const clubLeagueMap = new Map<string, string>(); // canonical -> league

  function trackClub(name: string, source: string, league?: string) {
    if (!name) return;
    const trimmed = name.trim();
    clubNameSet.add(trimmed);
    if (!clubSourceMap.has(trimmed)) clubSourceMap.set(trimmed, new Set());
    clubSourceMap.get(trimmed)!.add(source);
    if (league) {
      const canonical = canonicalizeClub(trimmed);
      if (!clubLeagueMap.has(canonical)) clubLeagueMap.set(canonical, league);
    }
  }

  for (const p of playersDb) {
    trackClub(p.current_team, 'players_db', p.league);
  }
  for (const cp of careerPaths) {
    for (const s of cp.career) trackClub(s.club, 'career_paths');
  }
  for (const tr of transfers) {
    for (const s of tr.transfers) trackClub(s.club_name, 'transfers');
  }

  // Group all name variations by canonical name
  const canonicalToAliases = new Map<string, Set<string>>();
  for (const name of clubNameSet) {
    const canonical = canonicalizeClub(name);
    if (!canonicalToAliases.has(canonical)) canonicalToAliases.set(canonical, new Set());
    canonicalToAliases.get(canonical)!.add(name);
  }

  // Determine country from league
  function countryFromLeague(league: string): string {
    const l = league.toLowerCase();
    if (l.includes('premier league') || l.includes('championship')) return 'England';
    if (l.includes('la liga') || l.includes('segunda')) return 'Spain';
    if (l.includes('serie a') || l.includes('serie b')) return 'Italy';
    if (l.includes('bundesliga') || l.includes('2. bundesliga')) return 'Germany';
    if (l.includes('ligue 1') || l.includes('ligue 2')) return 'France';
    if (l.includes('primeira liga') || l.includes('liga portugal')) return 'Portugal';
    if (l.includes('eredivisie')) return 'Netherlands';
    if (l.includes('super lig')) return 'Turkey';
    if (l.includes('scottish')) return 'Scotland';
    if (l.includes('jupiler') || l.includes('pro league')) return 'Belgium';
    if (l.includes('mls')) return 'USA';
    return '';
  }

  const clubs: {
    global_club_id: string;
    canonical_name: string;
    aliases: string[];
    league: string;
    country: string;
  }[] = [];

  for (const [canonical, aliases] of canonicalToAliases) {
    const league = clubLeagueMap.get(canonical) || '';
    clubs.push({
      global_club_id: generateClubId(canonical),
      canonical_name: canonical,
      aliases: [...aliases].filter((a) => a !== canonical).sort(),
      league,
      country: league ? countryFromLeague(league) : '',
    });
  }

  clubs.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));

  // 9. Write output files
  console.log('\nWriting output files...');

  const stats = {
    total_unique_players: resolvedPlayers.length,
    career_resolved: careerToPdb.size,
    career_unresolved: unresolvedCareer.length,
    transfers_resolved: transferToPdb.size,
    transfers_unresolved: unresolvedTransfers.length,
    match_players_total: allMatchNames.size,
    match_players_resolved: matchNameResolved.size,
    match_players_unresolved: unresolvedMatchNames.length,
  };

  const playerIdMap = {
    resolved_players: resolvedPlayers,
    unresolved_career: unresolvedCareer,
    unresolved_transfers: unresolvedTransfers,
    unresolved_match_players: unresolvedMatchNames.sort(),
    stats,
  };

  const clubIdMap = {
    clubs,
    stats: {
      total_clubs: clubs.length,
      total_aliases: [...clubNameSet].length,
    },
  };

  writeFileSync(resolve(ROOT, 'data/player_id_map.json'), JSON.stringify(playerIdMap, null, 2));
  writeFileSync(resolve(ROOT, 'data/club_id_map.json'), JSON.stringify(clubIdMap, null, 2));

  // 10. Print stats
  console.log('\n=== Resolution Statistics ===');
  console.log(`Total unique players (global): ${stats.total_unique_players}`);
  console.log(
    `Career paths resolved:  ${stats.career_resolved} / ${careerPaths.length} (${((stats.career_resolved / careerPaths.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Transfers resolved:     ${stats.transfers_resolved} / ${transfers.length} (${((stats.transfers_resolved / transfers.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Match players resolved: ${stats.match_players_resolved} / ${stats.match_players_total} (${((stats.match_players_resolved / stats.match_players_total) * 100).toFixed(1)}%)`,
  );
  console.log(`Total clubs:            ${clubIdMap.stats.total_clubs}`);

  if (unresolvedCareer.length > 0) {
    console.log(`\nUnresolved career players (${unresolvedCareer.length}):`);
    for (const n of unresolvedCareer.slice(0, 20)) console.log(`  - ${n}`);
    if (unresolvedCareer.length > 20) console.log(`  ... and ${unresolvedCareer.length - 20} more`);
  }

  if (unresolvedMatchNames.length > 0) {
    console.log(`\nUnresolved match players (${unresolvedMatchNames.length}):`);
    for (const n of unresolvedMatchNames.sort().slice(0, 20)) console.log(`  - ${n}`);
    if (unresolvedMatchNames.length > 20)
      console.log(`  ... and ${unresolvedMatchNames.length - 20} more`);
  }

  console.log('\nDone! Output files:');
  console.log('  data/player_id_map.json');
  console.log('  data/club_id_map.json');
}

main();
