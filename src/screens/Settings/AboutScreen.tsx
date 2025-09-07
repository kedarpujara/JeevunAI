import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const AboutScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.header}>
          <View style={styles.appIcon}>
            <Ionicons name="journal" size={48} color="#007AFF" />
          </View>
          <Text style={styles.appName}>Jeevun</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appTagline}>
            Your AI-powered voice journaling companion
          </Text>
        </View>

        {/* Links */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.row}>
            <Ionicons name="document-text-outline" size={20} color="#666" />
            <Text style={styles.rowTitle}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            <Text style={styles.rowTitle}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <Ionicons name="star-outline" size={20} color="#666" />
            <Text style={styles.rowTitle}>Rate Jeevun</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <Ionicons name="share-outline" size={20} color="#666" />
            <Text style={styles.rowTitle}>Share Jeevun</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Social */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONNECT</Text>
          
          <TouchableOpacity style={styles.row}>
            <Ionicons name="logo-twitter" size={20} color="#666" />
            <Text style={styles.rowTitle}>Follow on Twitter</Text>
            <Ionicons name="open-outline" size={16} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <Ionicons name="globe-outline" size={20} color="#666" />
            <Text style={styles.rowTitle}>Visit Website</Text>
            <Ionicons name="open-outline" size={16} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <Text style={styles.rowTitle}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Credits */}
        <View style={styles.credits}>
          <Text style={styles.creditsText}>Made with ❤️ in San Francisco</Text>
          <Text style={styles.copyright}>© 2025 Jeevun. All rights reserved.</Text>
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
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFF',
    marginBottom: 20,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  appTagline: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
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
  rowTitle: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  credits: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  creditsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    color: '#8E8E93',
  },
});