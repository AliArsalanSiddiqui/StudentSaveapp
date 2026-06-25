// app/(student)/index.tsx — WITH CITY SELECTOR, LOCATION SEARCH, AND DISTANCE/DISCOUNT FILTERS
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  Animated,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Search, Bell, User, Heart, MapPin } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Vendor, UserSubscription } from '../../types/index';
import { useAuthStore } from '../../store/authStore';
import VendorCard from '@/components/VendorCard';
import LocationSearchBar from '@/components/LocationSearchBar';
import { reverseGeocode, matchSupportedCity, SupportedCity } from '@/lib/nominatim';
import { fetchUnreadNotificationCount } from '@/lib/api';
import { registerForPushNotificationsAsync } from '@/lib/notifications';
import { useNotificationStore } from '@/store/notificationStore';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const CITY_STORAGE_KEY = 'studentSave_selectedCity';

type ActiveFilter = 'all' | 'closest' | 'discount' | 'category';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const DISTANCE_STEPS = [5, 10, 15, 20, 25, 30];
const DISCOUNT_STEPS = [15, 20, 25, 30, 35, 40, 45, 50];

export default function StudentHome() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const { unreadCount, setUnreadCount } = useNotificationStore();

  // ---- Location / city state ----
  const [selectedCity, setSelectedCity] = useState<SupportedCity>('Karachi');
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [detectedCityName, setDetectedCityName] = useState('');
  const [showCityDetectedBanner, setShowCityDetectedBanner] = useState(false);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerTranslateY = useRef(new Animated.Value(-20)).current;

  // ---- Filter state ----
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [discountMin, setDiscountMin] = useState(15);
  const [distanceMax, setDistanceMax] = useState(10);

  const categories = ['All', 'Restaurant', 'Cafe', 'Arcade', 'Clothing', 'Entertainment'];
  const cities: SupportedCity[] = ['Karachi', 'Lahore', 'Islamabad'];

  useEffect(() => {
    fetchVendors();
    fetchSubscription();
    fetchFavoritesCount();
    detectCity();

    if (user?.id) {
      fetchUnreadNotificationCount(user.id).then(setUnreadCount);
      registerForPushNotificationsAsync(user.id);

      const notifChannel = supabase
        .channel(`student-notifications-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => fetchUnreadNotificationCount(user.id).then(setUnreadCount)
        )
        .subscribe();

      const channel = supabase
        .channel(`student-home-subscription-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${user.id}` },
          () => fetchSubscription()
        )
        .subscribe();

      const favoritesChannel = supabase
        .channel(`student-home-favorites-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'favorites', filter: `user_id=eq.${user.id}` },
          () => fetchFavoritesCount()
        )
        .subscribe();

      // Safety net: React Native suspends the Realtime websocket while the
      // app is backgrounded (e.g. while the camera/scanner screen is open),
      // and it doesn't always reconnect cleanly. Re-sync the unread count
      // straight from the DB whenever the app comes back to the foreground,
      // so the badge stays correct even if a postgres_changes event got lost.
      const appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          fetchUnreadNotificationCount(user.id).then(setUnreadCount);
        }
      });

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(favoritesChannel);
        supabase.removeChannel(notifChannel);
        appStateSubscription.remove();
      };
    }
  }, [user?.id]);

  // ---- City detection on mount ----
  const detectCity = async () => {
    try {
      const saved = await AsyncStorage.getItem(CITY_STORAGE_KEY);
      if (saved && cities.includes(saved as SupportedCity)) {
        setSelectedCity(saved as SupportedCity);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        await AsyncStorage.setItem(CITY_STORAGE_KEY, 'Karachi');
        setSelectedCity('Karachi');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ lat: latitude, lon: longitude });

      const rawCity = await reverseGeocode(latitude, longitude);
      const matched = rawCity ? matchSupportedCity(rawCity) : null;

      if (matched) {
        setSelectedCity(matched);
        setDetectedCityName(matched);
        await AsyncStorage.setItem(CITY_STORAGE_KEY, matched);
        showBanner();
      } else {
        setSelectedCity('Karachi');
        await AsyncStorage.setItem(CITY_STORAGE_KEY, 'Karachi');
      }
    } catch (error) {
      console.error('City detection error:', error);
      setSelectedCity('Karachi');
    }
  };

  const showBanner = () => {
    setShowCityDetectedBanner(true);
    Animated.parallel([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(bannerTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    setTimeout(() => hideBanner(), 5000);
  };

  const hideBanner = () => {
    Animated.parallel([
      Animated.timing(bannerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(bannerTranslateY, { toValue: -20, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowCityDetectedBanner(false));
  };

  const handleCityPillPress = async (city: SupportedCity) => {
    setSelectedCity(city);
    await AsyncStorage.setItem(CITY_STORAGE_KEY, city);
  };

  const requestLocationForClosest = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({ lat: location.coords.latitude, lon: location.coords.longitude });
    } catch (error) {
      console.error('Error requesting location:', error);
    }
  };

  // ---- Data fetching ----
  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('active', true)
      .order('rating', { ascending: false });

    if (data && !error) {
      setVendors(data);
    }
    setLoading(false);
  };

  const fetchSubscription = async () => {
    if (!user?.id) {
      setSubscriptionLoading(false);
      return;
    }

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('active', true)
        .gte('end_date', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setSubscription(data);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Subscription fetch error:', error);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const fetchFavoritesCount = async () => {
    if (!user?.id) return;
    try {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (!error) setFavoritesCount(count || 0);
    } catch (error) {
      console.error('Error fetching favorites count:', error);
    }
  };

  // ---- Filter chip handlers ----
  const handleFilterChipPress = (filter: ActiveFilter) => {
    if (filter === 'all') {
      setActiveFilter('all');
      setShowFilterPanel(false);
      return;
    }

    if (activeFilter === filter && showFilterPanel) {
      setShowFilterPanel(false);
      return;
    }

    setActiveFilter(filter);
    if (filter === 'closest' && !userLocation) {
      requestLocationForClosest();
    }
    setShowFilterPanel(filter === 'closest' || filter === 'discount' || filter === 'category');
  };

  const handleLocationSelect = (lat: number, lon: number, _name: string) => {
    setUserLocation({ lat, lon });
  };

  // ---- Filtering logic ----
  const filteredVendors = useMemo(() => {
    let result = vendors.filter((v) => {
      if (selectedCity && v.city && v.city !== selectedCity) return false;

      if (activeFilter === 'category' && selectedCategory !== 'All' && v.category !== selectedCategory) {
        return false;
      }

      if (activeFilter === 'discount' && v.discount_percentage < discountMin) return false;

      if (activeFilter === 'closest' && userLocation && v.latitude && v.longitude) {
        const dist = calculateDistance(userLocation.lat, userLocation.lon, v.latitude, v.longitude);
        if (dist > distanceMax) return false;
      }

      if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    });

    if (activeFilter === 'closest' && userLocation) {
      result = [...result].sort((a, b) => {
        if (!a.latitude || !a.longitude) return 1;
        if (!b.latitude || !b.longitude) return -1;
        const distA = calculateDistance(userLocation.lat, userLocation.lon, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation.lat, userLocation.lon, b.latitude, b.longitude);
        return distA - distB;
      });
    }

    return result;
  }, [vendors, selectedCity, selectedCategory, activeFilter, discountMin, distanceMax, userLocation, searchQuery]);

  const getSectionTitle = (): string => {
    if (activeFilter === 'closest') return 'Closest to You';
    if (activeFilter === 'discount') return `Best Discounts (≥${discountMin}%)`;
    if (activeFilter === 'category' && selectedCategory !== 'All') return `${selectedCategory} in ${selectedCity}`;
    return `All Vendors in ${selectedCity}`;
  };

  const getVendorDistance = (vendor: Vendor): number | undefined => {
    if (activeFilter === 'closest' && userLocation && vendor.latitude && vendor.longitude) {
      return calculateDistance(userLocation.lat, userLocation.lon, vendor.latitude, vendor.longitude);
    }
    return undefined;
  };

  if (loading || subscriptionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c084fc" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* City detected banner */}
      {showCityDetectedBanner && (
        <Animated.View
          style={[
            styles.cityBanner,
            { opacity: bannerOpacity, transform: [{ translateY: bannerTranslateY }] },
          ]}
        >
          <Text style={styles.cityBannerText}>
            📍 We detected you're in {detectedCityName} — is this right?
          </Text>
          <View style={styles.cityBannerActions}>
            <TouchableOpacity onPress={hideBanner} style={styles.cityBannerYes}>
              <Text style={styles.cityBannerYesText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                hideBanner();
              }}
              style={styles.cityBannerChange}
            >
              <Text style={styles.cityBannerChangeText}>Change</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
            </View>
            <Text style={styles.brandName}>StudentSave</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(student)/favourites')}>
              <Heart color="white" size={24} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(student)/notifications')}
            >
              <Bell color="white" size={24} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(student)/profile')}>
              <User color="white" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* City Selector Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cityPillsContainer}
          contentContainerStyle={styles.cityPillsContent}
        >
          {cities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[styles.cityPill, selectedCity === city && styles.cityPillActive]}
              onPress={() => handleCityPillPress(city)}
            >
              {selectedCity === city && <MapPin color="#1e1b4b" size={12} />}
              <Text style={[styles.cityPillText, selectedCity === city && styles.cityPillTextActive]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Location Search Bar */}
        <View style={{ marginTop: 12 }}>
          <LocationSearchBar
            placeholder={`Search location in ${selectedCity}...`}
            onLocationSelect={handleLocationSelect}
            cityBias={selectedCity}
          />
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { marginTop: 12 }]}>
          <Search color="#c084fc" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors..."
            placeholderTextColor="#c084fc"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Subscription Banner */}
        {subscription ? (
          <View style={styles.subscriptionBanner}>
            <Text style={styles.bannerTitle}>Premium Active ✨</Text>
            <Text style={styles.bannerSubtitle}>Unlimited access to all discounts</Text>
            <TouchableOpacity
              style={styles.managePlanButton}
              onPress={() => router.push('/(student)/subscription')}
            >
              <Text style={styles.managePlanText}>Manage Plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.subscriptionBannerInactive}
            onPress={() => router.push('/(student)/subscription')}
          >
            <Text style={styles.bannerTitle}>Unlock Premium Access 🎓</Text>
            <Text style={styles.bannerSubtitle}>Get exclusive discounts at all vendors</Text>
          </TouchableOpacity>
        )}

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipsContainer}
          contentContainerStyle={styles.filterChipsContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'closest' && styles.filterChipActive]}
            onPress={() => handleFilterChipPress('closest')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'closest' && styles.filterChipTextActive]}>
              📍 Closest
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'discount' && styles.filterChipActive]}
            onPress={() => handleFilterChipPress('discount')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'discount' && styles.filterChipTextActive]}>
              🏷️ {activeFilter === 'discount' ? `≥${discountMin}% OFF` : 'Discount'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'category' && styles.filterChipActive]}
            onPress={() => handleFilterChipPress('category')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'category' && styles.filterChipTextActive]}>
              🗂️ {activeFilter === 'category' && selectedCategory !== 'All' ? selectedCategory : 'Category'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => handleFilterChipPress('all')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              🏙️ All in {selectedCity}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Filter Panel */}
        {showFilterPanel && activeFilter === 'closest' && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterPanelTitle}>Distance Range</Text>
            <Text style={styles.filterPanelValue}>Within {distanceMax} km</Text>
            <View style={styles.stepButtonsRow}>
              {DISTANCE_STEPS.map((step) => (
                <TouchableOpacity
                  key={step}
                  style={[styles.stepButton, distanceMax === step && styles.stepButtonActive]}
                  onPress={() => setDistanceMax(step)}
                >
                  <Text style={[styles.stepButtonText, distanceMax === step && styles.stepButtonTextActive]}>
                    {step}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!userLocation && (
              <TouchableOpacity style={styles.enableLocationButton} onPress={requestLocationForClosest}>
                <MapPin color="#1e1b4b" size={16} />
                <Text style={styles.enableLocationText}>Enable Location Access</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showFilterPanel && activeFilter === 'discount' && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterPanelTitle}>Minimum Discount</Text>
            <Text style={styles.filterPanelValue}>At least {discountMin}% OFF</Text>
            <View style={styles.stepButtonsRow}>
              {DISCOUNT_STEPS.map((step) => (
                <TouchableOpacity
                  key={step}
                  style={[styles.stepButton, discountMin === step && styles.stepButtonActive]}
                  onPress={() => setDiscountMin(step)}
                >
                  <Text style={[styles.stepButtonText, discountMin === step && styles.stepButtonTextActive]}>
                    {step}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {showFilterPanel && activeFilter === 'category' && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterPanelTitle}>Category</Text>
            <View style={styles.stepButtonsRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.stepButton, selectedCategory === cat && styles.stepButtonActive]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowFilterPanel(false);
                  }}
                >
                  <Text style={[styles.stepButtonText, selectedCategory === cat && styles.stepButtonTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Vendors Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
          <Text style={styles.vendorCount}>{filteredVendors.length} vendors found</Text>

          {filteredVendors.length === 0 ? (
            <View style={styles.emptyState}>
              {activeFilter === 'closest' && !userLocation ? (
                <>
                  <Text style={styles.emptyStateText}>
                    📍 Location access needed — tap to enable or search a location above
                  </Text>
                  <TouchableOpacity style={styles.enableLocationButton} onPress={requestLocationForClosest}>
                    <Text style={styles.enableLocationText}>Enable Location</Text>
                  </TouchableOpacity>
                </>
              ) : activeFilter === 'closest' ? (
                <Text style={styles.emptyStateText}>
                  No vendors within {distanceMax}km — try increasing the distance
                </Text>
              ) : (
                <Text style={styles.emptyStateText}>No vendors match these filters</Text>
              )}
            </View>
          ) : (
            <View style={styles.vendorsGrid}>
              {filteredVendors.map((vendor) => (
                <View key={vendor.id} style={styles.vendorCardWrapper}>
                  <VendorCard
                    vendor={vendor}
                    onPress={() => router.push(`/(student)/vendors/${vendor.id}`)}
                    distanceKm={getVendorDistance(vendor)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  loadingContainer: { flex: 1, backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', fontSize: 16, marginTop: 16 },

  cityBanner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: '#2e2557',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c084fc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cityBannerText: { color: 'white', fontSize: 14, marginBottom: 12 },
  cityBannerActions: { flexDirection: 'row', gap: 8 },
  cityBannerYes: { backgroundColor: '#c084fc', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  cityBannerYesText: { color: '#1e1b4b', fontSize: 13, fontWeight: '600' },
  cityBannerChange: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c084fc',
  },
  cityBannerChangeText: { color: '#c084fc', fontSize: 13, fontWeight: '600' },

  header: { padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: '#ffffffff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoImage: { width: 32, height: 32, borderRadius: 8 },
  brandName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 4, position: 'relative' },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#1e1b4b',
  },
  notifBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },

  cityPillsContainer: { flexGrow: 0 },
  cityPillsContent: { gap: 8 },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#c084fc',
  },
  cityPillActive: { backgroundColor: '#c084fc', borderColor: '#c084fc' },
  cityPillText: { color: '#c084fc', fontSize: 13, fontWeight: '600' },
  cityPillTextActive: { color: '#1e1b4b' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: 'white', paddingVertical: 12, fontSize: 16 },

  content: { flex: 1 },
  subscriptionBanner: { margin: 16, padding: 24, borderRadius: 16, backgroundColor: '#c084fc' },
  subscriptionBannerInactive: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    borderWidth: 2,
    borderColor: '#c084fc',
  },
  bannerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  bannerSubtitle: { color: 'white', fontSize: 14, opacity: 0.9, marginBottom: 12 },
  managePlanButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  managePlanText: { color: '#c084fc', fontSize: 14, fontWeight: '600' },

  filterChipsContainer: { paddingHorizontal: 16, marginBottom: 12, flexGrow: 0 },
  filterChipsContent: { gap: 8, paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterChipActive: { backgroundColor: '#c084fc', borderColor: '#c084fc' },
  filterChipText: { color: 'white', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#1e1b4b' },

  filterPanel: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  filterPanelTitle: { color: 'white', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  filterPanelValue: { color: '#c084fc', fontSize: 13, marginBottom: 12 },
  stepButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepButtonActive: { backgroundColor: '#c084fc', borderColor: '#c084fc' },
  stepButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  stepButtonTextActive: { color: '#1e1b4b' },

  enableLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#c084fc',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  enableLocationText: { color: '#1e1b4b', fontSize: 13, fontWeight: '700' },

  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  vendorCount: { color: '#c084fc', fontSize: 13, marginBottom: 16 },
  vendorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vendorCardWrapper: { width: cardWidth },

  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: { color: '#c084fc', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});