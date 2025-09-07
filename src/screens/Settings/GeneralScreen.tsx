import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const GeneralScreen: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Dark Mode</Text>
              <Text style={styles.rowDescription}>Easier on the eyes at night</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>App Icon</Text>
              <Text style={styles.rowDescription}>Default</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Font Size</Text>
              <Text style={styles.rowDescription}>Medium</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Journal Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>JOURNAL SETTINGS</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Auto-Save</Text>
              <Text style={styles.rowDescription}>Save entries automatically</Text>
            </View>
            <Switch
              value={autoSave}
              onValueChange={setAutoSave}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Smart Suggestions</Text>
              <Text style={styles.rowDescription}>AI-powered writing prompts</Text>
            </View>
            <Switch
              value={smartSuggestions}
              onValueChange={setSmartSuggestions}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Default Entry Time</Text>
              <Text style={styles.rowDescription}>Current time</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Audio Quality</Text>
              <Text style={styles.rowDescription}>High</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* System */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYSTEM</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Haptic Feedback</Text>
              <Text style={styles.rowDescription}>Vibration on actions</Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Language</Text>
              <Text style={styles.rowDescription}>English</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Date Format</Text>
              <Text style={styles.rowDescription}>MM/DD/YYYY</Text>
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
});