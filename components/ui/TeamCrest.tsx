import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getTeamColors } from '@/data/teamColors';

interface TeamCrestProps {
  teamName: string;
  size?: number;
}

export default function TeamCrest({ teamName, size = 24 }: TeamCrestProps) {
  const { primary, secondary, pattern = 'circle' } = getTeamColors(teamName);

  const shieldStyle = {
    width: size,
    height: size * 1.15,
    borderRadius: size * 0.15,
    borderBottomLeftRadius: size * 0.5,
    borderBottomRightRadius: size * 0.5,
    backgroundColor: primary,
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
  shield: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
