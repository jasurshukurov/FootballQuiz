import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { GuessResult } from '@/types/game';
import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { formatPosition, formatNationality } from '@/lib/footballMappers';
import AttributeCell from './AttributeCell';
import PopInView from './PopInView';

const COUNTRY_CODE_MAP: Record<string, string> = {
  England: 'GB',
  Scotland: 'GB',
  Wales: 'GB',
  'Northern Ireland': 'GB',
  'United States': 'US',
  'South Korea': 'KR',
  'North Korea': 'KP',
  'Czech Republic': 'CZ',
  'Ivory Coast': 'CI',
  'DR Congo': 'CD',
  'Bosnia and Herzegovina': 'BA',
  'Trinidad and Tobago': 'TT',
  'Cape Verde': 'CV',
  'Republic of Ireland': 'IE',
  Iran: 'IR',
  'North Macedonia': 'MK',
  Curaçao: 'CW',
  'Guinea-Bissau': 'GW',
  'São Tomé and Príncipe': 'ST',
  'Equatorial Guinea': 'GQ',
  'Central African Republic': 'CF',
  'Chinese Taipei': 'TW',
  'Hong Kong': 'HK',
  Kosovo: 'XK',
};

function countryToFlag(nationality: string): string {
  // Check special cases first
  const specialCode = COUNTRY_CODE_MAP[nationality];
  if (specialCode) {
    return String.fromCodePoint(
      ...specialCode.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
    );
  }

  // For most countries, use the ISO 3166-1 alpha-2 derived from Intl
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const codes =
      'AD,AE,AF,AG,AI,AL,AM,AO,AR,AS,AT,AU,AW,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BM,BN,BO,BR,BS,BT,BW,BY,BZ,CA,CD,CF,CG,CH,CI,CL,CM,CN,CO,CR,CU,CV,CW,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,ER,ES,ET,FI,FJ,FM,FO,FR,GA,GD,GE,GH,GM,GN,GP,GQ,GR,GT,GW,GY,HK,HN,HR,HT,HU,ID,IE,IL,IN,IQ,IR,IS,IT,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MG,MK,ML,MM,MN,MO,MR,MT,MU,MV,MW,MX,MY,MZ,NA,NE,NG,NI,NL,NO,NP,NR,NZ,OM,PA,PE,PG,PH,PK,PL,PT,PW,PY,QA,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SI,SK,SL,SM,SN,SO,SR,SS,ST,SV,SY,SZ,TD,TG,TH,TJ,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,US,UY,UZ,VA,VC,VE,VN,VU,WS,XK,YE,ZA,ZM,ZW'.split(
        ',',
      );
    for (const code of codes) {
      try {
        const name = regionNames.of(code);
        if (name && name.toLowerCase() === nationality.toLowerCase()) {
          return String.fromCodePoint(...code.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
        }
      } catch {}
    }
  } catch {}

  return '';
}

interface PlayerCardProps {
  guess: GuessResult;
}

function PlayerCard({ guess }: PlayerCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { player, comparisons } = guess;

  return (
    <PopInView>
      <View style={styles.container}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {countryToFlag(player.nationality)} {player.name}
          </Text>
          {player.status === 'retired' && (
            <View style={styles.retiredBadge}>
              <Text style={styles.retiredBadgeText}>
                {player.retired_year
                  ? `RETIRED '${String(player.retired_year).slice(-2)}`
                  : 'RETIRED'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.row}>
          <View style={styles.cell}>
            <AttributeCell
              label="Team"
              value={comparisons.team.guessValue}
              status={comparisons.team.status}
              delay={0}
            />
          </View>
          <View style={styles.cell}>
            <AttributeCell
              label="League"
              value={comparisons.league.guessValue}
              status={comparisons.league.status}
              delay={100}
            />
          </View>
          <View style={styles.cell}>
            <AttributeCell
              label="Nat"
              value={formatNationality(comparisons.nationality.guessValue)}
              status={comparisons.nationality.status}
              delay={200}
            />
          </View>
          <View style={styles.cell}>
            <AttributeCell
              label="Pos"
              value={formatPosition(comparisons.position.guessValue)}
              status={comparisons.position.status}
              delay={300}
            />
          </View>
          <View style={styles.cell}>
            <AttributeCell
              label="Age"
              value={comparisons.age.guessValue}
              status={comparisons.age.status}
              delay={400}
            />
          </View>
        </View>
      </View>
    </PopInView>
  );
}

export default React.memo(PlayerCard);

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: c.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    nameRow: {
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    name: {
      ...type.h3,
      color: c.textPrimary,
    },
    retiredBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: c.streakSoft,
      borderWidth: 1,
      borderColor: c.streak,
    },
    retiredBadgeText: {
      ...type.micro,
      color: c.streakBright,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    cell: {
      flex: 1,
    },
  });
