import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';
// ✅ Import intelligent analyzer and entry service
import EfficientPeriodAnalyzer from '../services/periodAnalyzer';
import { entriesService } from '../services/entries';
import { Entry } from '../types/journal';

interface EntryPreviewProps {
  title: string;
  content: string;
  opacity: Animated.Value;
  onPress: () => void;
  // ✅ Add currentDate to get day context
  currentDate?: string; // YYYY-MM-DD format
}

export default function EntryPreview({ title, content, opacity, onPress, currentDate }: EntryPreviewProps) {
  // ✅ State for intelligent day summary
  const [dayTitle, setDayTitle] = useState<string>('');
  const [daySummary, setDaySummary] = useState<string>('');
  const [dayEntryCount, setDayEntryCount] = useState<number>(0);
  const [isLoadingDayInfo, setIsLoadingDayInfo] = useState<boolean>(false);

  // ✅ Load day context when currentDate is available
  useEffect(() => {
    if (currentDate) {
      loadDayContext();
    }
  }, [currentDate]);

  const loadDayContext = async () => {
    if (!currentDate) return;

    setIsLoadingDayInfo(true);
    try {
      // Get all entries for today
      const groupedEntries = await entriesService.groupEntriesByDay();
      const dayEntries = groupedEntries[currentDate] || [];
      setDayEntryCount(dayEntries.length);

      if (dayEntries.length > 1) {
        // Multiple entries - get intelligent title and summary
        try {
          const summary = await EfficientPeriodAnalyzer.analyzeDayEntries(currentDate, dayEntries);
          setDayTitle(summary.title);
          setDaySummary(summary.summary || 'Multiple activities captured today');
        } catch (error) {
          console.error('Failed to get day analysis:', error);
          // Fallback to simple aggregation
          setDayTitle(generateFallbackDayTitle(dayEntries));
          setDaySummary(generateFallbackDaySummary(dayEntries));
        }
      } else if (dayEntries.length === 1) {
        // Single entry - use its title and content
        setDayTitle(dayEntries[0].title || 'Daily Entry');
        setDaySummary(dayEntries[0].body?.substring(0, 100) + '...' || 'No content available');
      } else {
        // No entries yet
        setDayTitle('New Entry');
        setDaySummary('Start writing your thoughts...');
      }
    } catch (error) {
      console.error('Failed to load day context:', error);
      setDayTitle('Daily Entry');
      setDaySummary('Unable to load day summary');
    } finally {
      setIsLoadingDayInfo(false);
    }
  };

  // ✅ Generate fallback title based on multiple entries
  const generateFallbackDayTitle = (dayEntries: Entry[]): string => {
    const moods = dayEntries.filter(e => e.mood).map(e => e.mood!);
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 3;
    
    if (avgMood >= 4) return `Great Day - ${dayEntries.length} moments`;
    if (avgMood >= 3) return `Good Day - ${dayEntries.length} entries`;
    if (avgMood >= 2) return `Mixed Day - ${dayEntries.length} thoughts`;
    return `Challenging Day - ${dayEntries.length} reflections`;
  };

  // ✅ Generate fallback summary from multiple entries
  const generateFallbackDaySummary = (dayEntries: Entry[]): string => {
    const contentEntries = dayEntries.filter(e => e.body && e.body.trim().length > 0);
    if (contentEntries.length === 0) {
      return `${dayEntries.length} entries captured today`;
    }
    
    // Combine first few words from each entry
    const previews = contentEntries
      .slice(0, 3)
      .map(e => e.body?.substring(0, 30).trim())
      .filter(Boolean);
    
    return previews.join(' • ') + (contentEntries.length > 3 ? '...' : '');
  };

  const getPreviewText = () => {
    // Always prioritize current entry content when creating new entry
    if (title || content) {
      if (title) return title;
      if (content) {
        const preview = content.substring(0, 100);
        return content.length > 100 ? preview + '...' : preview;
      }
    }
    
    // Only use day context if no current entry content
    if (currentDate && dayEntryCount > 1) {
      return dayTitle || 'Loading day summary...';
    }
    
    return '';
  };
  
  const getPreviewSummary = () => {
    // Always show current entry content when available
    if (content) {
      const preview = content.substring(0, 150);
      return content.length > 150 ? preview + '...' : preview;
    }
    
    // Only use day summary if no current content
    if (currentDate && dayEntryCount > 1) {
      return daySummary || 'Multiple activities captured today';
    }
    
    return 'Start writing your thoughts...';
  };
  
  const getEntryLabel = () => {
    // Always show "Current Entry" when actively creating content
    if (title || content) {
      return 'Current Entry';
    }
    
    // Only show day summary label when no active content
    if (currentDate && dayEntryCount > 1) {
      return `Today's Summary (${dayEntryCount} entries)`;
    }
    return 'Current Entry';
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.header}>
          {/* ✅ Dynamic label based on entry count */}
          <Text style={styles.label}>{getEntryLabel()}</Text>
          <View style={styles.headerRight}>
            {/* ✅ Show loading indicator when fetching day info */}
            {isLoadingDayInfo && (
              <Text style={styles.loadingText}>...</Text>
            )}
            <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          </View>
        </View>      
        
        {/* ✅ Summary text for better context */}
        <Text style={styles.summary} numberOfLines={2}>
          {getPreviewSummary()}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  // ✅ Enhanced title styling
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: theme.spacing.xs,
  },
  // ✅ New summary text style
  summary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  // ✅ Entry count badge
  entryCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    gap: 4,
  },
  entryCountText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
});