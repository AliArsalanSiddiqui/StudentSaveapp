import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1e1b4b' },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="vendor-login" />
      <Stack.Screen name="admin-login" />
    </Stack>
  );
}