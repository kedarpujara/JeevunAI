import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const NotificationsScreen: React.FC = () => {
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReview, setWeeklyReview] = useState(false);
  const [insights, setInsights] = useState(true);
  const [streaks, setStreaks] = useState(true);
  const [sounds, setSounds] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Permission Status */}
        <View style={styles.statusCard}>
          <Ionicons name="notifications" size={24} color="#007AFF" />
          <Text style={styles.statusText}>Notifications are enabled</Text>
          <TouchableOpacity>
            <Text style={styles.statusAction}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REMINDERS</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Daily Journal Reminder</Text>
              <Text style={styles.rowDescription}>8:00 PM every day</Text>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={setDailyReminder}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Reminder Time</Text>
              <Text style={styles.rowDescription}>8:00 PM</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Weekly Review</Text>
              <Text style={styles.rowDescription}>Sunday summary of your week</Text>
            </View>
            <Switch
              value={weeklyReview}
              onValueChange={setWeeklyReview}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>
        </View>

        {/* Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVITY</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Insights & Patterns</Text>
              <Text style={styles.rowDescription}>When AI finds interesting patterns</Text>
            </View>
            <Switch
              value={insights}
              onValueChange={setInsights}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Streak Milestones</Text>
              <Text style={styles.rowDescription}>Celebrate your consistency</Text>
            </View>
            <Switch
              value={streaks}
              onValueChange={setStreaks}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Notification Sounds</Text>
              <Text style={styles.rowDescription}>Play sounds for notifications</Text>
            </View>
            <Switch
              value={sounds}
              onValueChange={setSounds}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            />
          </View>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Quiet Hours</Text>
              <Text style={styles.rowDescription}>10:00 PM - 8:00 AM</Text>
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  statusText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#000',
  },
  statusAction: {
    fontSize: 14,
    color: '#007AFF',
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
});