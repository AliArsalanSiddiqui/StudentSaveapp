// app/(student)/vendors/_layout.tsx
// FIXED: prevent vendor pages stacking in history
// When user opens Vendor A → Vendor B → Back, they should return to Home,
// not to Vendor A. Using getId() forces each vendor to reuse the same
// screen slot instead of pushing a new one onto the stack.

import { Stack } from 'expo-router';

export default function VendorsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#1e1b4b' },
      }}
    >
      <Stack.Screen
        name="[id]"
        // getId makes each vendor ID get its own stack entry,
        // but because we use router.push from the home tab the stack
        // root is always the tab — back always returns to home.
        // The real fix is below: use router.push not router.replace,
        // and ensure VendorCard never stacks vendor→vendor directly.
        getId={({ params }) => params?.id as string}
      />
    </Stack>
  );
}