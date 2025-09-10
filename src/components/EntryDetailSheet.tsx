// Update your EntryDetailSheet component to include edit functionality

import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { Entry } from '@/types/journal';
import { formatDisplayDate, formatTime } from '@/utils/format';

export interface EntryDetailSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface EntryDetailSheetProps {
  entry: Entry | null;
  onDismiss: () => void;
  onEdit?: (entry: Entry) => void; // New prop for edit callback
}

const EntryDetailSheet = forwardRef<EntryDetailSheetRef, EntryDetailSheetProps>(
  ({ entry, onDismiss, onEdit }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    const handleEdit = useCallback(() => {
      if (entry && onEdit) {
        bottomSheetRef.current?.dismiss();
        onEdit(entry);
      }
    }, [entry, onEdit]);

    if (!entry) return null;

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={['85%']}
        onDismiss={onDismiss}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.indicator}
      >
        <View style={styles.container}>
          {/* Header with Edit button */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Entry Details</Text>
              <Text style={styles.headerDate}>
                {formatDisplayDate(entry.date)} • {formatTime(entry.createdAt)}
              </Text>
            </View>
            
            {onEdit && (
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={handleEdit}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <BottomSheetScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Title */}
            {entry.title && (
              <View style={styles.section}>
                <Text style={styles.title}>{entry.title}</Text>
              </View>
            )}

            {/* Content */}
            {entry.body && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ENTRY</Text>
                <Text style={styles.content}>{entry.body}</Text>
              </View>
            )}

            {/* Photos */}
            {entry.photoUris && entry.photoUris.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Photos ({entry.photoUris.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                  {entry.photoUris.map((uri, index) => (
                    <Image key={index} source={{ uri }} style={styles.photo} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Location */}
            {entry.locationData && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Location</Text>
                <View style={styles.locationContainer}>
                  <Ionicons name="location" size={16} color={theme.colors.primary} />
                  <Text style={styles.locationText}>
                    {entry.locationData.place?.name || 
                     entry.locationData.address?.formattedAddress ||
                     `${entry.locationData.address?.city}, ${entry.locationData.address?.region}` ||
                     'Location recorded'}
                  </Text>
                </View>
              </View>
            )}

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Tags</Text>
                <View style={styles.tagsContainer}>
                  {entry.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Mood */}
            {/* {entry.mood && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Mood</Text>
                <View style={styles.moodContainer}>
                  <Text style={styles.moodValue}>{entry.mood}/5</Text>
                  <View style={styles.moodBar}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.moodBarSegment,
                          { backgroundColor: level <= entry.mood! ? theme.colors.primary : theme.colors.border }
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            )} */}
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>
    );
  }
);

EntryDetailSheet.displayName = 'EntryDetailSheet';

const styles = StyleSheet.create({
  background: {
    backgroundColor: theme.colors.background,
  },
  indicator: {
    backgroundColor: theme.colors.textSecondary,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  headerDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    lineHeight: 32,
  },
  content: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: theme.radius.lg,
    marginRight: theme.spacing.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  locationText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tag: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  tagText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  moodValue: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    fontWeight: '700',
    minWidth: 40,
  },
  moodBar: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  moodBarSegment: {
    height: 8,
    flex: 1,
    borderRadius: 4,
  },
});

export default EntryDetailSheet;