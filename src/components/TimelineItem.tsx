// components/TimelineItem.tsx
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { Entry } from '../types/journal';
import { formatDisplayDate } from '../utils/format';
import { useJournal } from '../context/JournalContext';

interface TimelineItemProps {
  date: string;
  dayEntries: Entry[];
  preview: string;
  firstPhoto: string | null;
  isLast: boolean;
  onPress: () => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  date,
  dayEntries,
  preview,
  firstPhoto,
  isLast,
  onPress
}) => {
  const { getDayTitle } = useJournal();
  const [title, setTitle] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const loadTitle = async () => {
      if (dayEntries.length === 1) {
        // Single entries use existing title immediately
        setTitle(dayEntries[0].title || 'Daily Entry');
        return;
      }

      // Multiple entries - check cache first, generate if needed
      setIsGenerating(true);
      try {
        const generatedTitle = await getDayTitle(date, dayEntries);
        setTitle(generatedTitle);
      } catch (error) {
        console.error('Failed to get day title:', error);
        // Fallback title
        setTitle(`Day Summary - ${dayEntries.length} entries`);
      } finally {
        setIsGenerating(false);
      }
    };

    loadTitle();
  }, [date, dayEntries, getDayTitle]);

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot} />
      
      <TouchableOpacity
        style={styles.timelineCard}
        onPress={onPress}
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
            <View style={styles.titleContainer}>
              <Text style={[
                styles.timelineTitle,
                isGenerating && styles.titleGenerating
              ]}>
                {title || 'Loading...'}
              </Text>
              {isGenerating && dayEntries.length > 1 && (
                <View style={styles.loadingIndicator}>
                  <Ionicons name="sync" size={12} color={theme.colors.primary} />
                </View>
              )}
            </View>
            <Text style={styles.timelinePreview}>{preview}</Text>
            
            {dayEntries.length > 1 && (
              <View style={styles.entryCountBadge}>
                <Text style={styles.entryCountText}>{dayEntries.length} entries</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {!isLast && (
        <View style={styles.timelineArrow}>
          <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot} />
      
      <TouchableOpacity
        style={styles.timelineCard}
        onPress={onPress}
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
            <View style={styles.titleContainer}>
              <Text style={[
                styles.timelineTitle,
                isGenerating && styles.titleGenerating
              ]}>
                {title}
              </Text>
              {isGenerating && (
                <View style={styles.loadingIndicator}>
                  <Ionicons name="sync" size={14} color={theme.colors.primary} />
                </View>
              )}
            </View>
            <Text style={styles.timelinePreview}>{preview}</Text>
            
            {dayEntries.length > 1 && (
              <View style={styles.entryCountBadge}>
                <Text style={styles.entryCountText}>{dayEntries.length} entries</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {!isLast && (
        <View style={styles.timelineArrow}>
          <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  timelineTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    lineHeight: 24,
    flex: 1,
  },
  titleGenerating: {
    opacity: 0.7,
  },
  loadingIndicator: {
    marginLeft: theme.spacing.xs,
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
});

export default TimelineItem;