// app/settings/privacy.tsx (or wherever PrivacyScreen lives)

import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const PrivacyScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.updated}>Effective Date: September 2, 2025</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          • Journal entries (text, photos, audio, and other content){'\n'}
          • Account details (display name, email, profile photo){'\n'}
          • Optional analytics and crash data (with consent)
        </Text>

        <Text style={styles.sectionTitle}>2. How We Store & Protect Data</Text>
        <Text style={styles.paragraph}>
          By default, all entries are stored locally on your device. If you enable cloud sync, your
          entries are encrypted end-to-end before leaving your device. We cannot read your content.
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Data</Text>
        <Text style={styles.paragraph}>
          We use data only to provide and improve Jeevun. We never sell your data or use journal
          content for advertising.
        </Text>

        <Text style={styles.sectionTitle}>4. Sharing With Third Parties</Text>
        <Text style={styles.paragraph}>
          We may share limited technical data with trusted providers (like cloud hosting) only to
          operate the service. They are bound by confidentiality agreements.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.paragraph}>
          • Export: You can export your journal anytime.{'\n'}
          • Delete: You may permanently delete your entries or account.{'\n'}
          • Local-Only Mode: Keep all data stored on-device only.
        </Text>

        <Text style={styles.sectionTitle}>6. Children’s Privacy</Text>
        <Text style={styles.paragraph}>
          Jeevun is not intended for children under 13.
        </Text>

        <Text style={styles.sectionTitle}>7. Updates</Text>
        <Text style={styles.paragraph}>
          We may update this policy occasionally. Significant changes will be announced in-app.
        </Text>

        <Text style={styles.sectionTitle}>8. Contact</Text>
        <Text style={styles.paragraph}>
          Questions? Contact us at privacy@jeevun.ai
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, color: '#000' },
  updated: { fontSize: 13, color: '#666', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 6, color: '#000' },
  paragraph: { fontSize: 14, color: '#333', lineHeight: 20 },
});