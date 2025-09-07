import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const StorageScreen: React.FC = () => {
  const storageData = [
    { label: 'Text Entries', size: '12.4 MB', color: '#007AFF' },
    { label: 'Photos', size: '89.2 MB', color: '#34C759' },
    { label: 'Voice Recordings', size: '23.1 MB', color: '#FF9500' },
    { label: 'App Data', size: '2.3 MB', color: '#8E8E93' },
  ];

  const totalSize = '127 MB';
  const availableSpace = '45.3 GB';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Storage Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.storageBar}>
            <View style={[styles.storageUsed, { width: '15%' }]} />
          </View>
          <View style={styles.storageInfo}>
            <View>
              <Text style={styles.storageLabel}>Used</Text>
              <Text style={styles.storageValue}>{totalSize}</Text>
            </View>
            <View>
              <Text style={styles.storageLabel}>Available</Text>
              <Text style={styles.storageValue}>{availableSpace}</Text>
            </View>
          </View>
        </View>

        {/* Storage Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STORAGE BREAKDOWN</Text>
          
          {storageData.map((item, index) => (
            <View key={index} style={styles.storageRow}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={styles.storageRowLabel}>{item.label}</Text>
              <Text style={styles.storageRowSize}>{item.size}</Text>
            </View>
          ))}
        </View>

        {/* Cache Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CACHE & TEMPORARY FILES</Text>
          
          <View style={styles.cacheRow}>
            <View>
              <Text style={styles.cacheLabel}>Cache Size</Text>
              <Text style={styles.cacheDescription}>Temporary files and thumbnails</Text>
            </View>
            <Text style={styles.cacheSize}>8.2 MB</Text>
          </View>

          <TouchableOpacity style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Storage Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STORAGE OPTIONS</Text>
          
          <TouchableOpacity style={styles.optionRow}>
            <Ionicons name="images-outline" size={20} color="#666" />
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Optimize Photo Storage</Text>
              <Text style={styles.optionDescription}>
                Compress photos to save space
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow}>
            <Ionicons name="trash-outline" size={20} color="#666" />
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Auto-Delete Old Entries</Text>
              <Text style={styles.optionDescription}>
                Remove entries older than 1 year
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow}>
            <Ionicons name="cloud-outline" size={20} color="#666" />
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Offload to Cloud</Text>
              <Text style={styles.optionDescription}>
                Keep recent entries on device
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  overviewCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  storageBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 16,
  },
  storageUsed: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  storageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  storageValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    backgroundColor: '#FFF',
    marginBottom: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  storageRowLabel: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  storageRowSize: {
    fontSize: 16,
    color: '#8E8E93',
  },
  cacheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  cacheLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  cacheDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  cacheSize: {
    fontSize: 16,
    color: '#8E8E93',
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  optionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
});