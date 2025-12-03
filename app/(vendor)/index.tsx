import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Store, TrendingUp, Users, Award } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export default function VendorHome() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [vendor, setVendor] = useState<any>(null);
  const [stats, setStats] = useState({
    totalScans: 0,
    todayScans: 0,
    totalRevenue: 0,
    rating: 0,
  });

  useEffect(() => {
    if (user?.id) {
      fetchVendorData();
      fetchStats();
    }
  }, [user]);

  const fetchVendorData = async () => {
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('owner_id', user?.id)
      .single();

    if (data) setVendor(data);
  };

  const fetchStats = async () => {
    // Fetch transaction stats
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('vendor_id', vendor?.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayScans = transactions?.filter(
      (t) => new Date(t.redeemed_at) >= today
    ).length || 0;

    setStats({
      totalScans: transactions?.length || 0,
      todayScans,
      totalRevenue: 0,
      rating: vendor?.rating || 0,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Store color="white" size={24} />
            </View>
            <View>
              <Text style={styles.brandName}>StudentSave</Text>
              <Text style={styles.vendorRole}>Vendor Dashboard</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vendor Info */}
        {vendor && (
          <View style={styles.vendorCard}>
            <Text style={styles.vendorLogo}>{vendor.logo_url || '🏪'}</Text>
            <Text style={styles.vendorName}>{vendor.name}</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: vendor.active ? '#22c55e' : '#ef4444' },
                ]}
              />
              <Text style={styles.statusText}>
                {vendor.active ? 'Active' : 'Pending Approval'}
              </Text>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3b82f6' }]}>
              <Users color="white" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.todayScans}</Text>
            <Text style={styles.statLabel}>Today's Scans</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e' }]}>
              <TrendingUp color="white" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b' }]}>
              <Award color="white" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionCard}
            //onPress={() => router.push('/(vendor)/qr-code')}
          >
            <View style={styles.actionIcon}>
              <Store color="#f59e0b" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View QR Code</Text>
              <Text style={styles.actionSubtitle}>
                Show customers your discount code
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            //onPress={() => router.push('/(vendor)/analytics')}
          >
            <View style={styles.actionIcon}>
              <TrendingUp color="#f59e0b" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Analytics</Text>
              <Text style={styles.actionSubtitle}>
                Track your performance
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {!vendor?.active && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ⏳ Your vendor account is pending approval. You'll be notified once it's activated.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b',
  },
  header: {
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  vendorRole: {
    color: '#f59e0b',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  vendorCard: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignItems: 'center',
  },
  vendorLogo: {
    fontSize: 48,
    marginBottom: 12,
  },
  vendorName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#c084fc',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    color: '#c084fc',
    fontSize: 14,
  },
  infoBox: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    color: '#f59e0b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});