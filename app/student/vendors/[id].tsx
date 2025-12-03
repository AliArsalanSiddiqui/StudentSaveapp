import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Heart, Star, Clock, ChevronLeft, QrCode } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { Vendor } from '../../../types/index';
import { useAuthStore } from '../../../store/authStore';
import { fetchVendorById, toggleFavorite, isFavorite } from '../../../lib/api';
import QRScanner from '../../../components/QRScanner';

export default function VendorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
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
    }
    setLoading(false);
  };

  const checkFavorite = async () => {
    if (user?.id) {
      const isFav = await isFavorite(user.id, id as string);
      setFavorite(isFav);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user?.id) return;

    const success = await toggleFavorite(user.id, id as string);
    if (success) {
      setFavorite(!favorite);
    }
  };

  const handleScanSuccess = (vendorId: string) => {
    setShowScanner(false);
    Alert.alert(
      'Success! 🎉',
      `Your ${vendor?.discount_text} discount has been redeemed!`,
      [
        {
          text: 'View History',
          onPress: () => router.push('/(student)/history'),
        },
        {
          text: 'Done',
          onPress: () => router.back(),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Vendor not found</Text>
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

        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleToggleFavorite}
        >
          <Heart
            color={favorite ? '#ef4444' : 'white'}
            size={24}
            fill={favorite ? '#ef4444' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vendor Info Card */}
        <View style={styles.vendorCard}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>{vendor.logo_url || '🏪'}</Text>
          </View>

          <Text style={styles.vendorName}>{vendor.name}</Text>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{vendor.category}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Star color="#fbbf24" size={20} fill="#fbbf24" />
              <Text style={styles.statText}>{vendor.rating}</Text>
              <Text style={styles.statLabel}>
                ({vendor.total_reviews} reviews)
              </Text>
            </View>
          </View>

          {/* Discount Badge */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{vendor.discount_text}</Text>
          </View>
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

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Redeem Button */}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  vendorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 48,
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
    marginBottom: 16,
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
  discountBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  discountText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
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