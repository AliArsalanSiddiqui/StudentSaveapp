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
import { ChevronLeft, TrendingUp, Calendar, Store } from 'lucide-react-native';
import { fetchUserTransactions, getUserStats } from '../../lib/api';
import { Transaction } from '../../types/index';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

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

    const [transactionsData, statsData] = await Promise.all([
      fetchUserTransactions(user.id),
      getUserStats(user.id),
    ]);

    setTransactions(transactionsData);
    setStats(statsData);
    setLoading(false);
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
            <Text style={styles.emptyStateText}>
              No transactions yet! 🎯
            </Text>
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
                    onPress={() =>
                      router.push(
                        `/(student)/vendors/${transaction.vendor_id}`
                      )
                    }
                  >
                    <View style={styles.transactionIcon}>
                      {transaction.vendor?.logo_url?.startsWith('http') ? (
                        <Image
                          source={{ uri: transaction.vendor.logo_url }}
                          style={styles.vendorImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.transactionEmoji}>
                          {transaction.vendor?.logo_url || '🏪'}
                        </Text>
                      )}
                    </View>

                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionVendor}>
                        {transaction.vendor?.name || 'Unknown Vendor'}
                      </Text>
                      <Text style={styles.transactionTime}>
                        {format(new Date(transaction.redeemed_at), 'h:mm a')}
                      </Text>
                    </View>

                    <View style={styles.transactionAmount}>
                      <Text style={styles.discountText}>
                        {transaction.discount_applied}
                      </Text>
                      {transaction.amount_saved > 0 && (
                        <Text style={styles.savedText}>
                          Saved ₨{transaction.amount_saved}
                        </Text>
                      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  vendorImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  transactionEmoji: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionVendor: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionTime: {
    color: '#c084fc',
    fontSize: 14,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  discountText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  savedText: {
    color: '#c084fc',
    fontSize: 12,
  },
});