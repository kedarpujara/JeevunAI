import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

export const BillingScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current Plan */}
        <View style={styles.planCard}>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>FREE PLAN</Text>
          </View>
          <Text style={styles.planTitle}>Quill Basic</Text>
          <Text style={styles.planDescription}>
            Unlimited journal entries with AI-powered insights
          </Text>
          
          <View style={styles.planFeatures}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Unlimited entries</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Voice transcription</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Basic AI insights</Text>
            </View>
          </View>
        </View>

        {/* Upgrade Option */}
        <View style={styles.upgradeCard}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
          <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
          <Text style={styles.upgradePrice}>$4.99/month</Text>
          
          <View style={styles.proFeatures}>
            <Text style={styles.proFeature}>✨ Advanced AI analytics</Text>
            <Text style={styles.proFeature}>☁️ Unlimited cloud storage</Text>
            <Text style={styles.proFeature}>🎨 Custom themes</Text>
            <Text style={styles.proFeature}>📊 Detailed mood insights</Text>
            <Text style={styles.proFeature}>🔒 Priority support</Text>
          </View>

          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Start Free Trial</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Management */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowTitle}>Restore Purchases</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowTitle}>Redeem Code</Text>
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
  planCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  planBadge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 20,
  },
  planFeatures: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#000',
    marginLeft: 10,
  },
  upgradeCard: {
    backgroundColor: theme.colors.primary,  
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  proBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  upgradePrice: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FFF',
    opacity: 0.9,
    marginBottom: 20,
  },
  proFeatures: {
    marginBottom: 20,
  },
  proFeature: {
    fontSize: 15,
    color: '#FFF',
    marginBottom: 8,
  },
  upgradeButton: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  section: {
    backgroundColor: '#FFF',
    marginBottom: 20,
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
    color: theme.colors.primary,
  },
});