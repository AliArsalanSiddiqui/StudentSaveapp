import { Tabs } from 'expo-router';
import { Home, QrCode, BarChart3, User } from 'lucide-react-native';

export default function VendorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e1b4b',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#f59e0b',
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
        name="qr-code"
        options={{
          title: 'QR Code',
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}