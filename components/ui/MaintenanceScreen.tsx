import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface MaintenanceScreenProps {
  message?: string;
}

export default function MaintenanceScreen({ message }: MaintenanceScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🏟️</Text>
      <Text style={styles.title}>Locker Room Renovation</Text>
      <Text style={styles.subtitle}>
        {message || 'We are performing scheduled maintenance. Please check back soon!'}
      </Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>The pitch is being prepared for you.</Text>
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgBase,
      paddingHorizontal: spacing.xxl,
    },
    emoji: {
      marginBottom: spacing.lg,
      fontSize: type.display.fontSize,
    },
    title: {
      ...type.h2,
      marginBottom: spacing.sm,
      textAlign: 'center',
      color: c.accent,
    },
    subtitle: {
      ...type.body,
      marginBottom: spacing.xl,
      textAlign: 'center',
      color: c.textSecondary,
    },
    infoBox: {
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    infoText: {
      ...type.caption,
      textAlign: 'center',
      color: c.textMuted,
    },
  });
