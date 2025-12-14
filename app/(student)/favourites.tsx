// app/(student)/favorites.tsx - NEW FAVORITES SCREEN
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Heart, Trash2 } from 'lucide-react-native';
import { fetchFavorites, toggleFavorite } from '@/lib/api';
import { Vendor } from '@/types';
import { useAuthStore } from '@/store/authStore';
import VendorCard from '@/components/VendorCard';
import CustomAlert, { useCustomAlert } from '@/components/CustomAlert';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export default function FavoritesScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { alertConfig, showAlert, Alert } = useCustomAlert();
  
  const [favorites, setFavorites] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    if (!user?.id) return;

    try {
      const data = await fetchFavorites(user.id);
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to load favorites',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleRemoveFavorite = async (vendorId: string, vendorName: string) => {
    if (!user?.id) return;

    showAlert({
      type: 'warning',
      title: 'Remove Favorite?',
      message: `Remove ${vendorName} from your favorites?`,
      buttons: [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(vendorId);
            
            try {
              const success = await toggleFavorite(user.id, vendorId);
              
              if (success) {
                // Remove from local state
                setFavorites((prev) => prev.filter((v) => v.id !== vendorId));
                
                showAlert({
                  type: 'success',
                  title: 'Removed',
                  message: `${vendorName} removed from favorites`,
                });
              } else {
                showAlert({
                  type: 'error',
                  title: 'Error',
                  message: 'Failed to remove favorite',
                });
              }
            } catch (error) {
              showAlert({
                type: 'error',
                title: 'Error',
                message: 'Failed to remove favorite',
              });
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    });
  };

  const handleVendorPress = (vendorId: string) => {
    router.push(`/(student)/vendors/${vendorId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Alert />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
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
        {/* Stats */}
        <View style={styles.statsCard}>
          <Heart color="#ef4444" size={32} fill="#ef4444" />
          <Text style={styles.statsNumber}>{favorites.length}</Text>
          <Text style={styles.statsLabel}>
            Favorite {favorites.length === 1 ? 'Vendor' : 'Vendors'}
          </Text>
        </View>

        {/* Empty State */}
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Heart color="#c084fc" size={64} />
            </View>
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start adding your favorite vendors by tapping the heart icon on their profile
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(student)')}
            >
              <Text style={styles.exploreButtonText}>Explore Vendors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                💡 Tap on a vendor to view details or swipe to remove from favorites
              </Text>
            </View>

            {/* Favorites Grid */}
            <View style={styles.vendorsGrid}>
              {favorites.map((vendor) => (
                <View key={vendor.id} style={styles.vendorCardWrapper}>
                  <VendorCard
                    vendor={vendor}
                    onPress={() => handleVendorPress(vendor.id)}
                  />
                  
                  {/* Remove Button Overlay */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveFavorite(vendor.id, vendor.name)}
                    disabled={removingId === vendor.id}
                  >
                    {removingId === vendor.id ? (
                      <Text style={styles.removeButtonText}>...</Text>
                    ) : (
                      <Trash2 color="white" size={16} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
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
  statsCard: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  statsNumber: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  statsLabel: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  emptyTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#c084fc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: '#c084fc',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#1e1b4b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  infoText: {
    color: '#c084fc',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  vendorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  vendorCardWrapper: {
    width: cardWidth,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});