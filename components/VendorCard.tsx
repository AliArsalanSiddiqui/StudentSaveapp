// components/VendorCard.tsx - FIXED IMAGE LOADING
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MapPin, Star } from 'lucide-react-native';
import { Vendor } from '../types/index';

interface VendorCardProps {
  vendor: Vendor;
  onPress: () => void;
}

export default function VendorCard({ vendor, onPress }: VendorCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Check if logo_url is a valid URL
  const isImageUrl = vendor.logo_url && 
    (vendor.logo_url.startsWith('http://') || vendor.logo_url.startsWith('https://'));

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        {isImageUrl && !imageError ? (
          <>
            {imageLoading && (
              <ActivityIndicator 
                color="#c084fc" 
                size="small" 
                style={styles.imageLoader}
              />
            )}
            <Image
              source={{ uri: vendor.logo_url }}
              style={styles.logoImage}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={(e) => {
                console.log('Image load error:', vendor.logo_url);
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </>
        ) : (
          <Text style={styles.logo}>{vendor.logo_url || '🏪'}</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {vendor.name}
        </Text>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{vendor.category}</Text>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <MapPin color="#c084fc" size={14} />
          <Text style={styles.locationText} numberOfLines={1}>
            {vendor.location}
          </Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <Star color="#fbbf24" size={14} fill="#fbbf24" />
          <Text style={styles.ratingText}>{vendor.rating}</Text>
          <Text style={styles.reviewCount}>({vendor.total_reviews}) </Text>
        </View>
      </View>

      {/* Discount Badge */}
      <View style={styles.discountBadge}>
        <Text style={styles.discountText}>{vendor.discount_text}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  logoContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  imageLoader: {
    position: 'absolute',
    zIndex: 1,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logo: {
    fontSize: 40,
  },
  content: {
    gap: 6,
  },
  name: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryBadge: {
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: '#c084fc',
    fontSize: 10,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: '#c084fc',
    fontSize: 12,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCount: {
    color: '#c084fc',
    fontSize: 12,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});