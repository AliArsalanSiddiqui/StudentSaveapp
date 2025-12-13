// app/(student)/history.tsx - FIXED TO PASS UNIQUE TRANSACTION IDS
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, TrendingUp, Calendar, Store, Clock } from 'lucide-react-native';
import { getUserStats } from '../../lib/api';
import { Transaction } from '../../types/index';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';

export default function HistoryScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalSaved: 0,
    favoriteVendors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      // Fetch transactions with vendor details
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          vendor:vendors(*)
        `)
        .eq('user_id', user.id)
        .order('redeemed_at', { ascending: false })
        .limit(50);

      if (txError) {
        console.error('Error fetching transactions:', txError);
      }

      const statsData = await getUserStats(user.id);

      setTransactions(transactionsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const grouped: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      const date = format(new Date(transaction.redeemed_at), 'MMM dd, yyyy');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });

    return grouped;
  };

  const handleTransactionPress = (transaction: Transaction) => {
    // CRITICAL FIX: Pass the ACTUAL transaction ID
    console.log('📋 Opening transaction:', {
      transactionId: transaction.id,
      vendorName: transaction.vendor?.name,
      time: transaction.redeemed_at
    });

    router.push({
      pathname: '/(student)/discount-claimed',
      params: {
        vendorName: transaction.vendor?.name || 'Unknown Vendor',
        vendorLogo: transaction.vendor?.logo_url || '🏪',
        vendorLocation: transaction.vendor?.location || 'Unknown Location',
        discount: transaction.discount_applied,
        transactionId: transaction.id, // Pass ACTUAL transaction ID
        transactionTime: transaction.redeemed_at, // Pass actual time
      },
    });
  };

  const groupedTransactions = groupTransactionsByDate(transactions);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c084fc"
          />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp color="#22c55e" size={24} />
            </View>
            <Text style={styles.statValue}>₨{stats.totalSaved}</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Calendar color="#3b82f6" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.totalTransactions}</Text>
            <Text style={styles.statLabel}>Redemptions</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Store color="#f59e0b" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.favoriteVendors}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet! 🎯</Text>
            <Text style={styles.emptyStateSubtext}>
              Start redeeming discounts at your favorite vendors
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(student)')}
            >
              <Text style={styles.exploreButtonText}>Explore Vendors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {Object.entries(groupedTransactions).map(([date, items]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>{date}</Text>
                {items.map((transaction) => (
                  <TouchableOpacity
                    key={transaction.id}
                    style={styles.transactionCard}
                    onPress={() => handleTransactionPress(transaction)}
                    activeOpacity={0.7}
                  >
                    {/* Vendor Banner Image */}
                    <View style={styles.vendorBanner}>
                      {transaction.vendor?.logo_url?.startsWith('http') ? (
                        <Image
                          source={{ uri: transaction.vendor.logo_url }}
                          style={styles.bannerImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.bannerPlaceholder}>
                          <Text style={styles.bannerEmoji}>
                            {transaction.vendor?.logo_url || '🏪'}
                          </Text>
                        </View>
                      )}
                      
                      {/* Discount Badge on Banner */}
                      <View style={styles.bannerDiscountBadge}>
                        <Text style={styles.bannerDiscountText}>
                          {transaction.discount_applied}
                        </Text>
                      </View>
                    </View>

                    {/* Transaction Info Below Banner */}
                    <View style={styles.transactionDetails}>
                      <Text style={styles.vendorName} numberOfLines={1}>
                        {transaction.vendor?.name || 'Unknown Vendor'}
                      </Text>
                      
                      <View style={styles.detailRow}>
                        <Clock color="#c084fc" size={14} />
                        <Text style={styles.detailText}>
                          {format(new Date(transaction.redeemed_at), 'h:mm a')}
                        </Text>
                      </View>

                      {/* SHOW VERIFICATION CODE IN HISTORY */}
                      <View style={styles.verificationRow}>
                        <Text style={styles.verificationLabel}>Code:</Text>
                        <Text style={styles.verificationCode}>
                          {transaction.id.substring(0, 8).toUpperCase()}
                        </Text>
                      </View>

                      {transaction.amount_saved > 0 && (
                        <View style={styles.savedRow}>
                          <Text style={styles.savedLabel}>Saved:</Text>
                          <Text style={styles.savedAmount}>
                            ₨{transaction.amount_saved}
                          </Text>
                        </View>
                      )}
                      
                      <Text style={styles.tapToView}>Tap to view full details</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#c084fc',
    fontSize: 12,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#c084fc',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#c084fc',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#1e1b4b',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsList: {
    paddingHorizontal: 16,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  transactionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  vendorBanner: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 80,
  },
  bannerDiscountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bannerDiscountText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionDetails: {
    padding: 16,
  },
  vendorName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  detailText: {
    color: '#c084fc',
    fontSize: 14,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    marginBottom: 8,
  },
  verificationLabel: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: '600',
  },
  verificationCode: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  savedLabel: {
    color: '#c084fc',
    fontSize: 14,
  },
  savedAmount: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tapToView: {
    color: '#c084fc',
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});