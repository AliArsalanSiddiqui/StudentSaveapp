// app/(vendor)/analytics.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  Users,
  Calendar,
  Award,
  DollarSign,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  todayScans: number;
  weekScans: number;
  monthScans: number;
  totalScans: number;
  totalRevenue: number;
  avgTransactionValue: number;
  rating: number;
  totalReviews: number;
  peakHours: { hour: number; count: number }[];
  dailyScans: { date: string; count: number }[];
  topDays: { day: string; count: number }[];
}

export default function VendorAnalytics() {
  const user = useAuthStore((state) => state.user);
  const [vendor, setVendor] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    todayScans: 0,
    weekScans: 0,
    monthScans: 0,
    totalScans: 0,
    totalRevenue: 0,
    avgTransactionValue: 0,
    rating: 0,
    totalReviews: 0,
    peakHours: [],
    dailyScans: [],
    topDays: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      // Fetch vendor data
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (vendorData) {
        setVendor(vendorData);
        await fetchAnalytics(vendorData.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (vendorId: string) => {
    try {
      // Fetch all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('redeemed_at', { ascending: false });

      if (!transactions) return;

      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = startOfWeek(now);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate metrics
      const todayScans = transactions.filter(
        (t) => new Date(t.redeemed_at) >= todayStart
      ).length;

      const weekScans = transactions.filter(
        (t) => new Date(t.redeemed_at) >= weekStart
      ).length;

      const monthScans = transactions.filter(
        (t) => new Date(t.redeemed_at) >= monthStart
      ).length;

      const totalRevenue = transactions.reduce(
        (sum, t) => sum + (t.amount_saved || 0),
        0
      );

      const avgTransactionValue =
        transactions.length > 0 ? totalRevenue / transactions.length : 0;

      // Calculate peak hours
      const hourCounts: { [key: number]: number } = {};
      transactions.forEach((t) => {
        const hour = new Date(t.redeemed_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate daily scans for last 7 days
      const dailyScans = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const count = transactions.filter((t) => {
          const txDate = new Date(t.redeemed_at);
          return txDate >= dayStart && txDate <= dayEnd;
        }).length;

        return {
          date: format(date, 'MMM dd'),
          count,
        };
      });

      // Calculate top days of week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayCounts: { [key: string]: number } = {};
      
      transactions.forEach((t) => {
        const day = dayNames[new Date(t.redeemed_at).getDay()];
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      const topDays = Object.entries(dayCounts)
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count);

      setAnalytics({
        todayScans,
        weekScans,
        monthScans,
        totalScans: transactions.length,
        totalRevenue,
        avgTransactionValue,
        rating: vendor?.rating || 0,
        totalReviews: vendor?.total_reviews || 0,
        peakHours,
        dailyScans,
        topDays,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getPeriodScans = () => {
    switch (selectedPeriod) {
      case 'today':
        return analytics.todayScans;
      case 'week':
        return analytics.weekScans;
      case 'month':
        return analytics.monthScans;
    }
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1e1b4b', '#581c87', '#1e1b4b']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c084fc"
            colors={['#c084fc']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Track your performance</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['today', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3b82f6' }]}>
              <Users color="white" size={24} />
            </View>
            <Text style={styles.statValue}>{getPeriodScans()}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e' }]}>
              <TrendingUp color="white" size={24} />
            </View>
            <Text style={styles.statValue}>{analytics.totalScans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b' }]}>
              <Award color="white" size={24} />
            </View>
            <Text style={styles.statValue}>{analytics.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#8b5cf6' }]}>
              <DollarSign color="white" size={24} />
            </View>
            <Text style={styles.statValue}>₨{Math.round(analytics.totalRevenue)}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>

        {/* Daily Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartContainer}>
              {analytics.dailyScans.map((day, index) => {
                const maxCount = Math.max(...analytics.dailyScans.map((d) => d.count), 1);
                const heightPercent = (day.count / maxCount) * 100;

                return (
                  <View key={index} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          { height: `${heightPercent}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{day.date.split(' ')[1]}</Text>
                    <Text style={styles.barCount}>{day.count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Peak Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Peak Hours</Text>
          <View style={styles.listCard}>
            {analytics.peakHours.slice(0, 5).map((item, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Clock color="#f59e0b" size={20} />
                  </View>
                  <Text style={styles.listItemText}>{formatHour(item.hour)}</Text>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemValue}>{item.count}</Text>
                  <Text style={styles.listItemSuffix}>scans</Text>
                </View>
              </View>
            ))}
            {analytics.peakHours.length === 0 && (
              <Text style={styles.emptyText}>No data yet</Text>
            )}
          </View>
        </View>

        {/* Top Days */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Busiest Days</Text>
          <View style={styles.listCard}>
            {analytics.topDays.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <View style={styles.listItemIcon}>
                    <Calendar color="#3b82f6" size={20} />
                  </View>
                  <Text style={styles.listItemText}>{item.day}</Text>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemValue}>{item.count}</Text>
                  <Text style={styles.listItemSuffix}>scans</Text>
                </View>
              </View>
            ))}
            {analytics.topDays.length === 0 && (
              <Text style={styles.emptyText}>No data yet</Text>
            )}
          </View>
        </View>

        {/* Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>💡 Insights</Text>
          {analytics.peakHours.length > 0 && (
            <Text style={styles.insightItem}>
              • Your busiest hour is {formatHour(analytics.peakHours[0].hour)} with{' '}
              {analytics.peakHours[0].count} scans
            </Text>
          )}
          {analytics.topDays.length > 0 && (
            <Text style={styles.insightItem}>
              • {analytics.topDays[0].day} is your most popular day
            </Text>
          )}
          {analytics.weekScans > 0 && (
            <Text style={styles.insightItem}>
              • Average of {Math.round(analytics.weekScans / 7)} scans per day this week
            </Text>
          )}
          {analytics.rating > 0 && (
            <Text style={styles.insightItem}>
              • Your rating is {analytics.rating.toFixed(1)}/5 from{' '}
              {analytics.totalReviews} reviews
            </Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', fontSize: 16 },
  content: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#c084fc', fontSize: 16 },
  periodSelector: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 4, marginBottom: 24 },
  periodButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  periodButtonActive: { backgroundColor: '#c084fc' },
  periodButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  periodButtonTextActive: { color: '#1e1b4b' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: (width - 60) / 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  statIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#c084fc', fontSize: 12, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  chartCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 180 },
  barContainer: { flex: 1, alignItems: 'center', gap: 4 },
  barWrapper: { flex: 1, width: '80%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: '#c084fc', borderRadius: 4 },
  barLabel: { color: '#c084fc', fontSize: 10, fontWeight: '600' },
  barCount: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  listCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', gap: 12 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listItemIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  listItemText: { color: 'white', fontSize: 16, fontWeight: '600' },
  listItemRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  listItemValue: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  listItemSuffix: { color: '#c084fc', fontSize: 12 },
  emptyText: { color: '#c084fc', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  insightsCard: { backgroundColor: 'rgba(192, 132, 252, 0.1)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(192, 132, 252, 0.3)' },
  insightsTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  insightItem: { color: '#c084fc', fontSize: 14, marginBottom: 10, lineHeight: 20 },
});