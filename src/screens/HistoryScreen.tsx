// app/history.tsx

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import EntryListItem from '../components/EntryListItem';
import SegmentedControl from '../components/SegmentedControl';
import { theme } from '../constants/theme';
import { useJournal } from '../context/JournalContext';
import { entriesService } from '../services/entries';
import { Entry, GroupedEntries, ViewMode } from '../types/journal';
import { formatDisplayDate } from '../utils/format';


import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import EntryDetailSheet, { EntryDetailSheetRef } from '../components/EntryDetailSheet';

export default function HistoryScreen() {
  const router = useRouter();
  const { entries, refreshEntries, deleteEntry } = useJournal();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [groupedEntries, setGroupedEntries] = useState<GroupedEntries>({});
  const [refreshing, setRefreshing] = useState(false);

  // bottom sheet
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const sheetRef = useRef<EntryDetailSheetRef>(null);

  const presentDetails = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    requestAnimationFrame(() => sheetRef.current?.present?.());
  }, []);

  const closeDetails = useCallback(() => sheetRef.current?.dismiss?.(), []);

  const parseYMD = (ymd: string) => {
    // ymd = 'YYYY-MM-DD'
    const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10));
    return new Date(y, m - 1, d); // local, no UTC shift
  };

  useEffect(() => { loadGroupedEntries(); }, [entries, viewMode]);

  const loadGroupedEntries = async () => {
    let grouped: GroupedEntries = {};
    switch (viewMode) {
      case 'day':
        grouped = await entriesService.groupEntriesByDay();
        break;
      case 'week':
        grouped = await entriesService.groupEntriesByWeek();
        break;
      case 'month':
        grouped = await entriesService.groupEntriesByMonth();
        break;
    }
    setGroupedEntries(grouped);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEntries();
    setRefreshing(false);
  }, [refreshEntries]);

  const handleEntryPress = (entry: Entry) => {
    presentDetails(entry);
  };

  const handleEntryDelete = (entry: Entry) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(entry.id);
          if (selectedEntry?.id === entry.id) {
            closeDetails();
            setSelectedEntry(null);
          }
        },
      },
    ]);
  };

  const renderDayView = () => {
    if (entries.length === 0) {
      return (
        <EmptyState
          icon="book-outline"
          title="No entries yet"
          message="Start journaling to see your thoughts here"
          actionLabel="Create Entry"
          onAction={() => router.push('/')}
        />
      );
    }
    return (
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EntryListItem
            entry={item}
            onPress={() => handleEntryPress(item)}
            onDelete={() => handleEntryDelete(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
      />
    );
  };

  const renderWeekView = () => {
    const weeks = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));
    if (weeks.length === 0) {
      return <EmptyState icon="calendar-outline" title="No weekly data" message="Create entries to see weekly summaries" />;
    }
    return (
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
      >
        {weeks.map((weekStart) => {
          const weekEntries = groupedEntries[weekStart];
          const avgMood = weekEntries.reduce((sum, e) => sum + (e.mood || 3), 0) / weekEntries.length;

          const tagCounts = new Map<string, number>();
          weekEntries.forEach(e => (e.tags ?? []).forEach(t => tagCounts.set(t.name, (tagCounts.get(t.name) || 0) + 1)));
          const topTag = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

          return (
            <Card key={weekStart} style={styles.weekCard}>
              <Text style={styles.weekTitle}>Week of {formatDisplayDate(weekStart)}</Text>
              <View style={styles.weekStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{weekEntries.length}</Text>
                  <Text style={styles.statLabel}>Entries</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{avgMood.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Avg Mood</Text>
                </View>
                {topTag && (
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>#{topTag}</Text>
                    <Text style={styles.statLabel}>Top Tag</Text>
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    );
  };

  const renderMonthView = () => {
    // 1) Collapse arbitrary keys in groupedEntries to unique month buckets (YYYY-MM)
    const monthMap = new Map<string, Entry[]>();

    Object.entries(groupedEntries).forEach(([key, list]) => {
      const d = parseYMD(key);                    // key might be any YYYY-MM-DD
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const prev = monthMap.get(monthKey) ?? [];
      monthMap.set(monthKey, prev.concat(list));
    });

    // 2) Sort month keys newest → oldest
    const months = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));

    if (months.length === 0) {
      return (
        <EmptyState
          icon="calendar-outline"
          title="No monthly data"
          message="Create entries to see monthly summaries"
        />
      );
    }

    const getMoodColor = (mood: number): string => {
      const colors = [
        theme.colors.mood1,
        theme.colors.mood2,
        theme.colors.mood3,
        theme.colors.mood4,
        theme.colors.mood5,
      ];
      return colors[Math.min(Math.max(mood - 1, 0), 4)];
    };

    return (
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {months.map((monthKey) => {
          const monthEntries = monthMap.get(monthKey)!;

          // Build a Date for the 1st of this month for calendar math + nice title
          const [y, m] = monthKey.split('-').map((n) => parseInt(n, 10));
          const monthStartDate = new Date(y, m - 1, 1);
          const monthName = monthStartDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          });

          // Calendar shape
          const daysInMonth = new Date(y, m, 0).getDate(); // last day of month
          const firstDay = new Date(y, m - 1, 1).getDay();

          // Map entries by day number within this month
          const entriesByDay = new Map<number, Entry[]>();
          monthEntries.forEach((e) => {
            const ed = parseYMD(e.date);
            if (ed.getFullYear() !== y || ed.getMonth() !== m - 1) return; // safety
            const dd = ed.getDate();
            const arr = entriesByDay.get(dd) ?? [];
            arr.push(e);
            entriesByDay.set(dd, arr);
          });

          return (
            <Card key={monthKey} style={styles.monthCard}>
              <Text style={styles.monthTitle}>{monthName}</Text>

              <View style={styles.calendarGrid}>
                {/* day labels */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={i} style={styles.dayLabel}>
                    {d}
                  </Text>
                ))}

                {/* leading empties */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}

                {/* days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEntries = entriesByDay.get(day) || [];
                  const has = dayEntries.length > 0;
                  const avgMood = has
                    ? dayEntries.reduce((s, e) => s + (e.mood || 3), 0) / dayEntries.length
                    : 0;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayCell, has && styles.dayCellActive]}
                      onPress={() => has && presentDetails(dayEntries[0])}
                      activeOpacity={has ? 0.7 : 1}
                    >
                      <Text style={[styles.dayNumber, has && styles.dayNumberActive]}>{day}</Text>
                      {has && (
                        <View
                          style={[
                            styles.dayDot,
                            { backgroundColor: theme.colors.primary },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.monthStats}>
                <Text style={styles.monthStatText}>
                  {monthEntries.length} entries this month
                </Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <BottomSheetModalProvider>
      <View style={styles.container}>
        <SegmentedControl
          options={['Day', 'Week', 'Month']}
          selectedIndex={viewMode === 'day' ? 0 : viewMode === 'week' ? 1 : 2}
          onChange={(i) => setViewMode(['day', 'week', 'month'][i] as ViewMode)}
          style={styles.segmentedControl}
          activeColor={theme.colors.primary}
          activeBackground={theme.colors.surface}
        />

        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}

        <EntryDetailSheet ref={sheetRef} entry={selectedEntry} onDismiss={() => setSelectedEntry(null)} />
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  segmentedControl: { marginHorizontal: theme.spacing.lg, marginVertical: theme.spacing.md },
  scrollView: { flex: 1 },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },

  // week
  weekCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  weekTitle: { ...theme.typography.h2, marginBottom: theme.spacing.md },
  weekStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.spacing.md },
  stat: { alignItems: 'center' },
  statValue: { ...theme.typography.h2, color: theme.colors.primary },
  statLabel: { ...theme.typography.caption, marginTop: theme.spacing.xs },

  // month
  monthCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  monthTitle: { ...theme.typography.h2, marginBottom: theme.spacing.lg },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayLabel: { width: `${100 / 7}%`, textAlign: 'center', ...theme.typography.caption, marginBottom: theme.spacing.sm, fontWeight: '600' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xs },
  dayCellActive: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm },
  dayNumber: { ...theme.typography.body, color: theme.colors.textSecondary },
  dayNumberActive: { color: theme.colors.text, fontWeight: '600' },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  monthStats: { marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  monthStatText: { ...theme.typography.body, color: theme.colors.textSecondary },
});