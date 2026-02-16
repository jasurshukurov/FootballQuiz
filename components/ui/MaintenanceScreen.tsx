import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MaintenanceScreenProps {
  message?: string;
}

export default function MaintenanceScreen({ message }: MaintenanceScreenProps) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 32,
  },
  emoji: {
    marginBottom: 16,
    fontSize: 48,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#52B788',
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 18,
    color: 'rgba(245,245,240,0.8)',
  },
  infoBox: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2D5A27',
    backgroundColor: 'rgba(45,90,39,0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(245,245,240,0.6)',
  },
});
