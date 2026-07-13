import { Stack } from 'expo-router';
import { colors, fonts } from '@/constants/theme';

export default function GamesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.midnightNavy },
        headerTintColor: colors.chalkWhite,
        headerTitleStyle: { fontFamily: fonts.heading, fontSize: 20 },
        headerBackTitle: 'Back',
      }}>
      <Stack.Screen name="who-are-ya" options={{ title: 'My name is...' }} />
      <Stack.Screen name="grid" options={{ title: 'Immaculate Grid' }} />
      <Stack.Screen name="career" options={{ title: 'Career Path' }} />
      <Stack.Screen name="missing11" options={{ title: 'Missing XI' }} />
      <Stack.Screen name="connections" options={{ title: 'Connections' }} />
      <Stack.Screen name="toplists" options={{ title: 'Top Lists' }} />
      <Stack.Screen name="higherlower" options={{ title: 'Higher / Lower' }} />
      <Stack.Screen name="agent" options={{ title: 'Transfer Agent' }} />
      <Stack.Screen name="blindranking" options={{ title: 'Blind Ranking' }} />
      <Stack.Screen name="careertimeline" options={{ title: 'Career Timeline' }} />
      <Stack.Screen name="marketmovers" options={{ title: 'Market Movers' }} />
      <Stack.Screen name="guessmatch" options={{ title: 'Guess the Match' }} />
    </Stack>
  );
}
