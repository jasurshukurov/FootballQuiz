type TeamPattern = 'chevron' | 'stripe' | 'halves' | 'circle';

interface TeamColor {
  primary: string;
  secondary: string;
  pattern?: TeamPattern;
}

export const teamColors: Record<string, TeamColor> = {
  // Premier League
  'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B', pattern: 'stripe' },
  'Manchester United': { primary: '#DA291C', secondary: '#FBE122', pattern: 'chevron' },
  Arsenal: { primary: '#EF0107', secondary: '#FFFFFF', pattern: 'halves' },
  Liverpool: { primary: '#C8102E', secondary: '#00B2A9', pattern: 'chevron' },
  Chelsea: { primary: '#034694', secondary: '#FFFFFF', pattern: 'circle' },
  'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF', pattern: 'stripe' },
  'Newcastle United': { primary: '#241F20', secondary: '#FFFFFF', pattern: 'stripe' },
  'Aston Villa': { primary: '#670E36', secondary: '#95BFE5', pattern: 'halves' },
  'West Ham United': { primary: '#7A263A', secondary: '#1BB1E7', pattern: 'stripe' },
  Brighton: { primary: '#0057B8', secondary: '#FFFFFF', pattern: 'stripe' },
  'Brighton & Hove Albion': { primary: '#0057B8', secondary: '#FFFFFF', pattern: 'stripe' },
  Wolverhampton: { primary: '#FDB913', secondary: '#231F20', pattern: 'halves' },
  'Wolverhampton Wanderers': { primary: '#FDB913', secondary: '#231F20', pattern: 'halves' },
  'Crystal Palace': { primary: '#1B458F', secondary: '#C4122E', pattern: 'stripe' },
  Brentford: { primary: '#E30613', secondary: '#FFFFFF', pattern: 'stripe' },
  Everton: { primary: '#003399', secondary: '#FFFFFF', pattern: 'circle' },
  Fulham: { primary: '#FFFFFF', secondary: '#000000', pattern: 'halves' },
  'Nottingham Forest': { primary: '#DD0000', secondary: '#FFFFFF', pattern: 'circle' },
  Bournemouth: { primary: '#DA291C', secondary: '#000000', pattern: 'stripe' },
  'AFC Bournemouth': { primary: '#DA291C', secondary: '#000000', pattern: 'stripe' },

  // La Liga
  'Real Madrid': { primary: '#FFFFFF', secondary: '#FEBE10', pattern: 'circle' },
  Barcelona: { primary: '#A50044', secondary: '#004D98', pattern: 'stripe' },
  'FC Barcelona': { primary: '#A50044', secondary: '#004D98', pattern: 'stripe' },
  'Atletico Madrid': { primary: '#CB3524', secondary: '#FFFFFF', pattern: 'stripe' },
  'Atletico de Madrid': { primary: '#CB3524', secondary: '#FFFFFF', pattern: 'stripe' },
  'Real Sociedad': { primary: '#143C8B', secondary: '#FFFFFF', pattern: 'stripe' },
  'Real Betis': { primary: '#00954C', secondary: '#FFFFFF', pattern: 'stripe' },
  Villarreal: { primary: '#FFE114', secondary: '#005DAA', pattern: 'circle' },
  'Villarreal CF': { primary: '#FFE114', secondary: '#005DAA', pattern: 'circle' },
  'Athletic Bilbao': { primary: '#EE2523', secondary: '#FFFFFF', pattern: 'stripe' },
  'Athletic Club': { primary: '#EE2523', secondary: '#FFFFFF', pattern: 'stripe' },
  Sevilla: { primary: '#FFFFFF', secondary: '#D7232E', pattern: 'circle' },
  'Sevilla FC': { primary: '#FFFFFF', secondary: '#D7232E', pattern: 'circle' },
  Valencia: { primary: '#FFFFFF', secondary: '#EE8707', pattern: 'halves' },
  'Valencia CF': { primary: '#FFFFFF', secondary: '#EE8707', pattern: 'halves' },

  // Bundesliga
  'Bayern Munich': { primary: '#DC052D', secondary: '#FFFFFF', pattern: 'chevron' },
  'FC Bayern Munich': { primary: '#DC052D', secondary: '#FFFFFF', pattern: 'chevron' },
  'Borussia Dortmund': { primary: '#FDE100', secondary: '#000000', pattern: 'circle' },
  'RB Leipzig': { primary: '#DD0741', secondary: '#FFFFFF', pattern: 'circle' },
  'Bayer Leverkusen': { primary: '#E32221', secondary: '#000000', pattern: 'circle' },
  'Bayer 04 Leverkusen': { primary: '#E32221', secondary: '#000000', pattern: 'circle' },
  'VfB Stuttgart': { primary: '#E32219', secondary: '#FFFFFF', pattern: 'circle' },
  'Eintracht Frankfurt': { primary: '#000000', secondary: '#E1000F', pattern: 'chevron' },
  'VfL Wolfsburg': { primary: '#65B32E', secondary: '#FFFFFF', pattern: 'circle' },
  'SC Freiburg': { primary: '#000000', secondary: '#E2001A', pattern: 'stripe' },
  'Borussia Monchengladbach': { primary: '#000000', secondary: '#FFFFFF', pattern: 'chevron' },

  // Serie A
  Inter: { primary: '#010E80', secondary: '#000000', pattern: 'stripe' },
  'Inter Milan': { primary: '#010E80', secondary: '#000000', pattern: 'stripe' },
  Milan: { primary: '#FB090B', secondary: '#000000', pattern: 'stripe' },
  'AC Milan': { primary: '#FB090B', secondary: '#000000', pattern: 'stripe' },
  Juventus: { primary: '#000000', secondary: '#FFFFFF', pattern: 'stripe' },
  Napoli: { primary: '#12A0D7', secondary: '#FFFFFF', pattern: 'circle' },
  'SSC Napoli': { primary: '#12A0D7', secondary: '#FFFFFF', pattern: 'circle' },
  Roma: { primary: '#8E1F2F', secondary: '#F0BC42', pattern: 'circle' },
  'AS Roma': { primary: '#8E1F2F', secondary: '#F0BC42', pattern: 'circle' },
  Lazio: { primary: '#87D8F7', secondary: '#FFFFFF', pattern: 'chevron' },
  'SS Lazio': { primary: '#87D8F7', secondary: '#FFFFFF', pattern: 'chevron' },
  Atalanta: { primary: '#1E71B8', secondary: '#000000', pattern: 'stripe' },
  Fiorentina: { primary: '#482F87', secondary: '#FFFFFF', pattern: 'circle' },
  'ACF Fiorentina': { primary: '#482F87', secondary: '#FFFFFF', pattern: 'circle' },

  // Ligue 1
  'Paris Saint-Germain': { primary: '#004170', secondary: '#DA291C', pattern: 'stripe' },
  PSG: { primary: '#004170', secondary: '#DA291C', pattern: 'stripe' },
  Marseille: { primary: '#2FAEE0', secondary: '#FFFFFF', pattern: 'chevron' },
  'Olympique Marseille': { primary: '#2FAEE0', secondary: '#FFFFFF', pattern: 'chevron' },
  Lyon: { primary: '#003DA5', secondary: '#ED1C24', pattern: 'halves' },
  'Olympique Lyon': { primary: '#003DA5', secondary: '#ED1C24', pattern: 'halves' },
  'Olympique Lyonnais': { primary: '#003DA5', secondary: '#ED1C24', pattern: 'halves' },
  Monaco: { primary: '#E7001E', secondary: '#FFFFFF', pattern: 'halves' },
  'AS Monaco': { primary: '#E7001E', secondary: '#FFFFFF', pattern: 'halves' },
  Lille: { primary: '#E0001A', secondary: '#FFFFFF', pattern: 'circle' },
  'LOSC Lille': { primary: '#E0001A', secondary: '#FFFFFF', pattern: 'circle' },
};

export function getTeamColors(teamName: string): TeamColor {
  return (
    teamColors[teamName] ?? {
      primary: '#6C757D',
      secondary: '#3A3A4A',
      pattern: 'circle' as TeamPattern,
    }
  );
}
