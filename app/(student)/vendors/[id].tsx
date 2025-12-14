// app/(student)/vendors/[id].tsx - UPDATED WITH FUNCTIONAL FAVORITES
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Heart, Star, Clock, ChevronLeft, QrCode } from 'lucide-react-native';
import { Vendor } from '../../../types/index';
import { useAuthStore } from '../../../store/authStore';
import { fetchVendorById, toggleFavorite, isFavorite } from '../../../lib/api';
import QRScanner from '../../../components/QRScanner';
import CustomAlert, { useCustomAlert } from '../../../components/CustomAlert';

export default function VendorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const { alertConfig, showAlert, Alert } = useCustomAlert();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (id) {
      loadVendor();
      checkFavorite();
    }
  }, [id]);

  const loadVendor = async () => {
    const data = await fetchVendorById(id as string);
    if (data) {
      setVendor(data);
    } else {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Vendor not found',
      });
    }
    setLoading(false);
  };

  const checkFavorite = async () => {
    if (user?.id && id) {
      const isFav = await isFavorite(user.id, id as string);
      setFavorite(isFav);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user?.id) {
      showAlert({
        type: 'warning',
        title: 'Sign In Required',
        message: 'Please sign in to add favorites',
      });
      return;
    }

    if (!id) return;

    setFavoriteLoading(true);

    try {
      const success = await toggleFavorite(user.id, id as string);
      
      if (success) {
        const newFavoriteState = !favorite;
        setFavorite(newFavoriteState);
        
        showAlert({
          type: 'success',
          title: newFavoriteState ? 'Added to Favorites! ❤️' : 'Removed from Favorites',
          message: newFavoriteState 
            ? `${vendor?.name} has been added to your favorites`
            : `${vendor?.name} has been removed from your favorites`,
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Failed to update favorite',
        });
      }
    } catch (error) {
      console.error('Favorite toggle error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to update favorite',
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleScanSuccess = (vendorId: string) => {
    setShowScanner(false);
    
    router.push({
      pathname: '/(student)/discount-claimed',
      params: {
        vendorName: vendor?.name,
        vendorLogo: vendor?.logo_url,
        vendorLocation: vendor?.location,
        discount: vendor?.discount_text,
        vendorId: vendor?.id,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c084fc" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Vendor not found</Text>
        <TouchableOpacity
          style={styles.backToHomeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backToHomeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Alert />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          {vendor.logo_url?.startsWith('http') ? (
            <Image
              source={{ uri: vendor.logo_url }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Text style={styles.bannerEmoji}>{vendor.logo_url || '🏪'}</Text>
            </View>
          )}

          {/* Overlay Header Buttons */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.favoriteButton,
                favoriteLoading && styles.favoriteButtonDisabled,
              ]}
              onPress={handleToggleFavorite}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Heart
                  color={favorite ? '#ef4444' : 'white'}
                  size={24}
                  fill={favorite ? '#ef4444' : 'transparent'}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Discount Badge on Banner */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{vendor.discount_text}</Text>
          </View>
        </View>

        {/* Vendor Info Card */}
        <View style={styles.vendorCard}>
          <Text style={styles.vendorName}>{vendor.name}</Text>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{vendor.category}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Star color="#fbbf24" size={20} fill="#fbbf24" />
              <Text style={styles.statText}>{vendor.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>({vendor.total_reviews} reviews) </Text>
            </View>
          </View>

          {/* Favorite Status Indicator */}
          {favorite && (
            <View style={styles.favoriteIndicator}>
              <Heart color="#ef4444" size={16} fill="#ef4444" />
              <Text style={styles.favoriteIndicatorText}>In Your Favorites</Text>
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin color="#c084fc" size={20} />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          <Text style={styles.locationText}>{vendor.location}</Text>
        </View>

        {/* Description */}
        {vendor.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{vendor.description}</Text>
          </View>
        )}

        {/* Opening Hours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock color="#c084fc" size={20} />
            <Text style={styles.sectionTitle}>Opening Hours</Text>
          </View>
          <Text style={styles.hoursText}>
            {vendor.opening_hours
              ? JSON.stringify(vendor.opening_hours)
              : 'Mon - Sun: 9:00 AM - 11:00 PM'}
          </Text>
        </View>

        {/* Terms & Conditions */}
        {vendor.terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{vendor.terms}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Redeem Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.redeemButton}
          onPress={() => setShowScanner(true)}
        >
          <QrCode color="#1e1b4b" size={24} />
          <Text style={styles.redeemButtonText}>Scan QR to Redeem</Text>
        </TouchableOpacity>
      </View>

      {/* QR Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <QRScanner
          onClose={() => setShowScanner(false)}
          onSuccess={handleScanSuccess}
          restrictToVendorId={vendor.id}
        />
      </Modal>
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
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 24,
  },
  backToHomeButton: {
    backgroundColor: '#c084fc',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backToHomeText: {
    color: '#1e1b4b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  heroBanner: {
    width: '100%',
    height: 400,
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
    fontSize: 120,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonDisabled: {
    opacity: 0.6,
  },
  discountBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  discountText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  vendorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  vendorName: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryText: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statLabel: {
    color: '#c084fc',
    fontSize: 14,
    marginLeft: 4,
  },
  favoriteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  favoriteIndicatorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  locationText: {
    color: '#c084fc',
    fontSize: 16,
    lineHeight: 24,
  },
  descriptionText: {
    color: '#c084fc',
    fontSize: 14,
    lineHeight: 22,
  },
  hoursText: {
    color: '#c084fc',
    fontSize: 14,
    lineHeight: 22,
  },
  termsText: {
    color: '#c084fc',
    fontSize: 12,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#1e1b4b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  redeemButton: {
    backgroundColor: '#c084fc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  redeemButtonText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: 'bold',
  },
});