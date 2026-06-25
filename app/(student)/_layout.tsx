// app/(student)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, QrCode, History, User, CreditCard } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StudentLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e1b4b',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#c084fc',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Subscriptions',
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen name="discount-claimed" options={{ href: null }} />
      <Tabs.Screen name="vendors" options={{ href: null }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
      <Tabs.Screen name="jazzcash-payment" options={{ href: null }} />
      <Tabs.Screen name="easypaisa-payment" options={{ href: null }} />
      <Tabs.Screen name="manual-payment" options={{ href: null }} />
      <Tabs.Screen name="favourites" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}