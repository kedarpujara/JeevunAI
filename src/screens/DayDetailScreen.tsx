// app/day-detail.tsx

import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';

import { theme } from '../constants/theme';
import { Entry } from '../types/journal';
import { formatDisplayDate, formatTime } from '../utils/format';
import EntryDetailSheet, { EntryDetailSheetRef } from '../components/EntryDetailSheet';
import EntryEditor, { EntryEditorRef } from '../components/EntryEditor';
import { useJournal } from '../context/JournalContext';
import { EntryData } from './CreateScreen';

export default function DayDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { updateEntry } = useJournal();

  // Parse the entries data from params
  const entries: Entry[] = params.entriesData
    ? JSON.parse(params.entriesData as string)
    : [];
  const date = params.date as string;

  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const detailSheetRef = useRef<EntryDetailSheetRef>(null);
  const editorSheetRef = useRef<EntryEditorRef>(null);

  const presentDetails = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    requestAnimationFrame(() => detailSheetRef.current?.present?.());
  }, []);

  const closeDetails = useCallback(() => {
    detailSheetRef.current?.dismiss?.();
    setSelectedEntry(null);
  }, []);

  const handleEdit = useCallback((entry: Entry) => {
    setEditingEntry(entry);
    
    // Convert Entry to EntryData format
    const editData: EntryData = {
      content: entry.body || '',
      title: entry.title || '',
      mood: entry.mood,
      photoUris: entry.photoUris || [],
      location: entry.locationData,
      entryDate: new Date(entry.createdAt),
    };
    
    setEntryData(editData);
    requestAnimationFrame(() => editorSheetRef.current?.snapToIndex?.(1));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingEntry || !entryData) return;

    setIsSaving(true);
    try {
      const updates: Partial<Entry> = {
        title: entryData.title.trim() || undefined,
        body: entryData.content.trim(),
        mood: entryData.mood,
        photoUris: entryData.photoUris,
        locationData: entryData.location,
        date: entryData.entryDate.toISOString().split('T')[0],
      };

      await updateEntry(editingEntry.id, updates);
      
      // Close editor and reset state
      editorSheetRef.current?.close?.();
      setEditingEntry(null);
      setEntryData(null);
      
      // Refresh the screen data
      router.back();
      
    } catch (error) {
      console.error('Failed to update entry:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editingEntry, entryData, updateEntry, router]);

  const handleCancelEdit = useCallback(() => {
    editorSheetRef.current?.close?.();
    setEditingEntry(null);
    setEntryData(null);
  }, []);

  const renderEntryItem = ({ item: entry, index }: { item: Entry; index: number }) => {
    const firstPhoto = entry.photoUris && entry.photoUris.length > 0 ? entry.photoUris[0] : null;
    const preview = entry.body?.substring(0, 140) + '...' || 'No content available';

    return (
      <View style={styles.entryContainer}>
        {/* Timeline elements */}
        <View style={styles.timelineElements}>
          <View style={styles.timelineDot} />
          {index < entries.length - 1 && <View style={styles.timelineLine} />}
        </View>

        {/* Entry card */}
        <TouchableOpacity
          style={styles.entryCard}
          onPress={() => presentDetails(entry)}
          activeOpacity={0.7}
        >
          {/* Time header */}
          <View style={styles.entryHeader}>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.entryTime}>{formatTime(entry.createdAt)}</Text>
            </View>
          </View>

          {/* Main content */}
          <View style={styles.entryContent}>
            {/* Image section */}
            <View style={styles.entryImageContainer}>
              {firstPhoto ? (
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: firstPhoto }} style={styles.entryImage} />
                  {entry.photoUris && entry.photoUris.length > 1 && (
                    <View style={styles.photoCountBadge}>
                      <Text style={styles.photoCountText}>+{entry.photoUris.length - 1}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderEmoji}>📝</Text>
                </View>
              )}
            </View>

            {/* Text content */}
            <View style={styles.entryTextContent}>
              {entry.title && (
                <Text style={styles.entryTitle}>{entry.title}</Text>
              )}
              <Text style={styles.entryPreview}>{preview}</Text>

              {/* Location */}
              {entry.locationData && (
                <View style={styles.locationContainer}>
                  <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.locationText}>
                    {entry.locationData.place?.name ||
                      entry.locationData.address?.city ||
                      'Location'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <BottomSheetModalProvider>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{formatDisplayDate(date)}</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Entries List with Timeline */}
        <View style={styles.listContainer}>
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={renderEntryItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Entry Detail Sheet */}
        <EntryDetailSheet
          ref={detailSheetRef}
          entry={selectedEntry}
          onDismiss={closeDetails}
          onEdit={handleEdit}
        />

        {/* Entry Editor Sheet for editing */}
        {entryData && (
          <EntryEditor
            ref={editorSheetRef}
            entryData={entryData}
            onUpdateEntry={setEntryData}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            isSaving={isSaving}
            isEditing={true}
            onPickImage={() => {}}
            onTakePhoto={() => {}}
            onRemovePhoto={() => {}}
            onGetLocation={() => {}}
            onRemoveLocation={() => {}}
            isGettingLocation={false}
            isTranscribing={false}
            hasContent={true}
          />
        )}
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  headerSpacer: {
    width: 40,
  },
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  entryContainer: {
    position: 'relative',
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
  },
  timelineElements: {
    width: 16,
    alignItems: 'center',
    marginRight: theme.spacing.md,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.background,
    zIndex: 1,
    marginTop: 16,
  },
  timelineLine: {
    position: 'absolute',
    top: 28,
    width: 2,
    height: '100%',
    backgroundColor: theme.colors.primary + '30',
    left: 5,
  },
  entryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  entryTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  entryContent: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  entryImageContainer: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    flexShrink: 0,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  entryImage: {
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
  photoCountBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: theme.radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  photoCountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  entryTextContent: {
    flex: 1,
    paddingTop: 2,
  },
  entryTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    lineHeight: 22,
  },
  entryPreview: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  locationText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
});