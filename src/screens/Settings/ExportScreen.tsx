import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ExportFormat = 'pdf' | 'json' | 'markdown' | 'txt';

export const ExportScreen: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeLocation, setIncludeLocation] = useState(false);

  const formats = [
    { id: 'pdf', label: 'PDF', description: 'Best for printing and sharing' },
    { id: 'json', label: 'JSON', description: 'For developers and backups' },
    { id: 'markdown', label: 'Markdown', description: 'For note-taking apps' },
    { id: 'txt', label: 'Plain Text', description: 'Universal compatibility' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Export Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EXPORT FORMAT</Text>
          
          {formats.map((format) => (
            <TouchableOpacity
              key={format.id}
              style={styles.formatRow}
              onPress={() => setSelectedFormat(format.id as ExportFormat)}
            >
              <View style={styles.radioOuter}>
                {selectedFormat === format.id && <View style={styles.radioInner} />}
              </View>
              <View style={styles.formatInfo}>
                <Text style={styles.formatLabel}>{format.label}</Text>
                <Text style={styles.formatDescription}>{format.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Data Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INCLUDE IN EXPORT</Text>
          
          <TouchableOpacity 
            style={styles.checkRow}
            onPress={() => setIncludePhotos(!includePhotos)}
          >
            <View style={styles.checkbox}>
              {includePhotos && <Ionicons name="checkmark" size={18} color="#007AFF" />}
            </View>
            <View style={styles.checkInfo}>
              <Text style={styles.checkLabel}>Photos</Text>
              <Text style={styles.checkDescription}>Include all attached photos</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.checkRow}
            onPress={() => setIncludeLocation(!includeLocation)}
          >
            <View style={styles.checkbox}>
              {includeLocation && <Ionicons name="checkmark" size={18} color="#007AFF" />}
            </View>
            <View style={styles.checkInfo}>
              <Text style={styles.checkLabel}>Location Data</Text>
              <Text style={styles.checkDescription}>Include location information</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Date Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATE RANGE</Text>
          
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowTitle}>All Time</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={styles.dateInfo}>
            <Text style={styles.dateInfoText}>
              127 entries from Jan 1, 2024 to Today
            </Text>
          </View>
        </View>

        {/* Export Size Estimate */}
        <View style={styles.estimateCard}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.estimateText}>
            Estimated export size: ~45 MB
          </Text>
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download-outline" size={20} color="#FFF" />
          <Text style={styles.exportButtonText}>Export Entries</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="mail-outline" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Email to Myself</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="print-outline" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Print</Text>
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
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  formatInfo: {
    flex: 1,
  },
  formatLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 2,
  },
  formatDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkInfo: {
    flex: 1,
  },
  checkLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 2,
  },
  checkDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  rowTitle: {
    fontSize: 16,
    color: '#000',
  },
  dateInfo: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dateInfoText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  estimateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
  },
  estimateText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 20,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionText: {
    color: '#007AFF',
    fontSize: 15,
    marginLeft: 6,
  },
});