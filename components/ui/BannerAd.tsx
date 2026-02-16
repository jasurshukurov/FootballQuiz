import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { useProStore } from '@/hooks/useProStore';

const ADS_ENABLED = false;

export default function BannerAd() {
  const isPro = useProStore((s) => s.isPro);

  if (!ADS_ENABLED || isPro) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.text}>Ad Placeholder</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(45,90,39,0.3)',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  placeholder: {
    height: 53,
    width: 320,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#6C757D',
    backgroundColor: 'rgba(26,26,46,0.8)',
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6C757D',
  },
});
