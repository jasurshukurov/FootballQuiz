import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GridCategory, GridCategoryKind } from '@/lib/gridEngine';
import TeamCrest from '@/components/ui/TeamCrest';
import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface GridHeaderCellProps {
  category: GridCategory;
  /** 'col' = top header (flex width), 'row' = left header (fixed width). */
  axis: 'col' | 'row';
}

/** Width of the left row-header rail — kept small so the 3 cells stay >= ~96pt
 *  on a 390pt phone. Imported by the screen for the corner spacer. */
export const ROW_HEADER_WIDTH = 58;

/** Kickers for the narrow left rail — the full ones ("PLAYED FOR") don't fit
 *  58pt and RN-web ignores adjustsFontSizeToFit. */
const SHORT_KICKER: Record<GridCategoryKind, string> = {
  club: 'CLUB',
  nationality: 'NATION',
  league: 'LEAGUE',
  position: 'ROLE',
  value: 'VALUE',
};

/**
 * Compact mixed-kind grid header: crest for clubs, flag for nations, and a
 * micro kicker ("PLAYED FOR" / "NATION" / "PLAYS IN" / "POSITION" / "VALUED")
 * so a mixed board stays self-explanatory at a glance.
 */
function GridHeaderCell({ category, axis }: GridHeaderCellProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.base, axis === 'row' ? layout.row : layout.col]}>
      <Text style={styles.kicker} numberOfLines={1}>
        {axis === 'row' ? SHORT_KICKER[category.kind] : category.kicker}
      </Text>
      {category.kind === 'club' && category.crestTeam ? (
        <TeamCrest teamName={category.crestTeam} size={18} />
      ) : null}
      {category.kind === 'nationality' && category.flag ? (
        <Text style={layout.flag}>{category.flag}</Text>
      ) : null}
      <Text style={styles.label} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
        {category.label}
      </Text>
    </View>
  );
}

export default React.memo(GridHeaderCell);

const layout = StyleSheet.create({
  col: {
    flex: 1,
    minWidth: 0,
    minHeight: 68,
  },
  row: {
    width: ROW_HEADER_WIDTH,
    alignSelf: 'stretch',
  },
  flag: {
    ...type.body,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: spacing.xs,
      paddingHorizontal: 2,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    kicker: {
      ...type.micro,
      letterSpacing: 0.8,
      color: c.textMuted,
    },
    label: {
      ...type.micro,
      textAlign: 'center',
      color: c.textPrimary,
    },
  });
