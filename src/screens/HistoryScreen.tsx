// app/history.tsx - Simplified Timeline Only

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmptyState from '../components/EmptyState';
import { theme } from '../constants/theme';
import { useJournal } from '../context/JournalContext';
import { entriesService } from '../services/entries';
import { Entry, GroupedEntries } from '../types/journal';
import { formatDisplayDate } from '../utils/format';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import EntryDetailSheet, { EntryDetailSheetRef } from '../components/EntryDetailSheet';
import TimelineItem from '../components/TimelineItem';

type TimelineFilter = 'week' | 'month' | 'all';
type SortOrder = 'latest' | 'earliest';

const STORAGE_KEYS = {
  TIMELINE_FILTER: 'timeline_filter',
  SORT_ORDER: 'sort_order',
};

export default function HistoryScreen() {
  const router = useRouter();
  const { entries, refreshEntries, deleteEntry } = useJournal();

  const [groupedEntries, setGroupedEntries] = useState<GroupedEntries>({});
  const [refreshing, setRefreshing] = useState(false);
  
  // Timeline filters
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  
  // Filter selectors
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // bottom sheet
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const sheetRef = useRef<EntryDetailSheetRef>(null);

  const presentDetails = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    requestAnimationFrame(() => sheetRef.current?.present?.());
  }, []);

  const closeDetails = useCallback(() => sheetRef.current?.dismiss?.(), []);

  const parseYMD = (ymd: string) => {
    // ymd = 'YYYY-MM-DD' - ensure we use the exact date without timezone shifts
    return new Date(ymd + 'T00:00:00.000'); // Force local midnight
  };

  // Load saved preferences
  useEffect(() => {
    loadSavedPreferences();
  }, []);

  const loadSavedPreferences = async () => {
    try {
      const savedFilter = await AsyncStorage.getItem(STORAGE_KEYS.TIMELINE_FILTER);
      const savedSort = await AsyncStorage.getItem(STORAGE_KEYS.SORT_ORDER);
      
      if (savedFilter) setTimelineFilter(savedFilter as TimelineFilter);
      if (savedSort) setSortOrder(savedSort as SortOrder);
    } catch (error) {
      console.log('Error loading preferences:', error);
    }
  };

  const savePreference = async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.log('Error saving preference:', error);
    }
  };

  useEffect(() => { loadGroupedEntries(); }, [entries, timelineFilter]);

  const loadGroupedEntries = async () => {
    const grouped = await entriesService.groupEntriesByDay();
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

  // Filter entries by time period
  const getFilteredEntries = () => {
    const now = new Date();
    
    switch (timelineFilter) {
      case 'week':
        if (selectedWeek) {
          // Filter by specific week
          const weekStart = new Date(selectedWeek);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          const filtered: GroupedEntries = {};
          Object.entries(groupedEntries).forEach(([date, dayEntries]) => {
            const entryDate = parseYMD(date);
            if (entryDate >= weekStart && entryDate <= weekEnd) {
              filtered[date] = dayEntries;
            }
          });
          return filtered;
        } else {
          // Default to last 7 days
          const cutoffDate = new Date();
          cutoffDate.setDate(now.getDate() - 7);
          
          const filtered: GroupedEntries = {};
          Object.entries(groupedEntries).forEach(([date, dayEntries]) => {
            const entryDate = parseYMD(date);
            if (entryDate >= cutoffDate) {
              filtered[date] = dayEntries;
            }
          });
          return filtered;
        }
      case 'month':
        if (selectedMonth) {
          // Filter by specific month
          const [year, month] = selectedMonth.split('-').map(n => parseInt(n, 10));
          
          const filtered: GroupedEntries = {};
          Object.entries(groupedEntries).forEach(([date, dayEntries]) => {
            const entryDate = parseYMD(date);
            if (entryDate.getFullYear() === year && entryDate.getMonth() === month - 1) {
              filtered[date] = dayEntries;
            }
          });
          return filtered;
        } else {
          // Default to last 30 days
          const cutoffDate = new Date();
          cutoffDate.setMonth(now.getMonth() - 1);
          
          const filtered: GroupedEntries = {};
          Object.entries(groupedEntries).forEach(([date, dayEntries]) => {
            const entryDate = parseYMD(date);
            if (entryDate >= cutoffDate) {
              filtered[date] = dayEntries;
            }
          });
          return filtered;
        }
      case 'all':
      default:
        return groupedEntries;
    }
  };

  // Get available weeks for selector
  const getAvailableWeeks = () => {
    const weeks: Array<{ label: string; value: string }> = [];
    const dates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));
    
    const weekMap = new Map<string, Date>();
    
    dates.forEach(date => {
      const entryDate = parseYMD(date);
      const weekStart = new Date(entryDate);
      weekStart.setDate(entryDate.getDate() - entryDate.getDay()); // Start of week (Sunday)
      
      const weekKey = weekStart.toISOString().split('T')[0];
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, weekStart);
      }
    });
    
    Array.from(weekMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .slice(0, 8) // Limit to last 8 weeks
      .forEach(([weekKey, weekStart]) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        weeks.push({ label, value: weekKey });
      });
    
    return weeks;
  };

  // Get available months for selector
  const getAvailableMonths = () => {
    const months: Array<{ label: string; value: string }> = [];
    const dates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));
    
    const monthMap = new Set<string>();
    
    dates.forEach(date => {
      const entryDate = parseYMD(date);
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
      monthMap.add(monthKey);
    });
    
    Array.from(monthMap)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 12) // Limit to last 12 months
      .forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(n => parseInt(n, 10));
        const date = new Date(year, month - 1);
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        months.push({ label, value: monthKey });
      });
    
    return months;
  };

  // Generate a title for a day's entries
  const generateDayTitle = (dayEntries: Entry[]): string => {
    if (dayEntries.length === 1) {
      return dayEntries[0].title || 'Daily Entry';
    }
    
    const moods = dayEntries.filter(e => e.mood).map(e => e.mood!);
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 3;
    
    if (avgMood >= 4) return `Great Day - ${dayEntries.length} moments`;
    if (avgMood >= 3) return `Good Day - ${dayEntries.length} entries`;
    if (avgMood >= 2) return `Mixed Day - ${dayEntries.length} thoughts`;
    return `Challenging Day - ${dayEntries.length} reflections`;
  };

  const getDayPreview = (dayEntries: Entry[]): string => {
    if (dayEntries.length === 1) {
      return dayEntries[0].body?.substring(0, 120) + '...' || 'No content available';
    }
    
    const hasContent = dayEntries.filter(e => e.body).slice(0, 2);
    if (hasContent.length === 0) return 'Multiple entries captured for this day';
    
    return hasContent.map(e => e.body?.substring(0, 60)).join(' • ') + '...';
  };

  const getDayFirstPhoto = (dayEntries: Entry[]): string | null => {
    for (const entry of dayEntries) {
      if (entry.photoUris && entry.photoUris.length > 0) {
        return entry.photoUris[0];
      }
    }
    return null;
  };

  const handleTimelineDayPress = (date: string, dayEntries: Entry[]) => {
    router.push({
      pathname: '/day-detail',
      params: { date, entriesData: JSON.stringify(dayEntries) }
    });
  };

  const handleTimelineFilterChange = (filter: TimelineFilter) => {
    setTimelineFilter(filter);
    savePreference(STORAGE_KEYS.TIMELINE_FILTER, filter);
    
    // Show selector for week/month
    if (filter === 'week') {
      setShowWeekSelector(true);
    } else if (filter === 'month') {
      setShowMonthSelector(true);
    } else {
      // Reset selections for 'all'
      setSelectedWeek(null);
      setSelectedMonth(null);
    }
  };

  const handleSortOrderChange = () => {
    const newOrder = sortOrder === 'latest' ? 'earliest' : 'latest';
    setSortOrder(newOrder);
    savePreference(STORAGE_KEYS.SORT_ORDER, newOrder);
  };

  const handleWeekSelect = (weekValue: string) => {
    setSelectedWeek(weekValue);
    setShowWeekSelector(false);
  };

  const handleMonthSelect = (monthValue: string) => {
    setSelectedMonth(monthValue);
    setShowMonthSelector(false);
  };

  const filteredEntries = getFilteredEntries();
  const days = Object.keys(filteredEntries).sort((a, b) => 
    sortOrder === 'latest' ? b.localeCompare(a) : a.localeCompare(b)
  );
  
  if (days.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Timeline</Text>
          <Text style={styles.headerSubtitle}>Your journal entries in chronological order</Text>
        </View>
        <EmptyState
          icon="book-outline"
          title="No entries yet"
          message="Start journaling to see your timeline"
          actionLabel="Create Entry"
          onAction={() => router.push('/')}
        />
      </View>
    );
  }

  return (
    <BottomSheetModalProvider>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Timeline</Text>
          <Text style={styles.headerSubtitle}>Your journal entries in chronological order</Text>
        </View>

        {/* Filter Controls */}
        <View style={styles.filtersContainer}>
          <View style={styles.timeFilters}>
            {(['week', 'month', 'all'] as TimelineFilter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  timelineFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => handleTimelineFilterChange(filter)}
              >
                <Text style={[
                  styles.filterButtonText,
                  timelineFilter === filter && styles.filterButtonTextActive
                ]}>
                  {filter === 'all' ? 'All Time' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={handleSortOrderChange}
          >
            <Ionicons 
              name="hourglass-outline" 
              size={16} 
              color={theme.colors.primary} 
            />
            <Text style={styles.sortButtonText}>
              {sortOrder === 'latest' ? 'Latest First' : 'Earliest First'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timeline */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.timelineScrollContent}
        >
          <View style={styles.timelineLine} />
          
          {days.map((date, index) => {
            const dayEntries = filteredEntries[date];
            const title = generateDayTitle(dayEntries);
            const preview = getDayPreview(dayEntries);
            const firstPhoto = getDayFirstPhoto(dayEntries);

            return (
              <View key={date} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                
                <TouchableOpacity
                  style={styles.timelineCard}
                  onPress={() => handleTimelineDayPress(date, dayEntries)}
                  activeOpacity={0.7}
                >
                  <View style={styles.timelineHeader}>
                    <View style={styles.dateContainer}>
                      <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.timelineDate}>{formatDisplayDate(date)}</Text>
                    </View>
                    {dayEntries[0].locationData && (
                      <View style={styles.locationContainer}>
                        <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.locationText}>
                          {dayEntries[0].locationData.place?.name || 
                           dayEntries[0].locationData.address?.city || 
                           'Location'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={styles.timelineImageContainer}>
                      {firstPhoto ? (
                        <Image source={{ uri: firstPhoto }} style={styles.timelineImage} />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <Text style={styles.placeholderEmoji}>📝</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.timelineTextContent}>
                      <Text style={styles.timelineTitle}>{title}</Text>
                      <Text style={styles.timelinePreview}>{preview}</Text>
                      
                      {dayEntries.length > 1 && (
                        <View style={styles.entryCountBadge}>
                          <Text style={styles.entryCountText}>{dayEntries.length} entries</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {index < days.length - 1 && (
                  <View style={styles.timelineArrow}>
                    <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <EntryDetailSheet ref={sheetRef} entry={selectedEntry} onDismiss={() => setSelectedEntry(null)} />

        {/* Week Selector Modal */}
        <Modal
          visible={showWeekSelector}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWeekSelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Week</Text>
                <TouchableOpacity onPress={() => setShowWeekSelector(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {getAvailableWeeks().map((week) => (
                  <TouchableOpacity
                    key={week.value}
                    style={[
                      styles.modalOption,
                      selectedWeek === week.value && styles.modalOptionSelected
                    ]}
                    onPress={() => handleWeekSelect(week.value)}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      selectedWeek === week.value && styles.modalOptionTextSelected
                    ]}>
                      {week.label}
                    </Text>
                    {selectedWeek === week.value && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Month Selector Modal */}
        <Modal
          visible={showMonthSelector}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMonthSelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Month</Text>
                <TouchableOpacity onPress={() => setShowMonthSelector(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {getAvailableMonths().map((month) => (
                  <TouchableOpacity
                    key={month.value}
                    style={[
                      styles.modalOption,
                      selectedMonth === month.value && styles.modalOptionSelected
                    ]}
                    onPress={() => handleMonthSelect(month.value)}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      selectedMonth === month.value && styles.modalOptionTextSelected
                    ]}>
                      {month.label}
                    </Text>
                    {selectedMonth === month.value && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  scrollView: { 
    flex: 1 
  },
  
  // Filters
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  timeFilters: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  sortButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  // Timeline styles
  timelineScrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: theme.spacing.lg + 7,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: theme.colors.primary + '30',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: theme.spacing.xl,
  },
  timelineDot: {
    position: 'absolute',
    left: 0,
    top: 20,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    borderWidth: 4,
    borderColor: theme.colors.background,
    zIndex: 1,
  },
  timelineCard: {
    marginLeft: 28,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  timelineHeader: {
    marginBottom: theme.spacing.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  timelineDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  locationText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  timelineContent: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  timelineImageContainer: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    flexShrink: 0,
  },
  timelineImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surface,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  timelineTextContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    lineHeight: 24,
  },
  timelinePreview: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  entryCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  entryCountText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  timelineArrow: {
    position: 'absolute',
    left: 3,
    bottom: -theme.spacing.lg,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    zIndex: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '50',
  },
  modalOptionSelected: {
    backgroundColor: theme.colors.primary + '10',
  },
  modalOptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  modalOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});