// app/history.tsx - V2 improvements

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

// New interfaces for V2
interface DailySummary {
  date: string;
  entries: Entry[];
  summary?: string;
  keyMoments: string[];
  avgMood: number;
  tags: string[];
}

interface WeeklySummary {
  weekStart: string;
  entries: Entry[];
  summary?: string;
  people: string[];
  activities: string[];
  highlights: string[];
  lowlights: string[];
  avgMood: number;
  topTags: string[];
}

export default function HistoryScreen() {
  const router = useRouter();
  const { entries, refreshEntries, deleteEntry } = useJournal();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [groupedEntries, setGroupedEntries] = useState<GroupedEntries>({});
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

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
    // Create a date in local timezone at noon to avoid DST issues
    return new Date(y, m - 1, d, 12, 0, 0); 
  };

  useEffect(() => {
    loadGroupedEntries();
  }, [entries, viewMode]);

  const loadGroupedEntries = async () => {
    let grouped: GroupedEntries = {};
    switch (viewMode) {
      case 'day':
        grouped = await entriesService.groupEntriesByDay();
        await loadDailySummaries(grouped);
        break;
      case 'week':
        grouped = await entriesService.groupEntriesByWeek();
        await loadWeeklySummaries(grouped);
        break;
      case 'month':
        grouped = await entriesService.groupEntriesByMonth();
        break;
    }
    setGroupedEntries(grouped);
  };

  // Generate daily summaries for improved day view
  const loadDailySummaries = async (grouped: GroupedEntries) => {
    const summaries: DailySummary[] = [];
    
    for (const [date, dayEntries] of Object.entries(grouped)) {
      if (dayEntries.length === 0) continue;

      const avgMood = dayEntries.reduce((sum, e) => sum + (e.mood || 3), 0) / dayEntries.length;
      const allTags = dayEntries.flatMap(e => e.tags?.map(t => t.name) || []);
      const uniqueTags = [...new Set(allTags)];
      
      // Simple key moments extraction (could be enhanced with AI)
      const keyMoments = dayEntries
        .filter(e => e.body.length > 50) // Only substantial entries
        .map(e => e.title)
        .slice(0, 3);

      // Generate a simple summary (could be enhanced with AI)
      const summary = generateDailySummary(dayEntries);

      summaries.push({
        date,
        entries: dayEntries,
        summary,
        keyMoments,
        avgMood,
        tags: uniqueTags
      });
    }

    // Sort by date, newest first
    summaries.sort((a, b) => b.date.localeCompare(a.date));
    setDailySummaries(summaries);
  };

  // Generate weekly summaries for improved week view
  const loadWeeklySummaries = async (grouped: GroupedEntries) => {
    const weeklySummariesMap = new Map<string, WeeklySummary>();

    // Group entries by week
    for (const [date, dayEntries] of Object.entries(grouped)) {
      const entryDate = parseYMD(date);
      const weekStart = getWeekStart(entryDate);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklySummariesMap.has(weekKey)) {
        weeklySummariesMap.set(weekKey, {
          weekStart: weekKey,
          entries: [],
          people: [],
          activities: [],
          highlights: [],
          lowlights: [],
          avgMood: 0,
          topTags: []
        });
      }

      const weekSummary = weeklySummariesMap.get(weekKey)!;
      weekSummary.entries.push(...dayEntries);
    }

    // Process each week's data
    const summaries: WeeklySummary[] = [];
    for (const weekSummary of weeklySummariesMap.values()) {
      if (weekSummary.entries.length === 0) continue;

      // Calculate average mood
      weekSummary.avgMood = weekSummary.entries.reduce((sum, e) => sum + (e.mood || 3), 0) / weekSummary.entries.length;

      // Extract top tags
      const tagCounts = new Map<string, number>();
      weekSummary.entries.forEach(e => {
        e.tags?.forEach(t => {
          tagCounts.set(t.name, (tagCounts.get(t.name) || 0) + 1);
        });
      });
      weekSummary.topTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);

      // Generate AI-enhanced summary (simplified for now)
      weekSummary.summary = generateWeeklySummary(weekSummary.entries);
      weekSummary.people = extractPeople(weekSummary.entries);
      weekSummary.activities = extractActivities(weekSummary.entries);
      weekSummary.highlights = extractHighlights(weekSummary.entries);
      weekSummary.lowlights = extractLowlights(weekSummary.entries);

      summaries.push(weekSummary);
    }

    // Sort by week start, newest first
    summaries.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    setWeeklySummaries(summaries);
  };

  // Helper functions for summary generation
  const getWeekStart = (date: Date): Date => {
    const result = new Date(date);
    const day = result.getDay();
    result.setDate(result.getDate() - day);
    return result;
  };

  const generateDailySummary = (entries: Entry[]): string => {
    if (entries.length === 1) {
      return entries[0].body.substring(0, 100) + (entries[0].body.length > 100 ? '...' : '');
    }
    return `${entries.length} entries covering various moments throughout the day.`;
  };

  const generateWeeklySummary = (entries: Entry[]): string => {
    const themes = entries.flatMap(e => e.themes || []);
    const uniqueThemes = [...new Set(themes)].slice(0, 3);
    
    if (uniqueThemes.length > 0) {
      return `A week focused on ${uniqueThemes.join(', ')} with ${entries.length} journal entries.`;
    }
    return `A week with ${entries.length} journal entries covering various experiences.`;
  };

  const extractPeople = (entries: Entry[]): string[] => {
    // Simple extraction - look for common name patterns
    const people = new Set<string>();
    entries.forEach(entry => {
      const words = entry.body.split(/\s+/);
      words.forEach(word => {
        // Look for capitalized words that might be names (simplified)
        if (/^[A-Z][a-z]+$/.test(word) && word.length > 2) {
          people.add(word);
        }
      });
    });
    return Array.from(people).slice(0, 5);
  };

  const extractActivities = (entries: Entry[]): string[] => {
    const activities = new Set<string>();
    entries.forEach(entry => {
      // Look for activity-related keywords in tags and content
      entry.tags?.forEach(tag => {
        if (['work', 'exercise', 'travel', 'social', 'hobby'].includes(tag.name.toLowerCase())) {
          activities.add(tag.name);
        }
      });
    });
    return Array.from(activities).slice(0, 5);
  };

  const extractHighlights = (entries: Entry[]): string[] => {
    // Look for positive sentiment entries or high mood scores
    const highlights = entries
      .filter(e => (e.mood && e.mood >= 4) || (e.sentiment && e.sentiment > 0.3))
      .map(e => e.title)
      .slice(0, 3);
    return highlights;
  };

  const extractLowlights = (entries: Entry[]): string[] => {
    // Look for negative sentiment entries or low mood scores
    const lowlights = entries
      .filter(e => (e.mood && e.mood <= 2) || (e.sentiment && e.sentiment < -0.3))
      .map(e => e.title)
      .slice(0, 3);
    return lowlights;
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

  const toggleDayExpansion = (date: string) => {
    setExpandedDay(expandedDay === date ? null : date);
  };

  // V2 Day View - Single preview per day with expansion
  const renderDayView = () => {
    if (dailySummaries.length === 0) {
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
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
      >
        {dailySummaries.map((day) => (
          <Card key={day.date} style={styles.dayCard}>
            <TouchableOpacity onPress={() => toggleDayExpansion(day.date)}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{formatDisplayDate(day.date)}</Text>
                <View style={styles.dayMeta}>
                  <Text style={styles.dayStats}>
                    {day.entries.length} {day.entries.length === 1 ? 'entry' : 'entries'} • Mood {day.avgMood.toFixed(1)}
                  </Text>
                </View>
              </View>
              
              {day.summary && (
                <Text style={styles.daySummary} numberOfLines={expandedDay === day.date ? undefined : 2}>
                  {day.summary}
                </Text>
              )}

              {day.keyMoments.length > 0 && (
                <View style={styles.keyMoments}>
                  {day.keyMoments.map((moment, idx) => (
                    <Text key={idx} style={styles.keyMoment}>• {moment}</Text>
                  ))}
                </View>
              )}

              {day.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {day.tags.slice(0, 3).map((tag, idx) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                  {day.tags.length > 3 && (
                    <Text style={styles.moreTagsText}>+{day.tags.length - 3} more</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* Expanded entries list */}
            {expandedDay === day.date && (
              <View style={styles.expandedEntries}>
                <View style={styles.entriesDivider} />
                {day.entries.map((entry) => (
                  <EntryListItem
                    key={entry.id}
                    entry={entry}
                    onPress={() => handleEntryPress(entry)}
                    onDelete={() => handleEntryDelete(entry)}
                    style={styles.expandedEntry}
                  />
                ))}
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
    );
  };

  // V2 Week View - Enhanced with comprehensive summaries
  const renderWeekView = () => {
    if (weeklySummaries.length === 0) {
      return <EmptyState icon="calendar-outline" title="No weekly data" message="Create entries to see weekly summaries" />;
    }

    return (
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
      >
        {weeklySummaries.map((week) => (
          <Card key={week.weekStart} style={styles.weekCard}>
            <Text style={styles.weekTitle}>Week of {formatDisplayDate(week.weekStart)}</Text>
            
            {/* Basic stats */}
            <View style={styles.weekStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{week.entries.length}</Text>
                <Text style={styles.statLabel}>Entries</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{week.avgMood.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Avg Mood</Text>
              </View>
              {week.topTags[0] && (
                <View style={styles.stat}>
                  <Text style={styles.statValue}>#{week.topTags[0]}</Text>
                  <Text style={styles.statLabel}>Top Tag</Text>
                </View>
              )}
            </View>

            {/* Weekly summary */}
            {week.summary && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <Text style={styles.summaryText}>{week.summary}</Text>
              </View>
            )}

            {/* People */}
            {week.people.length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>People</Text>
                <Text style={styles.summaryText}>{week.people.join(', ')}</Text>
              </View>
            )}

            {/* Activities */}
            {week.activities.length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Activities</Text>
                <Text style={styles.summaryText}>{week.activities.join(', ')}</Text>
              </View>
            )}

            {/* Highlights */}
            {week.highlights.length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Highlights</Text>
                {week.highlights.map((highlight, idx) => (
                  <Text key={idx} style={styles.highlightText}>• {highlight}</Text>
                ))}
              </View>
            )}

            {/* Lowlights */}
            {week.lowlights.length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Challenges</Text>
                {week.lowlights.map((lowlight, idx) => (
                  <Text key={idx} style={styles.lowlightText}>• {lowlight}</Text>
                ))}
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
    );
  };

  const renderMonthView = () => {
    // Keep existing month view implementation for now
    const monthMap = new Map<string, Entry[]>();

    Object.entries(groupedEntries).forEach(([key, list]) => {
      const d = parseYMD(key);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const prev = monthMap.get(monthKey) ?? [];
      monthMap.set(monthKey, prev.concat(list));
    });

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
          const [y, m] = monthKey.split('-').map((n) => parseInt(n, 10));
          const monthStartDate = new Date(y, m - 1, 1);
          const monthName = monthStartDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          });

          const daysInMonth = new Date(y, m, 0).getDate();
          const firstDay = new Date(y, m - 1, 1).getDay();

          const entriesByDay = new Map<number, Entry[]>();
          monthEntries.forEach((e) => {
            const ed = parseYMD(e.date);
            if (ed.getFullYear() !== y || ed.getMonth() !== m - 1) return;
            const dd = ed.getDate();
            const arr = entriesByDay.get(dd) ?? [];
            arr.push(e);
            entriesByDay.set(dd, arr);
          });

          return (
            <Card key={monthKey} style={styles.monthCard}>
              <Text style={styles.monthTitle}>{monthName}</Text>

              <View style={styles.calendarGrid}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={i} style={styles.dayLabel}>
                    {d}
                  </Text>
                ))}

                {Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEntries = entriesByDay.get(day) || [];
                  const has = dayEntries.length > 0;

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

  // V2 Day view styles
  dayCard: { 
    marginHorizontal: theme.spacing.lg, 
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg 
  },
  dayHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: theme.spacing.sm 
  },
  dayTitle: { 
    ...theme.typography.h3, 
    color: theme.colors.text,
    fontWeight: '600' 
  },
  dayMeta: { alignItems: 'flex-end' },
  dayStats: { 
    ...theme.typography.caption, 
    color: theme.colors.textSecondary 
  },
  daySummary: { 
    ...theme.typography.body, 
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20 
  },
  keyMoments: { marginBottom: theme.spacing.sm },
  keyMoment: { 
    ...theme.typography.caption, 
    color: theme.colors.text,
    marginBottom: 2 
  },
  tagRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    alignItems: 'center',
    gap: theme.spacing.xs 
  },
  tag: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  tagText: { 
    ...theme.typography.caption, 
    color: theme.colors.primary,
    fontWeight: '500' 
  },
  moreTagsText: { 
    ...theme.typography.caption, 
    color: theme.colors.textSecondary,
    fontStyle: 'italic' 
  },
  expandedEntries: { marginTop: theme.spacing.md },
  entriesDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  expandedEntry: { marginBottom: theme.spacing.sm },

  // V2 Week view styles
  weekCard: { 
    marginHorizontal: theme.spacing.lg, 
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg 
  },
  weekTitle: { ...theme.typography.h2, marginBottom: theme.spacing.md },
  weekStats: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border 
  },
  stat: { alignItems: 'center' },
  statValue: { ...theme.typography.h2, color: theme.colors.primary },
  statLabel: { ...theme.typography.caption, marginTop: theme.spacing.xs },
  
  summarySection: { marginBottom: theme.spacing.md },
  sectionTitle: { 
    ...theme.typography.body, 
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs 
  },
  summaryText: { 
    ...theme.typography.body, 
    color: theme.colors.textSecondary,
    lineHeight: 20 
  },
  highlightText: { 
    ...theme.typography.body, 
    color: '#059669',
    marginBottom: 2 
  },
  lowlightText: { 
    ...theme.typography.body, 
    color: '#DC2626',
    marginBottom: 2 
  },

  // Month view styles (unchanged)
  monthCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  monthTitle: { ...theme.typography.h2, marginBottom: theme.spacing.lg },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayLabel: { 
    width: `${100 / 7}%`, 
    textAlign: 'center', 
    ...theme.typography.caption, 
    marginBottom: theme.spacing.sm, 
    fontWeight: '600' 
  },
  dayCell: { 
    width: `${100 / 7}%`, 
    aspectRatio: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: theme.spacing.xs 
  },
  dayCellActive: { 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.radius.sm 
  },
  dayNumber: { 
    ...theme.typography.body, 
    color: '#000000', // Fixed: Make day numbers black for better visibility
    fontWeight: '500' 
  },
  dayNumberActive: { 
    color: theme.colors.text, 
    fontWeight: '600' 
  },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  monthStats: { 
    marginTop: theme.spacing.lg, 
    paddingTop: theme.spacing.md, 
    borderTopWidth: 1, 
    borderTopColor: theme.colors.border 
  },
  monthStatText: { 
    ...theme.typography.body, 
    color: theme.colors.textSecondary 
  },
});


// // app/history.tsx

// import { useRouter } from 'expo-router';
// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import Card from '../components/Card';
// import EmptyState from '../components/EmptyState';
// import EntryListItem from '../components/EntryListItem';
// import SegmentedControl from '../components/SegmentedControl';
// import { theme } from '../constants/theme';
// import { useJournal } from '../context/JournalContext';
// import { entriesService } from '../services/entries';
// import { Entry, GroupedEntries, ViewMode } from '../types/journal';
// import { formatDisplayDate } from '../utils/format';


// import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
// import EntryDetailSheet, { EntryDetailSheetRef } from '../components/EntryDetailSheet';

// export default function HistoryScreen() {
//   const router = useRouter();
//   const { entries, refreshEntries, deleteEntry } = useJournal();

//   const [viewMode, setViewMode] = useState<ViewMode>('day');
//   const [groupedEntries, setGroupedEntries] = useState<GroupedEntries>({});
//   const [refreshing, setRefreshing] = useState(false);

//   // bottom sheet
//   const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
//   const sheetRef = useRef<EntryDetailSheetRef>(null);

//   const presentDetails = useCallback((entry: Entry) => {
//     setSelectedEntry(entry);
//     requestAnimationFrame(() => sheetRef.current?.present?.());
//   }, []);

//   const closeDetails = useCallback(() => sheetRef.current?.dismiss?.(), []);

//   const parseYMD = (ymd: string) => {
//     // ymd = 'YYYY-MM-DD'
//     const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10));
//     return new Date(y, m - 1, d); // local, no UTC shift
//   };

//   useEffect(() => { loadGroupedEntries(); }, [entries, viewMode]);

//   const loadGroupedEntries = async () => {
//     let grouped: GroupedEntries = {};
//     switch (viewMode) {
//       case 'day':
//         grouped = await entriesService.groupEntriesByDay();
//         break;
//       case 'week':
//         grouped = await entriesService.groupEntriesByWeek();
//         break;
//       case 'month':
//         grouped = await entriesService.groupEntriesByMonth();
//         break;
//     }
//     setGroupedEntries(grouped);
//   };

//   const handleRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await refreshEntries();
//     setRefreshing(false);
//   }, [refreshEntries]);

//   const handleEntryPress = (entry: Entry) => {
//     presentDetails(entry);
//   };

//   const handleEntryDelete = (entry: Entry) => {
//     Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           await deleteEntry(entry.id);
//           if (selectedEntry?.id === entry.id) {
//             closeDetails();
//             setSelectedEntry(null);
//           }
//         },
//       },
//     ]);
//   };

//   const renderDayView = () => {
//     if (entries.length === 0) {
//       return (
//         <EmptyState
//           icon="book-outline"
//           title="No entries yet"
//           message="Start journaling to see your thoughts here"
//           actionLabel="Create Entry"
//           onAction={() => router.push('/')}
//         />
//       );
//     }
//     return (
//       <FlatList
//         data={entries}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item }) => (
//           <EntryListItem
//             entry={item}
//             onPress={() => handleEntryPress(item)}
//             onDelete={() => handleEntryDelete(item)}
//           />
//         )}
//         contentContainerStyle={styles.listContent}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
//         }
//       />
//     );
//   };

//   const renderWeekView = () => {
//     const weeks = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));
//     if (weeks.length === 0) {
//       return <EmptyState icon="calendar-outline" title="No weekly data" message="Create entries to see weekly summaries" />;
//     }
//     return (
//       <ScrollView
//         style={styles.scrollView}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
//       >
//         {weeks.map((weekStart) => {
//           const weekEntries = groupedEntries[weekStart];
//           const avgMood = weekEntries.reduce((sum, e) => sum + (e.mood || 3), 0) / weekEntries.length;

//           const tagCounts = new Map<string, number>();
//           weekEntries.forEach(e => (e.tags ?? []).forEach(t => tagCounts.set(t.name, (tagCounts.get(t.name) || 0) + 1)));
//           const topTag = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

//           return (
//             <Card key={weekStart} style={styles.weekCard}>
//               <Text style={styles.weekTitle}>Week of {formatDisplayDate(weekStart)}</Text>
//               <View style={styles.weekStats}>
//                 <View style={styles.stat}>
//                   <Text style={styles.statValue}>{weekEntries.length}</Text>
//                   <Text style={styles.statLabel}>Entries</Text>
//                 </View>
//                 <View style={styles.stat}>
//                   <Text style={styles.statValue}>{avgMood.toFixed(1)}</Text>
//                   <Text style={styles.statLabel}>Avg Mood</Text>
//                 </View>
//                 {topTag && (
//                   <View style={styles.stat}>
//                     <Text style={styles.statValue}>#{topTag}</Text>
//                     <Text style={styles.statLabel}>Top Tag</Text>
//                   </View>
//                 )}
//               </View>
//             </Card>
//           );
//         })}
//       </ScrollView>
//     );
//   };

//   const renderMonthView = () => {
//     // 1) Collapse arbitrary keys in groupedEntries to unique month buckets (YYYY-MM)
//     const monthMap = new Map<string, Entry[]>();

//     Object.entries(groupedEntries).forEach(([key, list]) => {
//       const d = parseYMD(key);                    // key might be any YYYY-MM-DD
//       const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
//       const prev = monthMap.get(monthKey) ?? [];
//       monthMap.set(monthKey, prev.concat(list));
//     });

//     // 2) Sort month keys newest → oldest
//     const months = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));

//     if (months.length === 0) {
//       return (
//         <EmptyState
//           icon="calendar-outline"
//           title="No monthly data"
//           message="Create entries to see monthly summaries"
//         />
//       );
//     }

//     const getMoodColor = (mood: number): string => {
//       const colors = [
//         theme.colors.mood1,
//         theme.colors.mood2,
//         theme.colors.mood3,
//         theme.colors.mood4,
//         theme.colors.mood5,
//       ];
//       return colors[Math.min(Math.max(mood - 1, 0), 4)];
//     };

//     return (
//       <ScrollView
//         style={styles.scrollView}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={handleRefresh}
//             tintColor={theme.colors.primary}
//           />
//         }
//       >
//         {months.map((monthKey) => {
//           const monthEntries = monthMap.get(monthKey)!;

//           // Build a Date for the 1st of this month for calendar math + nice title
//           const [y, m] = monthKey.split('-').map((n) => parseInt(n, 10));
//           const monthStartDate = new Date(y, m - 1, 1);
//           const monthName = monthStartDate.toLocaleDateString('en-US', {
//             month: 'long',
//             year: 'numeric',
//           });

//           // Calendar shape
//           const daysInMonth = new Date(y, m, 0).getDate(); // last day of month
//           const firstDay = new Date(y, m - 1, 1).getDay();

//           // Map entries by day number within this month
//           const entriesByDay = new Map<number, Entry[]>();
//           monthEntries.forEach((e) => {
//             const ed = parseYMD(e.date);
//             if (ed.getFullYear() !== y || ed.getMonth() !== m - 1) return; // safety
//             const dd = ed.getDate();
//             const arr = entriesByDay.get(dd) ?? [];
//             arr.push(e);
//             entriesByDay.set(dd, arr);
//           });

//           return (
//             <Card key={monthKey} style={styles.monthCard}>
//               <Text style={styles.monthTitle}>{monthName}</Text>

//               <View style={styles.calendarGrid}>
//                 {/* day labels */}
//                 {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
//                   <Text key={i} style={styles.dayLabel}>
//                     {d}
//                   </Text>
//                 ))}

//                 {/* leading empties */}
//                 {Array.from({ length: firstDay }).map((_, i) => (
//                   <View key={`empty-${i}`} style={styles.dayCell} />
//                 ))}

//                 {/* days */}
//                 {Array.from({ length: daysInMonth }).map((_, i) => {
//                   const day = i + 1;
//                   const dayEntries = entriesByDay.get(day) || [];
//                   const has = dayEntries.length > 0;
//                   const avgMood = has
//                     ? dayEntries.reduce((s, e) => s + (e.mood || 3), 0) / dayEntries.length
//                     : 0;

//                   return (
//                     <TouchableOpacity
//                       key={day}
//                       style={[styles.dayCell, has && styles.dayCellActive]}
//                       onPress={() => has && presentDetails(dayEntries[0])}
//                       activeOpacity={has ? 0.7 : 1}
//                     >
//                       <Text style={[styles.dayNumber, has && styles.dayNumberActive]}>{day}</Text>
//                       {has && (
//                         <View
//                           style={[
//                             styles.dayDot,
//                             { backgroundColor: theme.colors.primary },
//                           ]}
//                         />
//                       )}
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>

//               <View style={styles.monthStats}>
//                 <Text style={styles.monthStatText}>
//                   {monthEntries.length} entries this month
//                 </Text>
//               </View>
//             </Card>
//           );
//         })}
//       </ScrollView>
//     );
//   };

//   return (
//     <BottomSheetModalProvider>
//       <View style={styles.container}>
//         <SegmentedControl
//           options={['Day', 'Week', 'Month']}
//           selectedIndex={viewMode === 'day' ? 0 : viewMode === 'week' ? 1 : 2}
//           onChange={(i) => setViewMode(['day', 'week', 'month'][i] as ViewMode)}
//           style={styles.segmentedControl}
//           activeColor={theme.colors.primary}
//           activeBackground={theme.colors.surface}
//         />

//         {viewMode === 'day' && renderDayView()}
//         {viewMode === 'week' && renderWeekView()}
//         {viewMode === 'month' && renderMonthView()}

//         <EntryDetailSheet ref={sheetRef} entry={selectedEntry} onDismiss={() => setSelectedEntry(null)} />
//       </View>
//     </BottomSheetModalProvider>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: theme.colors.background },
//   segmentedControl: { marginHorizontal: theme.spacing.lg, marginVertical: theme.spacing.md },
//   scrollView: { flex: 1 },
//   listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },

//   // week
//   weekCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
//   weekTitle: { ...theme.typography.h2, marginBottom: theme.spacing.md },
//   weekStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.spacing.md },
//   stat: { alignItems: 'center' },
//   statValue: { ...theme.typography.h2, color: theme.colors.primary },
//   statLabel: { ...theme.typography.caption, marginTop: theme.spacing.xs },

//   // month
//   monthCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
//   monthTitle: { ...theme.typography.h2, marginBottom: theme.spacing.lg },
//   calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
//   dayLabel: { width: `${100 / 7}%`, textAlign: 'center', ...theme.typography.caption, marginBottom: theme.spacing.sm, fontWeight: '600' },
//   dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xs },
//   dayCellActive: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm },
//   dayNumber: { ...theme.typography.body, color: theme.colors.textSecondary },
//   dayNumberActive: { color: theme.colors.text, fontWeight: '600' },
//   dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
//   monthStats: { marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
//   monthStatText: { ...theme.typography.body, color: theme.colors.textSecondary },
// });