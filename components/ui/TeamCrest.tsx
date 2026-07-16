import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { getTeamColors } from '@/data/teamColors';
import { useClubLogoUrl } from '@/lib/clubLogos';
import { getFlagEmoji } from '@/lib/countryFlags';
import { useThemeColors } from '@/hooks/useTheme';

interface TeamCrestProps {
  teamName: string;
  size?: number;
}

export default function TeamCrest({ teamName, size = 24 }: TeamCrestProps) {
  const colors = useThemeColors();
  // primary/secondary are real-world club colors (data, not theme).
  const { primary, secondary, pattern = 'circle' } = getTeamColors(teamName);
  // Real crest, if the remote kill switch for this platform is on and the
  // CDN manifest maps this club. Null otherwise → generic shield below.
  const logoUrl = useClubLogoUrl(teamName);

  // National teams show their actual flag (Unicode emoji, IP-free) instead of
  // the generic club shield. fontSize here is crest geometry scaled off the
  // size prop, like the shield dims below — not typography.
  const flag = getFlagEmoji(teamName);
  if (flag) {
    return (
      <View style={[styles.flagBox, { width: size, height: size * 1.15 }]}>
        <Text
          style={{ fontSize: size * 0.82, lineHeight: size * 1.15 }}
          allowFontScaling={false}
          accessibilityLabel={`${teamName} flag`}>
          {flag}
        </Text>
      </View>
    );
  }

  if (logoUrl) {
    // Real crests sit on a light chip: many badges are dark-on-transparent
    // and would blend into the dark theme background. Fixed light ground —
    // crest colors are real-world data, not themed.
    return (
      <View
        style={[
          styles.crestChip,
          {
            width: size,
            height: size * 1.15,
            borderRadius: size * 0.22,
            borderColor: colors.borderStrong,
          },
        ]}>
        <Image
          source={{ uri: logoUrl }}
          resizeMode="contain"
          style={{ width: size * 0.78, height: size * 0.92 }}
          accessibilityLabel={`${teamName} crest`}
        />
      </View>
    );
  }

  const shieldStyle = {
    width: size,
    height: size * 1.15,
    borderRadius: size * 0.15,
    borderBottomLeftRadius: size * 0.5,
    borderBottomRightRadius: size * 0.5,
    backgroundColor: primary,
    borderColor: colors.borderStrong,
  };

  return (
    <View style={[styles.shield, shieldStyle]}>
      {pattern === 'stripe' && (
        <View
          style={[
            styles.stripe,
            {
              backgroundColor: secondary,
              width: size * 0.3,
              left: size * 0.35,
            },
          ]}
        />
      )}
      {pattern === 'chevron' && (
        <View
          style={[
            styles.chevron,
            {
              borderLeftWidth: size * 0.5,
              borderRightWidth: size * 0.5,
              borderBottomWidth: size * 0.5,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: secondary,
              top: size * 0.15,
            },
          ]}
        />
      )}
      {pattern === 'halves' && (
        <View
          style={[
            styles.halves,
            {
              backgroundColor: secondary,
              width: size * 0.5,
            },
          ]}
        />
      )}
      {pattern === 'circle' && (
        <View
          style={[
            styles.circle,
            {
              backgroundColor: secondary,
              width: size * 0.45,
              height: size * 0.45,
              borderRadius: size * 0.225,
              top: (size * 1.15 - size * 0.45) / 2,
              left: (size - size * 0.45) / 2,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flagBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestChip: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8F5',
    borderWidth: 1,
  },
  shield: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  stripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  chevron: {
    position: 'absolute',
    alignSelf: 'center',
    width: 0,
    height: 0,
  },
  halves: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
  },
});
