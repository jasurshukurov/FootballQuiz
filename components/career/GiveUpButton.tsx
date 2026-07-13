import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '@/constants/theme';
import { triggerImpact } from '@/lib/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';

interface GiveUpButtonProps {
  onGiveUp: () => void;
}

function GiveUpButton({ onGiveUp }: GiveUpButtonProps) {
  const [pressing, setPressing] = useState(false);

  const handleLongPress = () => {
    triggerImpact(ImpactFeedbackStyle.Heavy);
    onGiveUp();
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={500}
        onPressIn={() => setPressing(true)}
        onPressOut={() => setPressing(false)}
        style={[styles.button, pressing && styles.buttonPressed]}>
        <Text style={styles.label}>Give Up</Text>
      </Pressable>
      <Text style={styles.hint}>Hold to reveal</Text>
    </View>
  );
}

export default React.memo(GiveUpButton);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(227,57,70,0.5)',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    borderColor: 'rgba(227,57,70,0.9)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    color: '#A0A0B0',
    fontSize: 13,
    fontFamily: fonts.subheading,
  },
  hint: {
    color: '#A0A0B0',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },
});
