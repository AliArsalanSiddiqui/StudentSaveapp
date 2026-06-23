// components/LocationSearchBar.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Search, MapPin, Navigation, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { searchPlaces, reverseGeocode, NominatimResult } from '@/lib/nominatim';

interface LocationSearchBarProps {
  placeholder?: string;
  onLocationSelect: (lat: number, lon: number, name: string) => void;
  initialValue?: string;
  cityBias?: string;
}

export default function LocationSearchBar({
  placeholder = 'Search location...',
  onLocationSelect,
  initialValue = '',
  cityBias,
}: LocationSearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const inputRef = useRef<TextInput>(null);

  const handleChangeText = (text: string) => {
    setQuery(text);

    if (!text || text.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setShowDropdown(true);

    searchPlaces(text, cityBias).then((data) => {
      if (currentRequestId === requestIdRef.current) {
        setResults(data);
        setLoading(false);
      }
    });
  };

  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setQuery(result.display_name);
    setShowDropdown(false);
    setResults([]);
    onLocationSelect(lat, lon, result.display_name);
  };

  const handleUseCurrentLocation = async () => {
    setGpsLoading(true);
    setShowDropdown(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const cityName = await reverseGeocode(latitude, longitude);
      const name = cityName || 'Current Location';

      setQuery(name);
      onLocationSelect(latitude, longitude, name);
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputContainer}>
        <Search color="#c084fc" size={18} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#c084fc"
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            // Small delay so taps on dropdown items still register
            setTimeout(() => setShowDropdown(false), 150);
          }}
          autoCorrect={false}
          autoComplete="off"
        />
        {loading && <ActivityIndicator size="small" color="#c084fc" />}
        {!loading && query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X color="#c084fc" size={16} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.currentLocationItem}
            onPress={handleUseCurrentLocation}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color="#c084fc" />
            ) : (
              <Navigation color="#c084fc" size={18} />
            )}
            <Text style={styles.currentLocationText}>Use Current Location</Text>
          </TouchableOpacity>

          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id.toString()}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectResult(item)}
              >
                <MapPin color="#c084fc" size={16} style={{ marginTop: 2 }} />
                <Text style={styles.resultText} numberOfLines={2}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !loading ? (
                <Text style={styles.emptyText}>No results found</Text>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 999 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    color: 'white',
    paddingVertical: 12,
    fontSize: 14,
  },
  clearButton: { padding: 4 },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxHeight: 360,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  currentLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  currentLocationText: { color: '#c084fc', fontSize: 14, fontWeight: '600' },
  resultItem: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  resultText: { color: 'white', fontSize: 13, flex: 1, lineHeight: 18 },
  emptyText: { color: '#c084fc', textAlign: 'center', padding: 20, fontSize: 13 },
});