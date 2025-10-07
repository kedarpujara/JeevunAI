// app/day-detail.tsx - Based on your working version with fixes

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, Modal, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { entriesService } from '../services/entries'; // ✅ Add this import
import PeriodAnalyzer from '../services/periodAnalyzer'; // ✅ Add this import
import * as ImagePicker from 'expo-image-picker';
import { getCurrentLocation } from '../services/locationService';
import analytics from '@/utils/analytics';



const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function DayDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { updateEntry, deleteEntry } = useJournal(); // ✅ Add deleteEntry back

  // Replace the entries parsing with this:
  const entries: Entry[] = useMemo(() => {
    return params.entriesData
      ? JSON.parse(params.entriesData as string)
      : [];
  }, [params.entriesData]);
  
  const date = params.date as string;

  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // ✅ Add deletion loading
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null); // ✅ Add photo viewer
  const [isGettingLocation, setIsGettingLocation] = useState(false);


  const detailSheetRef = useRef<EntryDetailSheetRef>(null);
  const editorSheetRef = useRef<EntryEditorRef>(null);

  const presentDetails = useCallback((entry: Entry) => {
    analytics.logEntryOpened(entry.id, entry.date);

    setSelectedEntry(entry);

    const startTime = Date.now();
  
    requestAnimationFrame(() => {
      detailSheetRef.current?.present?.();
      
      // Store timing data on the ref
      (detailSheetRef.current as any)._entryViewStartTime = startTime;
      (detailSheetRef.current as any)._currentViewingEntry = entry;
    });
  }, []);

  const closeDetails = useCallback(() => {
    // 🚀 END TIMING AND LOG
    const sheetCurrent = detailSheetRef.current as any;
    if (sheetCurrent?._entryViewStartTime && sheetCurrent?._currentViewingEntry) {
      const timeSpent = Date.now() - sheetCurrent._entryViewStartTime;
      const entry = sheetCurrent._currentViewingEntry;
      
      // Only track if they spent more than 1 second viewing
      if (timeSpent > 1000) {
        analytics.logTrack('entry_viewing_session', {
          entry_id: entry.id,
          entry_date: entry.date,
          time_spent_ms: timeSpent,
          time_spent_seconds: Math.round(timeSpent / 1000),
          viewed_from: 'day_detail'
        });
      }
      
      // Clean up
      delete sheetCurrent._entryViewStartTime;
      delete sheetCurrent._currentViewingEntry;
    }
    
    detailSheetRef.current?.dismiss?.();
    setSelectedEntry(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Track when user opens a specific day's detail view
      analytics.logTrack('day_detail_opened', {
        entry_date: date,
        entry_count: entries.length,
        total_photos: entries.reduce((sum, entry) => sum + (entry.photoUris?.length || 0), 0),
        has_location: entries.some(entry => entry.locationData)
      });
    }, [date, entries])
  );


  // ✅ Add photo handling
  const handlePhotoPress = useCallback((photoUri: string) => {
    setViewingPhoto(photoUri);
  }, []);

  const closePhotoViewer = useCallback(() => {
    setViewingPhoto(null);
  }, []);

  const handlePickImage = useCallback(async () => {
    if (!entryData) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow photo library access.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: false,
    });
    
    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((a) => a.uri);
      setEntryData({
        ...entryData,
        photoUris: [...entryData.photoUris, ...newPhotos].slice(0, 5),
      });
    }
  }, [entryData]);
  
  const handleTakePhoto = useCallback(async () => {
    if (!entryData) return;
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow camera access.');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false });
    if (!result.canceled && result.assets?.[0]) {
      setEntryData({
        ...entryData,
        photoUris: [...entryData.photoUris, result.assets[0].uri].slice(0, 5),
      });
    }
  }, [entryData]);
  
  const handleRemovePhoto = useCallback((index: number) => {
    if (!entryData) return;
    
    setEntryData({
      ...entryData,
      photoUris: entryData.photoUris.filter((_, i) => i !== index),
    });
  }, [entryData]);
  
  const handleGetLocation = useCallback(async () => {
    if (!entryData) return;
    
    setIsGettingLocation(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setEntryData({
          ...entryData,
          location: loc,
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to get location.');
    } finally {
      setIsGettingLocation(false);
    }
  }, [entryData]);
  
  const handleRemoveLocation = useCallback(() => {
    if (!entryData) return;
    
    setEntryData({
      ...entryData,
      location: undefined,
    });
  }, [entryData]);

  // ✅ Fix edit flow - close detail sheet first
  const handleEdit = useCallback((entry: Entry) => {
    // Close detail sheet first
    detailSheetRef.current?.dismiss?.();
    
    // Set up entry data
    setEditingEntry(entry);
    const editData: EntryData = {
      content: entry.body || '',
      title: entry.title || '',
      mood: entry.mood,
      photoUris: entry.photoUris || [],
      location: entry.locationData,
      entryDate: new Date(entry.createdAt),
    };
    setEntryData(editData);
    
    // Small delay then open editor
    setTimeout(() => {
      editorSheetRef.current?.snapToIndex?.(1);
    }, 300);
  }, []);

  // ✅ Add delete handler with loading
  const handleDelete = useCallback((entry: Entry) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteEntry(entry.id);
              closeDetails();
              
              if (entries.length === 1) {
                router.back();
              } else {
                router.back();
              }
            } catch (error) {
              console.error('Failed to delete entry:', error);
              Alert.alert('Error', 'Failed to delete entry. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [deleteEntry, entries.length, router, closeDetails]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingEntry || !entryData) return;

    setIsSaving(true);
    console.log("PHOTOS: ", entryData.photoUris);
    try {
      const updates: Partial<Entry> = {
        title: entryData.title.trim() || undefined,
        body: entryData.content.trim(),
        mood: entryData.mood,
        photoUris: entryData.photoUris,
        locationData: entryData.location,
        date: `${entryData.entryDate.getFullYear()}-${String(entryData.entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryData.entryDate.getDate()).padStart(2, '0')}`,
        createdAt: entryData.entryDate.toISOString(),
      };

      await updateEntry(editingEntry.id, updates);
      
      editorSheetRef.current?.close?.();
      setEditingEntry(null);
      setEntryData(null);
      
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

  // ✅ Add date formatting function
  const formatDateWithDayOfWeek = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00.000');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderEntryItem = ({ item: entry, index }: { item: Entry; index: number }) => {
    const firstPhoto = entry.photoUris && entry.photoUris.length > 0 ? entry.photoUris[0] : null;
    const preview = entry.body?.substring(0, 140) + '...' || 'No content available';

    return (
      <View style={styles.entryContainer}>
        <View style={styles.timelineElements}>
          <View style={styles.timelineDot} />
          {index < entries.length - 1 && <View style={styles.timelineLine} />}
        </View>

        <TouchableOpacity
          style={styles.entryCard}
          onPress={() => presentDetails(entry)}
          activeOpacity={0.7}
        >
          <View style={styles.entryHeader}>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.entryTime}>{formatTime(entry.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.entryContent}>
            <View style={styles.entryImageContainer}>
              {firstPhoto ? (
                <View style={styles.imageWrapper}>
                  {/* ✅ Add photo press handling */}
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handlePhotoPress(firstPhoto);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: firstPhoto }} style={styles.entryImage} />
                  </TouchableOpacity>
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

            <View style={styles.entryTextContent}>
              {entry.title && (
                <Text style={styles.entryTitle}>{entry.title}</Text>
              )}
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
              <Text style={styles.entryPreview}>{preview}</Text>              
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
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            {/* ✅ Use better date formatting */}
            <Text style={styles.headerTitle}>{formatDateWithDayOfWeek(date)}</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* ✅ Add loading overlay for deletion */}
        {isDeleting && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Deleting entry...</Text>
            </View>
          </View>
        )}

        <View style={styles.listContainer}>
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={renderEntryItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* ✅ Add delete prop */}
        <EntryDetailSheet
          ref={detailSheetRef}
          entry={selectedEntry}
          onDismiss={closeDetails}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPhotoPress={handlePhotoPress} // Add this line
        />

        {entryData && (
          <EntryEditor
            ref={editorSheetRef}
            entryData={entryData}
            onUpdateEntry={setEntryData}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            isSaving={isSaving}
            isEditing={true}
            onPickImage={handlePickImage}        // ✅ Real handler
            onTakePhoto={handleTakePhoto}        // ✅ Real handler  
            onRemovePhoto={handleRemovePhoto}    // ✅ Real handler
            onGetLocation={handleGetLocation}    // ✅ Real handler
            onRemoveLocation={handleRemoveLocation} // ✅ Real handler
            isGettingLocation={isGettingLocation}             
            isTranscribing={false}
            hasContent={true}
          />
        )}

        {/* ✅ Add photo viewer modal */}
        <Modal
          visible={!!viewingPhoto}
          transparent
          animationType="fade"
          onRequestClose={closePhotoViewer}
        >
          <View style={styles.photoViewerOverlay}>
            <TouchableOpacity
              style={styles.photoViewerCloseButton}
              onPress={closePhotoViewer}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>
            
            {viewingPhoto && (
              <TouchableOpacity
                style={styles.photoViewerImageContainer}
                onPress={closePhotoViewer}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: viewingPhoto }}
                  style={styles.photoViewerImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          </View>
        </Modal>
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
    color: theme.colors.black, // ✅ Keep purple color
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 18,
  },
  headerSpacer: {
    width: 40,
  },
  
  // ✅ Add loading overlay styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '500',
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
    marginBottom: theme.spacing.sm,
  },
  locationText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  
  // ✅ Add photo viewer styles
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  photoViewerImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  photoViewerImage: {
    width: screenWidth - (theme.spacing.lg * 2),
    height: screenHeight - 200,
    borderRadius: theme.radius.lg,
  },
});