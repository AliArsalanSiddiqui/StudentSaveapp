// app/(student)/index.tsx - FIXED SUBSCRIPTION DETECTION
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Bell, User } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Vendor, UserSubscription } from '../../types/index';
import { useAuthStore } from '../../store/authStore';
import VendorCard from '@/components/VendorCard';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export default function StudentHome() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const categories = ['All', 'Restaurant', 'Cafe', 'Arcade'];

  useEffect(() => {
    fetchVendors();
    fetchSubscription();
    
    // Set up real-time subscription listener
    if (user?.id) {
      const channel = supabase
        .channel(`student-home-subscription-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Student home: Subscription changed:', payload);
            fetchSubscription();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('active', true)
      .order('rating', { ascending: false });

    if (data && !error) {
      console.log('Fetched vendors:', data.length);
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

      console.log('Student Home Subscription Check:', {
        userId: user.id,
        hasData: !!data,
        subscriptionId: data?.id?.substring(0, 8),
        active: data?.active,
        endDate: data?.end_date,
        isExpired: data?.end_date ? new Date(data.end_date) <= new Date() : null,
      });

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

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = vendor.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || vendor.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Image source={require('../../assets/logo.png')} style={styles.logoImage}/>
            </View>
            <Text style={styles.brandName}>StudentSave</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Bell color="white" size={24} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(student)/profile')}
            >
              <User color="white" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search
            color="#c084fc"
            size={20}
            style={styles.searchIcon}
          />
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
            <Text style={styles.bannerSubtitle}>
              Unlimited access to all discounts
            </Text>
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
            <Text style={styles.bannerSubtitle}>
              Get exclusive discounts at all vendors
            </Text>
          </TouchableOpacity>
        )}

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Vendors Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Vendors</Text>
          <View style={styles.vendorsGrid}>
            {filteredVendors.map((vendor) => (
              <View key={vendor.id} style={styles.vendorCardWrapper}>
                <VendorCard
                  vendor={vendor}
                  onPress={() =>
                    router.push(`/(student)/vendors/${vendor.id}`)
                  }
                />
              </View>
            ))}
          </View>
        </View>
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
    marginTop: 16,
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
    marginBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: '#ffffffff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    paddingVertical: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  subscriptionBanner: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#c084fc',
  },
  subscriptionBannerInactive: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    borderWidth: 2,
    borderColor: '#c084fc',
  },
  bannerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bannerSubtitle: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 12,
  },
  managePlanButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  managePlanText: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoriesContent: {
    gap: 8,
    paddingRight: 20
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryButtonActive: {
    backgroundColor: '#c084fc',
    borderColor: '#c084fc',
  },
  categoryText: {
    color: 'white',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#1e1b4b',
    fontWeight: '600',
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
  vendorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vendorCardWrapper: {
    width: cardWidth,
  },
});