import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PopInView from '@/components/ui/PopInView';
import { colors, spacing, borderRadius, fonts } from '@/constants/theme';
import { JerseyIcon } from '@/components/career/JerseyIcon';

export interface ClubStyle {
  primary: string;
  secondary?: string;
  pattern?: 'solid' | 'stripes' | 'hoops' | 'halves' | 'sash';
}

interface CareerClubCardProps {
  club: string;
  from?: number;
  to?: number;
  showYears: boolean;
  index: number;
  isSorted: boolean;
}

function CareerClubCardInner({ club, from, to, showYears, index }: CareerClubCardProps) {
  const style = getClubStyle(club);
  return (
    <PopInView delay={index * 100}>
      <View style={styles.card}>
        <View style={[styles.accent, { backgroundColor: style.primary }]} />
        <View style={styles.jerseyWrapper}>
          <JerseyIcon
            primary={style.primary}
            secondary={style.secondary}
            pattern={style.pattern}
            width={36}
            height={36}
          />
        </View>
        <Text
          style={styles.clubName}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={2}>
          {club.toUpperCase()}
        </Text>
        {showYears && from != null && to != null && (
          <Text style={styles.years}>
            {from}-{to}
          </Text>
        )}
        <View style={styles.dragGrip}>
          <Text style={styles.gripDot}>⋮</Text>
          <Text style={styles.gripDot}>⋮</Text>
        </View>
      </View>
    </PopInView>
  );
}

const CLUB_COLORS: Record<string, ClubStyle> = {
  // Premier League
  'manchester united': { primary: '#DA291C' },
  'manchester city': { primary: '#6CADDF' },
  liverpool: { primary: '#C8102E' },
  chelsea: { primary: '#034694' },
  arsenal: { primary: '#EF0107' },
  tottenham: { primary: '#132257' },
  newcastle: { primary: '#241F20', secondary: '#FFFFFF', pattern: 'stripes' },
  'aston villa': { primary: '#670E36' },
  'west ham': { primary: '#7A263A' },
  brighton: { primary: '#0057B8' },
  wolverhampton: { primary: '#FDB913' },
  wolves: { primary: '#FDB913' },
  'crystal palace': { primary: '#1B458F' },
  everton: { primary: '#003399' },
  fulham: { primary: '#CC0000' },
  brentford: { primary: '#E30613' },
  bournemouth: { primary: '#DA291C' },
  'nottingham forest': { primary: '#DD0000' },
  leicester: { primary: '#003090' },
  southampton: { primary: '#D71920' },
  ipswich: { primary: '#0044AA' },
  burnley: { primary: '#6C1D45' },
  luton: { primary: '#F78F1E' },
  'sheffield united': { primary: '#EE2737', secondary: '#FFFFFF', pattern: 'stripes' },
  leeds: { primary: '#FFCD00' },
  sunderland: { primary: '#EB172B', secondary: '#FFFFFF', pattern: 'stripes' },
  stoke: { primary: '#E03A3E', secondary: '#FFFFFF', pattern: 'stripes' },
  blackburn: { primary: '#009EE0', secondary: '#FFFFFF', pattern: 'halves' },
  // La Liga
  barcelona: { primary: '#A50044', secondary: '#004D98', pattern: 'stripes' },
  'real madrid': { primary: '#FEBE10' },
  'atletico madrid': { primary: '#CB3524', secondary: '#FFFFFF', pattern: 'stripes' },
  sevilla: { primary: '#D4002A' },
  valencia: { primary: '#EE1900' },
  villarreal: { primary: '#FFCD00' },
  'real sociedad': { primary: '#143C8B', secondary: '#FFFFFF', pattern: 'stripes' },
  'real betis': { primary: '#00954C' },
  'athletic bilbao': { primary: '#EE2523' },
  'athletic club': { primary: '#EE2523' },
  celta: { primary: '#8AC3EE' },
  getafe: { primary: '#004FA3' },
  osasuna: { primary: '#0A346F' },
  mallorca: { primary: '#E20613' },
  girona: { primary: '#CD2534' },
  alaves: { primary: '#003DA5' },
  'las palmas': { primary: '#FFE400' },
  cadiz: { primary: '#FFCC00' },
  almeria: { primary: '#EE1119' },
  granada: { primary: '#EE1133' },
  espanyol: { primary: '#007FC8' },
  'rayo vallecano': { primary: '#E53027' },
  // Bundesliga
  bayern: { primary: '#DC052D' },
  'borussia dortmund': { primary: '#FDE100' },
  dortmund: { primary: '#FDE100' },
  'bayer leverkusen': { primary: '#E32221' },
  leverkusen: { primary: '#E32221' },
  'rb leipzig': { primary: '#DD0741' },
  leipzig: { primary: '#DD0741' },
  'eintracht frankfurt': { primary: '#E1000F' },
  frankfurt: { primary: '#E1000F' },
  wolfsburg: { primary: '#65B32E' },
  freiburg: { primary: '#E30613' },
  hoffenheim: { primary: '#1961B5' },
  'borussia monchengladbach': { primary: '#000000' },
  monchengladbach: { primary: '#18A950' },
  gladbach: { primary: '#18A950' },
  'union berlin': { primary: '#EB1923' },
  'werder bremen': { primary: '#1D9053' },
  bremen: { primary: '#1D9053' },
  mainz: { primary: '#ED1C24' },
  augsburg: { primary: '#BA3733' },
  stuttgart: { primary: '#E32219' },
  koln: { primary: '#ED1C24' },
  cologne: { primary: '#ED1C24' },
  schalke: { primary: '#004D9D' },
  hamburg: { primary: '#0A3E69' },
  hertha: { primary: '#005CA9' },
  // Serie A
  juventus: { primary: '#000000', secondary: '#FFFFFF', pattern: 'stripes' },
  'ac milan': { primary: '#FB090B', secondary: '#000000', pattern: 'stripes' },
  milan: { primary: '#FB090B', secondary: '#000000', pattern: 'stripes' },
  'inter milan': { primary: '#009BDB', secondary: '#000000', pattern: 'stripes' },
  inter: { primary: '#009BDB', secondary: '#000000', pattern: 'stripes' },
  internazionale: { primary: '#009BDB', secondary: '#000000', pattern: 'stripes' },
  napoli: { primary: '#12A0D7' },
  roma: { primary: '#F0BC42' },
  lazio: { primary: '#87D8F7', secondary: '#FFFFFF', pattern: 'stripes' },
  atalanta: { primary: '#1E71B8', secondary: '#000000', pattern: 'stripes' },
  fiorentina: { primary: '#482E92' },
  torino: { primary: '#8B0000' },
  bologna: { primary: '#1A2F48', secondary: '#E3001B', pattern: 'halves' },
  udinese: { primary: '#000000' },
  sassuolo: { primary: '#00A650' },
  monza: { primary: '#CE0A15' },
  empoli: { primary: '#005BA6' },
  cagliari: { primary: '#A51E36', secondary: '#003DA5', pattern: 'halves' },
  lecce: { primary: '#FFED00' },
  genoa: { primary: '#991E2E', secondary: '#003DA5', pattern: 'halves' },
  sampdoria: { primary: '#005BA6' },
  salernitana: { primary: '#8B0000' },
  verona: { primary: '#FFED00' },
  parma: { primary: '#FFED00' },
  como: { primary: '#005EB8' },
  venezia: { primary: '#FC6C12' },
  // Ligue 1
  'paris saint-germain': { primary: '#004170' },
  psg: { primary: '#004170' },
  marseille: { primary: '#2FAEE0' },
  lyon: { primary: '#004170' },
  'olympique lyonnais': { primary: '#004170' },
  monaco: { primary: '#E7192E' },
  lille: { primary: '#E2001A' },
  nice: { primary: '#000000' },
  rennes: { primary: '#E3051B' },
  lens: { primary: '#FFE100' },
  strasbourg: { primary: '#009FE3' },
  nantes: { primary: '#FCD116' },
  montpellier: { primary: '#FF6900' },
  toulouse: { primary: '#6A2382' },
  reims: { primary: '#E2001A' },
  brest: { primary: '#E2001A' },
  clermont: { primary: '#CB333B' },
  lorient: { primary: '#F47920' },
  metz: { primary: '#8B0000' },
  'saint-etienne': { primary: '#00A650' },
  // Portuguese Liga
  benfica: { primary: '#FF0000' },
  porto: { primary: '#003DA5' },
  sporting: { primary: '#008B45', secondary: '#FFFFFF', pattern: 'stripes' },
  braga: { primary: '#D40519' },
  vitoria: { primary: '#000000' },
  guimaraes: { primary: '#FFFFFF' },
  // Eredivisie
  ajax: { primary: '#D2122E' },
  psv: { primary: '#ED1C24', secondary: '#FFFFFF', pattern: 'stripes' },
  feyenoord: { primary: '#EE1C25', secondary: '#FFFFFF', pattern: 'halves' },
  'az alkmaar': { primary: '#ED1C24' },
  twente: { primary: '#ED1C24' },
  // South America
  'boca juniors': { primary: '#003DA5' },
  'river plate': { primary: '#FFFFFF', secondary: '#E3001B', pattern: 'sash' },
  flamengo: { primary: '#E3001B' },
  palmeiras: { primary: '#006437' },
  santos: { primary: '#000000' },
  'sao paulo': { primary: '#FF0000' },
  corinthians: { primary: '#000000' },
  gremio: { primary: '#0062AC' },
  cruzeiro: { primary: '#003DA5' },
  'atletico mineiro': { primary: '#000000' },
  penarol: { primary: '#FDD116' },
  nacional: { primary: '#E3001B' },
  independiente: { primary: '#E3001B' },
  racing: { primary: '#75BBDC', secondary: '#FFFFFF', pattern: 'stripes' },
  'san lorenzo': { primary: '#003DA5' },
  'colo-colo': { primary: '#000000' },
  'universidad de chile': { primary: '#0033A0' },
  fluminense: { primary: '#7B2D41' },
  botafogo: { primary: '#000000' },
  vasco: { primary: '#000000', secondary: '#FFFFFF', pattern: 'sash' },
  internacional: { primary: '#E3001B' },
  // Other notable clubs
  celtic: { primary: '#008B45', secondary: '#FFFFFF', pattern: 'hoops' },
  rangers: { primary: '#003DA5' },
  galatasaray: { primary: '#FDB913', secondary: '#E3001B', pattern: 'halves' },
  fenerbahce: { primary: '#FFED00', secondary: '#00337F', pattern: 'stripes' },
  besiktas: { primary: '#000000' },
  olympiacos: { primary: '#E3001B' },
  panathinaikos: { primary: '#008B45' },
  'red star belgrade': { primary: '#E3001B', secondary: '#FFFFFF', pattern: 'stripes' },
  'dinamo zagreb': { primary: '#1C4FA1' },
  shakhtar: { primary: '#FC6C12' },
  'dynamo kyiv': { primary: '#FFFFFF' },
  zenit: { primary: '#009FE3' },
  'spartak moscow': { primary: '#E3001B' },
  anderlecht: { primary: '#660099' },
  'club brugge': { primary: '#005BA6', secondary: '#000000', pattern: 'stripes' },
  salzburg: { primary: '#E3001B' },
  'rapid vienna': { primary: '#008B45' },
  basel: { primary: '#E3001B' },
  'young boys': { primary: '#FFE100' },
  malmo: { primary: '#75BBDC' },
};

export function getClubStyle(club: string): ClubStyle {
  const name = club.toLowerCase();
  const exact = CLUB_COLORS[name];
  if (exact) return exact;

  // Prefer longest matching key to avoid "inter milan" matching "milan" (AC Milan)
  let bestMatch: ClubStyle | null = null;
  let bestLen = 0;
  for (const [key, style] of Object.entries(CLUB_COLORS)) {
    if (name.includes(key) || key.includes(name)) {
      if (key.length > bestLen) {
        bestLen = key.length;
        bestMatch = style;
      }
    }
  }
  return bestMatch ?? { primary: '#00BFFF' };
}

export const CareerClubCard = React.memo(CareerClubCardInner);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,17,40,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    minHeight: 52,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  jerseyWrapper: {
    marginLeft: spacing.lg,
    marginRight: spacing.md,
  },
  clubName: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
    letterSpacing: 1,
  },
  years: {
    fontSize: 13,
    fontFamily: fonts.scoreboard,
    color: colors.pitchGreen,
    marginLeft: spacing.sm,
  },
  dragGrip: {
    flexDirection: 'row',
    marginLeft: spacing.sm,
    marginRight: spacing.md,
    gap: -4,
  },
  gripDot: {
    fontSize: 18,
    color: colors.steelGray,
    letterSpacing: -2,
  },
});
