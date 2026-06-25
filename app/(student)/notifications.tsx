// app/(student)/notifications.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, CheckCheck, Tag, QrCode, ShieldCheck, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/api';
import { Notification } from '@/types';

function iconForType(type?: string) {
  switch (type) {
    case 'redemption':
      return Tag;
    case 'scan':
      return QrCode;
    case 'verification':
      return ShieldCheck;
    default:
      return Info;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchUserNotifications(user.id);
    setNotifications(data);
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    })();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handlePress = async (item: Notification) => {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      await markNotificationAsRead(item.id);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsAsRead(user.id);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ChevronLeft color="white" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerButton}>
            <CheckCheck color="#c084fc" size={22} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#c084fc" size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Bell color="#475569" size={48} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>
            We'll let you know when there's something new.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c084fc" />
          }
          renderItem={({ item }) => {
            const Icon = iconForType(item.type);
            return (
              <TouchableOpacity
                style={[styles.card, !item.read && styles.cardUnread]}
                onPress={() => handlePress(item)}
                activeOpacity={0.8}
              >
                <View style={styles.iconWrap}>
                  <Icon color="#c084fc" size={20} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMessage}>{item.message}</Text>
                  <Text style={styles.cardTime}>
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { color: '#94a3b8', fontSize: 14, marginTop: 8, textAlign: 'center' },
  listContent: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardUnread: {
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderColor: 'rgba(192,132,252,0.25)',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(192,132,252,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { color: 'white', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardMessage: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  cardTime: { color: '#64748b', fontSize: 11, marginTop: 6 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c084fc',
    marginTop: 4,
  },
});
