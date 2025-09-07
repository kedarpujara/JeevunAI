import { theme } from '@/constants/theme';
import { useJournal } from '@/context/JournalContext';
import { Entry } from '@/types/journal';
import { formatDisplayDate, formatTime } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetScrollView
} from '@gorhom/bottom-sheet';
import React, { forwardRef, useMemo } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type EntryDetailSheetRef = BottomSheetModal;

const getMoodEmoji = (mood?: number): string => {
  const emojis = ['😔', '😕', '😐', '🙂', '😊'];
  const idx = Math.min(Math.max((mood ?? 3) - 1, 0), 4);
  return emojis[idx];
};

export default forwardRef<EntryDetailSheetRef, { entry: Entry | null; onDismiss?: () => void }>(
  ({ entry, onDismiss }, ref) => {
    const { deleteEntry } = useJournal();
    const snapPoints = useMemo(() => ['75%', '95%'], []);

    if (!entry) return null;

    const handleDelete = () => {
      Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEntry(entry.id);
            // @ts-ignore
            (ref as any)?.current?.dismiss?.();
            onDismiss?.();
          },
        },
      ]);
    };

    // Fixed location access - check if location exists and has the proper structure
    const getLocationText = () => {
      let locationData = entry.locationData;
      if (!locationData) return null;
      
      return locationData.place?.name || 
             locationData.address?.formattedAddress ||
             locationData.address?.city ||
             (locationData.coordinates ? 
               `${locationData.coordinates.latitude.toFixed(4)}, ${locationData.coordinates.longitude.toFixed(4)}` : 
               null);
    };

    const locationText = getLocationText();

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
        onDismiss={onDismiss}
        enablePanDownToClose
        handleIndicatorStyle={{ backgroundColor: '#D1D1D6' }}
      >
        {/* Top row in sheet: centered title, trash on right (no back button) */}
        <View style={styles.topBar}>
          <View style={{ width: 64 }} />
          <Text style={styles.topTitle}>Entry Details</Text>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.date}>{formatDisplayDate(entry.createdAt)}</Text>
              <Text style={styles.time}>{formatTime(entry.createdAt)}</Text>
            </View>
          </View>

          {!!entry.title && <Text style={styles.title}>{entry.title}</Text>}

          {!!entry.mood && (
            <View style={styles.moodContainer}>
              <Text style={styles.moodEmoji}>{getMoodEmoji(entry.mood)}</Text>
              <Text style={styles.moodText}>Mood: {entry.mood}/5</Text>
            </View>
          )}

          {!!entry.body && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Content</Text>
              <View style={styles.bodyContainer}>
                <Text style={styles.body}>{entry.body}</Text>
              </View>
            </View>
          )}

          {/* Fixed photo display - only check photoUris */}
          {!!(entry.photoUris?.length) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Photos ({entry.photoUris.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                {entry.photoUris.map((uri, i) => (
                  <Image 
                    key={`${entry.id}-photo-${i}`} 
                    source={{ uri }} 
                    style={styles.photo}
                    onError={(error) => {
                      console.log('Image load error for URI:', uri, error.nativeEvent.error);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Fixed location display */}
          {locationText && (
            <View style={styles.locationSection}>
              <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.locationText}>{locationText}</Text>
            </View>
          )}

          {!!entry.tags?.length && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {entry.tags.map((tag, i) => (
                  <View key={`${entry.id}-tag-${i}-${tag.name || tag.id || 'x'}`} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  container: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm,
  },
  topTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  date: { ...theme.typography.body, color: theme.colors.text, fontWeight: '600' },
  time: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  title: { ...theme.typography.h1, color: theme.colors.text, marginBottom: theme.spacing.lg },
  moodContainer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  moodEmoji: { fontSize: 32 },
  moodText: { ...theme.typography.body, color: theme.colors.textSecondary },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  bodyContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  body: { 
    ...theme.typography.body, 
    color: theme.colors.text,
    lineHeight: 22,
  },
  photosScroll: { marginHorizontal: -theme.spacing.sm },
  photo: {
    width: 120, height: 120, borderRadius: theme.radius.md, marginHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  locationSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: theme.spacing.xs, 
    marginBottom: theme.spacing.lg, 
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: '#E8F5E8',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  locationText: { 
    ...theme.typography.caption, 
    color: '#2E7D32', 
    fontWeight: '500',
    flex: 1,
  },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  tag: {
    backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.primary + '20',
  },
  tagText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '500' },
});