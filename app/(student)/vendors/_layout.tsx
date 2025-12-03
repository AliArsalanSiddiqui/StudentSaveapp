import { Stack } from 'expo-router';

export default function VendorsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1e1b4b' },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}