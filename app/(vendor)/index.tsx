// app/(vendor)/index.tsx - ENHANCED WITH REAL-TIME SCAN NOTIFICATIONS
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  RefreshControl,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Store, TrendingUp, Users, Award, Bell, CheckCircle, Clock } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

interface RecentScan {
  id: string;
  student_name: string;
  discount_applied: string;
  redeemed_at: string;
  verification_code: string;
}

export default function VendorHome() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [vendor, setVendor] = useState<any>(null);
  const [vendorRegistration, setVendorRegistration] = useState<any>(null);
  const [stats, setStats] = useState({
    totalScans: 0,
    todayScans: 0,
    weekScans: 0,
    monthScans: 0,
    rating: 0,
  });
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [latestScan, setLatestScan] = useState<RecentScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchVendorData();
    }
  }, [user]);

  useEffect(() => {
    if (vendor?.id) {
      setupRealtimeListener();
    }
  }, [vendor?.id]);

  const setupRealtimeListener = () => {
    if (!vendor?.id) return;

    console.log('🔔 Setting up real-time scan listener for vendor:', vendor.id);

    const channel = supabase
      .channel(`vendor-scans-${vendor.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `vendor_id=eq.${vendor.id}`,
        },
        async (payload) => {
          console.log('🎉 NEW SCAN DETECTED:', payload);
          
          // Fetch full transaction details with user info
          const { data: transaction } = await supabase
            .from('transactions')
            .select(`
              *,
              user:users(name, email)
            `)
            .eq('id', payload.new.id)
            .single();

          if (transaction) {
            const newScan: RecentScan = {
              id: transaction.id,
              student_name: transaction.user?.name || 'Student',
              discount_applied: transaction.discount_applied,
              redeemed_at: transaction.redeemed_at,
              verification_code: transaction.id.substring(0, 8).toUpperCase(),
            };

            // Show notification
            setLatestScan(newScan);
            setShowNotification(true);

            // Auto-hide after 10 seconds
            setTimeout(() => {
              setShowNotification(false);
            }, 10000);

            // Refresh stats and recent scans
            fetchStats(vendor.id);
            fetchRecentScans(vendor.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchVendorData = async () => {
    try {
      const { data: regData } = await supabase
        .from('vendor_registrations')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (regData) {
        setVendorRegistration(regData);

        if (regData.verified) {
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('*')
            .eq('id', regData.id)
            .single();

          if (vendorData) {
            setVendor(vendorData);
            await fetchStats(vendorData.id);
            await fetchRecentScans(vendorData.id);
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
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', vendorId);

      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

      const todayScans = transactions?.filter(
        (t) => new Date(t.redeemed_at) >= today
      ).length || 0;

      const weekScans = transactions?.filter(
        (t) => new Date(t.redeemed_at) >= weekAgo
      ).length || 0;

      const monthScans = transactions?.filter(
        (t) => new Date(t.redeemed_at) >= monthAgo
      ).length || 0;

      setStats({
        totalScans: transactions?.length || 0,
        todayScans,
        weekScans,
        monthScans,
        rating: vendor?.rating || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentScans = async (vendorId: string) => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          user:users(name, email)
        `)
        .eq('vendor_id', vendorId)
        .order('redeemed_at', { ascending: false })
        .limit(10);

      if (transactions) {
        const scans: RecentScan[] = transactions.map((t) => ({
          id: t.id,
          student_name: t.user?.name || 'Student',
          discount_applied: t.discount_applied,
          redeemed_at: t.redeemed_at,
          verification_code: t.id.substring(0, 8).toUpperCase(),
        }));
        setRecentScans(scans);
      }
    } catch (error) {
      console.error('Error fetching recent scans:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVendorData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
        </View>
      </View>
    );
  }

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
        </View>
      </View>
    );
  }

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
          
          <TouchableOpacity style={styles.bellIcon}>
            <Bell color="white" size={24} />
            {stats.todayScans > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.todayScans}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
          />
        }
      >
        {/* Vendor Info */}
        {vendor && (
        <View style={styles.vendorCard}>
          <View style={styles.logoContainer}>
          {vendor.logo_url ? (
            <Image
              source={{ uri: vendor.logo_url }}
              style={styles.vendorImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.vendorLogo}>🏪</Text>
          )}
      </View>
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
            <Text style={styles.statLabel}>Today</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#8b5cf6' }]}>
              <Clock color="white" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.weekScans}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e' }]}>
              <TrendingUp color="white" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>All Time</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b' }]}>
              <Award color="white" size={24} />
            </View>
            <Text style={styles.statValue}>{vendor?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Recent Scans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          
          {recentScans.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No scans yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Students will appear here when they scan your QR code
              </Text>
            </View>
          ) : (
            <View style={styles.scansList}>
              {recentScans.map((scan) => (
                <View key={scan.id} style={styles.scanCard}>
                  <View style={styles.scanHeader}>
                    <View style={styles.scanIcon}>
                      <CheckCircle color="#22c55e" size={20} />
                    </View>
                    <View style={styles.scanInfo}>
                      <Text style={styles.scanStudent}>{scan.student_name}</Text>
                      <Text style={styles.scanTime}>
                        {format(new Date(scan.redeemed_at), 'MMM dd, h:mm a')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scanDetails}>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{scan.discount_applied}</Text>
                    </View>
                    <View style={styles.verificationCode}>
                      <Text style={styles.codeLabel}>Code:</Text>
                      <Text style={styles.codeValue}>{scan.verification_code}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
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

      {/* Real-time Scan Notification */}
      <Modal
        visible={showNotification}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotification(false)}
      >
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <CheckCircle color="#22c55e" size={32} />
              <Text style={styles.notificationTitle}>New Scan! 🎉</Text>
            </View>
            
            {latestScan && (
              <>
                <Text style={styles.notificationStudent}>{latestScan.student_name}</Text>
                <View style={styles.notificationDiscount}>
                  <Text style={styles.notificationDiscountText}>
                    {latestScan.discount_applied}
                  </Text>
                </View>
                
                <View style={styles.notificationCode}>
                  <Text style={styles.notificationCodeLabel}>Verification Code:</Text>
                  <Text style={styles.notificationCodeValue}>
                    {latestScan.verification_code}
                  </Text>
                </View>

                <Text style={styles.notificationInstruction}>
                  Ask the student to show you this code on their screen
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setShowNotification(false)}
            >
              <Text style={styles.notificationButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  loadingContainer: { flex: 1, backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', fontSize: 16 },
  header: { padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 40, height: 40, backgroundColor: '#f59e0b', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  brandName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  vendorRole: { color: '#f59e0b', fontSize: 12 },
  bellIcon: { position: 'relative', padding: 8 },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  content: { flex: 1 },
  pendingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  pendingIcon: { width: 120, height: 120, backgroundColor: 'rgba(245, 158, 11, 0.2)', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 3, borderColor: 'rgba(245, 158, 11, 0.4)' },
  pendingEmoji: { fontSize: 64 },
  pendingTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  pendingMessage: { color: '#c084fc', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  rejectedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  rejectedIcon: { width: 120, height: 120, backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 3, borderColor: 'rgba(239, 68, 68, 0.4)' },
  rejectedEmoji: { fontSize: 64 },
  rejectedTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  rejectedMessage: { color: '#c084fc', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  vendorCard: { margin: 16, padding: 24, borderRadius: 20, backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 2, borderColor: '#f59e0b', alignItems: 'center' },
  vendorLogo: { fontSize: 48, marginBottom: 12 },
  vendorImage:{
    width: 400,
    height: 400
  },
  vendorName: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: 'white', fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#c084fc', fontSize: 12, textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyState: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyStateText: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyStateSubtext: { color: '#c084fc', fontSize: 14, textAlign: 'center' },
  scansList: { gap: 12 },
  scanCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  scanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  scanIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(34, 197, 94, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  scanInfo: { flex: 1 },
  scanStudent: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  scanTime: { color: '#c084fc', fontSize: 12 },
  scanDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discountBadge: { backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  discountText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  verificationCode: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeLabel: { color: '#c084fc', fontSize: 12 },
  codeValue: { color: 'white', fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  actionIcon: { width: 48, height: 48, backgroundColor: 'rgba(245, 158, 11, 0.2)', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionContent: { flex: 1 },
  actionTitle: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  actionSubtitle: { color: '#c084fc', fontSize: 14 },
  notificationOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
  notificationCard: { backgroundColor: '#1e1b4b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 4, borderTopColor: '#22c55e' },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  notificationTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  notificationStudent: { color: 'white', fontSize: 20, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  notificationDiscount: { backgroundColor: '#22c55e', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginBottom: 20, alignSelf: 'center' },
  notificationDiscountText: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  notificationCode: { backgroundColor: 'rgba(192, 132, 252, 0.2)', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 2, borderColor: '#c084fc' },
  notificationCodeLabel: { color: '#c084fc', fontSize: 14, marginBottom: 4 },
  notificationCodeValue: { color: 'white', fontSize: 32, fontWeight: 'bold', letterSpacing: 4, fontFamily: 'monospace' },
  notificationInstruction: { color: '#c084fc', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  notificationButton: { backgroundColor: '#f59e0b', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  notificationButtonText: { color: '#1e1b4b', fontSize: 18, fontWeight: 'bold' },
});