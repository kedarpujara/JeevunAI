import { Ionicons } from '@expo/vector-icons';
import { default as React, useState } from 'react';
import {
    ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const BackupScreen: React.FC = () => {
  const [cloudSync, setCloudSync] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Sync Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="cloud-outline" size={32} color="#8E8E93" />
            <Text style={styles.statusTitle}>Cloud Sync Disabled</Text>
            <Text style={styles.statusSubtitle}>Your data is stored locally only</Text>
          </View>
          <TouchableOpacity style={styles.enableButton}>
            <Text style={styles.enableButtonText}>Enable Cloud Sync</Text>
          </TouchableOpacity>
        </View>

        {/* Cloud Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLOUD SETTINGS</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>iCloud Sync</Text>
              <Text style={styles.rowDescription}>Sync across all your devices</Text>
            </View>
            <Switch
              value={cloudSync}
              onValueChange={setCloudSync}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Auto Backup</Text>
              <Text style={styles.rowDescription}>Daily at 2:00 AM</Text>
            </View>
            <Switch
              value={autoBackup}
              onValueChange={setAutoBackup}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>WiFi Only</Text>
              <Text style={styles.rowDescription}>Don't use cellular data</Text>
            </View>
            <Switch
              value={wifiOnly}
              onValueChange={setWifiOnly}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>
        </View>

        {/* Backup Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BACKUP INFORMATION</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Backup</Text>
            <Text style={styles.infoValue}>Today, 2:00 AM</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Backup Size</Text>
            <Text style={styles.infoValue}>124 MB</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Entries Backed Up</Text>
            <Text style={styles.infoValue}>127</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Photos Included</Text>
            <Text style={styles.infoValue}>Yes (43 photos)</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Backup Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Restore from Backup</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
              Delete All Backups
            </Text>
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
  statusCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  enableButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  enableButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  rowLeft: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  rowDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  infoLabel: {
    fontSize: 16,
    color: '#000',
  },
  infoValue: {
    fontSize: 16,
    color: '#8E8E93',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
  },
});