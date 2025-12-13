// app/(vendor)/index.tsx - CLEANED VERSION WITHOUT TEST LOGIN
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
  const [vendorRegistration, setVendorRegistration] = useState<any>(null);
  const [stats, setStats] = useState({
    totalScans: 0,
    todayScans: 0,
    totalRevenue: 0,
    rating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchVendorData();
    }
  }, [user]);

  const fetchVendorData = async () => {
    try {
      // Fetch vendor registration
      const { data: regData } = await supabase
        .from('vendor_registrations')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (regData) {
        setVendorRegistration(regData);

        // Only fetch vendor data if verified
        if (regData.verified) {
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('*')
            .eq('id', regData.id)
            .single();

          if (vendorData) {
            setVendor(vendorData);
            await fetchStats(vendorData.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (vendorId: string) => {
    try {
      // Fetch transaction stats
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', vendorId);

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
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show pending approval message if not verified
  if (vendorRegistration && !vendorRegistration.verified) {
    return (
      <View style={styles.container}>
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

        <View style={styles.pendingContainer}>
          <View style={styles.pendingIcon}>
            <Text style={styles.pendingEmoji}>⏳</Text>
          </View>
          <Text style={styles.pendingTitle}>Pending Verification</Text>
          <Text style={styles.pendingMessage}>
            Your vendor registration is being reviewed by our admin team.
            {'\n\n'}
            You will receive an email notification once your account is verified
            (usually within 24-48 hours).
            {'\n\n'}
            Thank you for your patience!
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => {
              // Show contact info
            }}
          >
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show rejected message if rejected
  if (vendorRegistration?.rejected) {
    return (
      <View style={styles.container}>
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

        <View style={styles.rejectedContainer}>
          <View style={styles.rejectedIcon}>
            <Text style={styles.rejectedEmoji}>❌</Text>
          </View>
          <Text style={styles.rejectedTitle}>Registration Rejected</Text>
          <Text style={styles.rejectedMessage}>
            Your vendor registration was not approved.
            {'\n\n'}
            Reason: {vendorRegistration.rejection_reason || 'Not specified'}
            {'\n\n'}
            Please contact support for more information.
          </Text>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Normal verified vendor dashboard
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
                  { backgroundColor: vendor.active ? '#22c55e' : '#f59e0b' },
                ]}
              />
              <Text style={styles.statusText}>
                {vendor.active ? 'Active' : 'Inactive'}
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
            <Text style={styles.statValue}>{vendor?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(vendor)/qr-code')}
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
            onPress={() => router.push('/(vendor)/analytics')}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
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
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  pendingIcon: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  pendingEmoji: {
    fontSize: 64,
  },
  pendingTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  pendingMessage: {
    color: '#c084fc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  rejectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  rejectedIcon: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  rejectedEmoji: {
    fontSize: 64,
  },
  rejectedTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  rejectedMessage: {
    color: '#c084fc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  contactButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  contactButtonText: {
    color: '#1e1b4b',
    fontSize: 16,
    fontWeight: 'bold',
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
});