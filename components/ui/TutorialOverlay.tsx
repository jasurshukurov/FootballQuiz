import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import GlassCard from '@/components/ui/GlassCard';
import RetroButton from '@/components/ui/RetroButton';
import { useTutorialStore } from '@/hooks/useTutorialStore';
import { colors, fonts } from '@/constants/theme';

const ICON_MAP: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  'who-are-ya': 'futbol-o',
  careerpath: 'road',
  grid: 'th',
  missing11: 'users',
  connections: 'link',
  higherlower: 'arrows-v',
  agent: 'money',
  blindranking: 'sort-amount-desc',
  careertimeline: 'road',
  marketmovers: 'line-chart',
  guessmatch: 'flag-checkered',
  toplists: 'list-ol',
};

interface TutorialOverlayProps {
  modeKey: string;
  title: string;
  description: string;
}

export default function TutorialOverlay({ modeKey, title, description }: TutorialOverlayProps) {
  const seen = useTutorialStore((s) => !!s.seenTutorials[modeKey]);
  const markSeen = useTutorialStore((s) => s.markSeen);

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.05, { duration: 800 }), withTiming(1.0, { duration: 800 })),
      -1,
      true,
    );
  }, [scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (seen) {
    return null;
  }

  const iconName = ICON_MAP[modeKey] ?? 'question';

  const handleDismiss = () => {
    markSeen(modeKey);
  };

  return (
    <View style={styles.backdrop}>
      <GlassCard style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <FontAwesome name={iconName} size={36} color={colors.pitchGreen} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <Animated.View style={pulseStyle}>
            <RetroButton title="LET'S PLAY" onPress={handleDismiss} />
          </Animated.View>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
  },
  content: {
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(5,242,108,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(5,242,108,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    letterSpacing: 2,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    textAlign: 'center',
    lineHeight: 22,
  },
});
