// app/(vendor)/analytics.tsx - ENHANCED WITH FULL ANALYTICS
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
  Activity,
  BarChart3,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  todayScans: number;
  yesterdayScans: number;
  weekScans: number;
  lastWeekScans: number;
  monthScans: number;
  lastMonthScans: number;
  totalScans: number;
  avgScansPerDay: number;
  peakHours: { hour: number; count: number }[];
  dailyScans: { date: string; count: number }[];
  topDays: { day: string; count: number }[];
  uniqueStudents: number;
  repeatCustomers: number;
  growthRate: number;
  todayGrowth: number;
  weekGrowth: number;
  monthGrowth: number;
}

export default function VendorAnalytics() {
  const user = useAuthStore((state) => state.user);
  const [vendor, setVendor] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    todayScans: 0,
    yesterdayScans: 0,
    weekScans: 0,
    lastWeekScans: 0,
    monthScans: 0,
    lastMonthScans: 0,
    totalScans: 0,
    avgScansPerDay: 0,
    peakHours: [],
    dailyScans: [],
    topDays: [],
    uniqueStudents: 0,
    repeatCustomers: 0,
    growthRate: 0,
    todayGrowth: 0,
    weekGrowth: 0,
    monthGrowth: 0,
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
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('redeemed_at', { ascending: false });

      if (!transactions) return;

      const now = new Date();
      
      // Time periods
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const yesterdayStart = subDays(todayStart, 1);
      const yesterdayEnd = new Date(todayStart.getTime() - 1);
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const lastWeekStart = subDays(weekStart, 7);
      const lastWeekEnd = subDays(weekEnd, 7);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subDays(monthStart, 1));
      const lastMonthEnd = endOfMonth(subDays(monthStart, 1));

      // Calculate metrics
      const todayScans = transactions.filter(
        (t) => new Date(t.redeemed_at) >= todayStart
      ).length;

      const yesterdayScans = transactions.filter(
        (t) => {
          const date = new Date(t.redeemed_at);
          return date >= yesterdayStart && date <= yesterdayEnd;
        }
      ).length;

      const weekScans = transactions.filter(
        (t) => {
          const date = new Date(t.redeemed_at);
          return date >= weekStart && date <= weekEnd;
        }
      ).length;

      const lastWeekScans = transactions.filter(
        (t) => {
          const date = new Date(t.redeemed_at);
          return date >= lastWeekStart && date <= lastWeekEnd;
        }
      ).length;

      const monthScans = transactions.filter(
        (t) => {
          const date = new Date(t.redeemed_at);
          return date >= monthStart && date <= monthEnd;
        }
      ).length;

      const lastMonthScans = transactions.filter(
        (t) => {
          const date = new Date(t.redeemed_at);
          return date >= lastMonthStart && date <= lastMonthEnd;
        }
      ).length;

      // Growth rates
      const todayGrowth = yesterdayScans > 0 
        ? Math.round(((todayScans - yesterdayScans) / yesterdayScans) * 100)
        : todayScans > 0 ? 100 : 0;

      const weekGrowth = lastWeekScans > 0
        ? Math.round(((weekScans - lastWeekScans) / lastWeekScans) * 100)
        : weekScans > 0 ? 100 : 0;

      const monthGrowth = lastMonthScans > 0
        ? Math.round(((monthScans - lastMonthScans) / lastMonthScans) * 100)
        : monthScans > 0 ? 100 : 0;

      // Unique students
      const uniqueStudents = new Set(transactions.map(t => t.user_id)).size;

      // Repeat customers
      const userCounts: { [key: string]: number } = {};
      transactions.forEach(t => {
        userCounts[t.user_id] = (userCounts[t.user_id] || 0) + 1;
      });
      const repeatCustomers = Object.values(userCounts).filter(count => count > 1).length;

      // Average scans per day
      const firstTransaction = transactions[transactions.length - 1];
      const daysSinceFirst = firstTransaction
        ? Math.max(1, Math.ceil((now.getTime() - new Date(firstTransaction.redeemed_at).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;
      const avgScansPerDay = Math.round(transactions.length / daysSinceFirst);

      // Peak hours
      const hourCounts: { [key: number]: number } = {};
      transactions.forEach((t) => {
        const hour = new Date(t.redeemed_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily scans for last 7 days
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

      // Top days of week
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
        yesterdayScans,
        weekScans,
        lastWeekScans,
        monthScans,
        lastMonthScans,
        totalScans: transactions.length,
        avgScansPerDay,
        peakHours,
        dailyScans,
        topDays,
        uniqueStudents,
        repeatCustomers,
        growthRate: weekGrowth,
        todayGrowth,
        weekGrowth,
        monthGrowth,
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

  const getPeriodGrowth = () => {
    switch (selectedPeriod) {
      case 'today':
        return analytics.todayGrowth;
      case 'week':
        return analytics.weekGrowth;
      case 'month':
        return analytics.monthGrowth;
    }
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return '#22c55e';
    if (growth < 0) return '#ef4444';
    return '#94a3b8';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  const currentGrowth = getPeriodGrowth();

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

        {/* Main Stats Card */}
        <View style={styles.mainStatCard}>
          <Text style={styles.mainStatLabel}>Total Scans</Text>
          <Text style={styles.mainStatValue}>{getPeriodScans()}</Text>
          <View style={styles.growthBadge}>
            <Activity 
              color={getGrowthColor(currentGrowth)} 
              size={16} 
            />
            <Text 
              style={[
                styles.growthText,
                { color: getGrowthColor(currentGrowth) }
              ]}
            >
              {currentGrowth > 0 ? '+' : ''}{currentGrowth}%
            </Text>
            <Text style={styles.growthLabel}>
              vs {selectedPeriod === 'today' ? 'yesterday' : `last ${selectedPeriod}`}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3b82f6' }]}>
              <Users color="white" size={20} />
            </View>
            <Text style={styles.statValue}>{analytics.uniqueStudents}</Text>
            <Text style={styles.statLabel}>Unique Students</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#8b5cf6' }]}>
              <TrendingUp color="white" size={20} />
            </View>
            <Text style={styles.statValue}>{analytics.repeatCustomers}</Text>
            <Text style={styles.statLabel}>Repeat Customers</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e' }]}>
              <Activity color="white" size={20} />
            </View>
            <Text style={styles.statValue}>{analytics.avgScansPerDay}</Text>
            <Text style={styles.statLabel}>Avg/Day</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b' }]}>
              <BarChart3 color="white" size={20} />
            </View>
            <Text style={styles.statValue}>{analytics.totalScans}</Text>
            <Text style={styles.statLabel}>All Time</Text>
          </View>
        </View>

        {/* Daily Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last 7 Days Trend</Text>
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
                          { height: `${Math.max(heightPercent, 5)}%` },
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
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
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
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
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
          <Text style={styles.insightsTitle}>💡 Key Insights</Text>
          
          {analytics.todayScans > analytics.yesterdayScans && (
            <Text style={styles.insightItem}>
              ✅ Today's performance is {analytics.todayGrowth}% better than yesterday!
            </Text>
          )}
          
          {analytics.peakHours.length > 0 && (
            <Text style={styles.insightItem}>
              ⏰ Your busiest hour is {formatHour(analytics.peakHours[0].hour)} with {analytics.peakHours[0].count} scans
            </Text>
          )}
          
          {analytics.topDays.length > 0 && (
            <Text style={styles.insightItem}>
              📅 {analytics.topDays[0].day} is your most popular day with {analytics.topDays[0].count} total scans
            </Text>
          )}
          
          {analytics.repeatCustomers > 0 && (
            <Text style={styles.insightItem}>
              🔄 {analytics.repeatCustomers} students have visited you multiple times
            </Text>
          )}
          
          {analytics.avgScansPerDay > 0 && (
            <Text style={styles.insightItem}>
              📊 You average {analytics.avgScansPerDay} scans per day
            </Text>
          )}
          
          {analytics.weekGrowth > 20 && (
            <Text style={styles.insightItem}>
              🚀 Great momentum! You're up {analytics.weekGrowth}% this week
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
  mainStatCard: { backgroundColor: 'rgba(192, 132, 252, 0.2)', borderRadius: 24, padding: 24, marginBottom: 24, alignItems: 'center', borderWidth: 2, borderColor: '#c084fc' },
  mainStatLabel: { color: '#c084fc', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  mainStatValue: { color: 'white', fontSize: 56, fontWeight: 'bold', marginBottom: 12 },
  growthBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  growthText: { fontSize: 16, fontWeight: 'bold' },
  growthLabel: { color: '#c084fc', fontSize: 12, marginLeft: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: (width - 60) / 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#c084fc', fontSize: 12, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  chartCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 180 },
  barContainer: { flex: 1, alignItems: 'center', gap: 4 },
  barWrapper: { flex: 1, width: '80%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: '#c084fc', borderRadius: 4, minHeight: 4 },
  barLabel: { color: '#c084fc', fontSize: 10, fontWeight: '600' },
  barCount: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  listCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', gap: 12 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(192, 132, 252, 0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { color: '#c084fc', fontSize: 12, fontWeight: 'bold' },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listItemIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  listItemText: { color: 'white', fontSize: 16, fontWeight: '600' },
  listItemRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  listItemValue: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  listItemSuffix: { color: '#c084fc', fontSize: 12 },
  emptyText: { color: '#c084fc', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  insightsCard: { backgroundColor: 'rgba(192, 132, 252, 0.1)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(192, 132, 252, 0.3)' },
  insightsTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  insightItem: { color: '#c084fc', fontSize: 14, marginBottom: 12, lineHeight: 20 },
});