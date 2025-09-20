// components/EntryEditor.tsx - Fixed to allow full editing functionality

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, Platform } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '@/constants/theme';
import { EntryData } from '@/screens/CreateScreen';
import { LocationData } from '@/types/journal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface EntryEditorRef {
  snapToIndex: (index: number) => void;
  close: () => void;
}

interface EntryEditorProps {
  entryData: EntryData;
  onUpdateEntry: (data: EntryData) => void;
  onSave: () => void;
  onCancel?: () => void;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onRemovePhoto: (index: number) => void;
  onGetLocation: () => void;
  onRemoveLocation: () => void;
  isGettingLocation: boolean;
  isSaving: boolean;
  isTranscribing: boolean;
  hasContent: boolean;
  isEditing?: boolean;
}

// ✅ Helper function to format location display - shows city, state, country
const formatLocationDisplay = (location: LocationData): string => {
  const parts = [];

  if (location.place?.name) {
    parts.push(location.place.name);
  }

  if (location.address?.city) {
    parts.push(location.address.city);
  }

  if (location.address?.region) {
    parts.push(location.address.region);
  }

  if (location.address?.country) {
    parts.push(location.address.country);
  }

  return parts.length > 0 ? parts.join(', ') : 'Current Location';
};

const EntryEditor = forwardRef<EntryEditorRef, EntryEditorProps>(
  ({
    entryData,
    onUpdateEntry,
    onSave,
    onCancel,
    onPickImage,
    onTakePhoto,
    onRemovePhoto,
    onGetLocation,
    onRemoveLocation,
    isGettingLocation,
    isSaving,
    isTranscribing,
    hasContent,
    isEditing = false,
  }, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
      close: () => bottomSheetRef.current?.close(),
    }));

    const handleDateTimeChange = (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        if (pickerMode === 'date') {
          setShowDatePicker(false);
        } else {
          setShowTimePicker(false);
        }
      }

      if (selectedDate) {
        if (pickerMode === 'date') {
          const currentDate = entryData.entryDate;
          const newDate = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            currentDate.getHours(),
            currentDate.getMinutes(),
            currentDate.getSeconds(),
            currentDate.getMilliseconds()
          );

          onUpdateEntry({ ...entryData, entryDate: newDate });
        } else {
          const currentDate = entryData.entryDate;
          const newDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            selectedDate.getHours(),
            selectedDate.getMinutes(),
            selectedDate.getSeconds(),
            selectedDate.getMilliseconds()
          );

          onUpdateEntry({ ...entryData, entryDate: newDate });
        }
      }
    };

    const toggleDatePicker = () => {
      setShowDatePicker(!showDatePicker);
      setShowTimePicker(false);
      setPickerMode('date');
    };

    const toggleTimePicker = () => {
      setShowTimePicker(!showTimePicker);
      setShowDatePicker(false);
      setPickerMode('time');
    };

    const formatDisplayDate = (date: Date) => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      }
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    };

    const formatDisplayTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const snapPoints = ['60%', '95%'];

    return (
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.indicator}
        onClose={onCancel}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Entry' : 'Your Entry'}
            </Text>

            <View style={styles.dateTimeSection}>
              <View style={styles.dateTimeButtons}>
                <TouchableOpacity
                  style={[styles.dateTimeButton, showDatePicker && styles.dateTimeButtonActive]}
                  onPress={toggleDatePicker}
                >
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.dateTimeButtonText}>
                    {formatDisplayDate(entryData.entryDate)}
                  </Text>
                  <Ionicons
                    name={showDatePicker ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateTimeButton, showTimePicker && styles.dateTimeButtonActive]}
                  onPress={toggleTimePicker}
                >
                  <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.dateTimeButtonText}>
                    {formatDisplayTime(entryData.entryDate)}
                  </Text>
                  <Ionicons
                    name={showTimePicker ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={entryData.entryDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={handleDateTimeChange}
                    maximumDate={new Date()}
                    style={styles.picker}
                  />
                </View>
              )}

              {showTimePicker && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={entryData.entryDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={handleDateTimeChange}
                    maximumDate={new Date()}
                    style={styles.picker}
                  />
                </View>
              )}
            </View>
          </View>

          <BottomSheetScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 120 }
            ]}
          >
            {/* Title Input */}
            <View style={styles.inputSection}>
              <TextInput
                style={styles.titleInput}
                placeholder="Entry Title (optional)"
                placeholderTextColor={theme.colors.textSecondary}
                value={entryData.title}
                onChangeText={(title) => onUpdateEntry({ ...entryData, title })}
                maxLength={100}
              />
            </View>

            {/* Content Input */}
            <View style={styles.inputSection}>
              <TextInput
                style={styles.contentInput}
                placeholder={isTranscribing ? "Transcribing audio..." : "What's on your mind?"}
                placeholderTextColor={theme.colors.textSecondary}
                value={entryData.content}
                onChangeText={(content) => onUpdateEntry({ ...entryData, content })}
                multiline
                textAlignVertical="top"
                editable={!isTranscribing}
                scrollEnabled={false}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={onTakePhoto}>
                <Ionicons name="camera" size={20} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={onPickImage}>
                <Ionicons name="images" size={20} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Gallery</Text>
              </TouchableOpacity>

              {entryData.location ? (
                <TouchableOpacity style={styles.actionButton} onPress={onRemoveLocation}>
                  <Ionicons name="location" size={20} color="#EF4444" />
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Remove Location</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onGetLocation}
                  disabled={isGettingLocation}
                >
                  <Ionicons
                    name={isGettingLocation ? "time" : "location-outline"}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.actionButtonText}>
                    {isGettingLocation ? 'Getting...' : 'Location'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Location Display */}
            {entryData.location && (
              <View style={styles.locationSection}>
                <View style={styles.locationContainer}>
                  <Ionicons name="location" size={16} color={theme.colors.primary} />
                  <Text style={styles.locationText}>
                    {formatLocationDisplay(entryData.location)}
                  </Text>
                </View>
              </View>
            )}

            {/* Photos */}
            {entryData.photoUris.length > 0 && (
              <View style={styles.photosSection}>
                <Text style={styles.sectionLabel}>PHOTOS ({entryData.photoUris.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                  {entryData.photoUris.map((uri, index) => (
                    <View key={index} style={styles.photoContainer}>
                      <Image source={{ uri }} style={styles.photo} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => onRemovePhoto(index)}
                      >
                        <Ionicons name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, (!hasContent || isSaving) && styles.saveButtonDisabled]}
              onPress={onSave}
              disabled={!hasContent || isSaving}
            >
              <Text style={[styles.saveButtonText, (!hasContent || isSaving) && styles.saveButtonTextDisabled]}>
                {isSaving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
              </Text>
            </TouchableOpacity>
          </BottomSheetScrollView>
        </View>
      </BottomSheet>
    );
  }
);

EntryEditor.displayName = 'EntryEditor';

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
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  dateTimeSection: {
    marginTop: theme.spacing.sm,
  },
  dateTimeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateTimeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  dateTimeButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    fontSize: 14,
  },
  pickerContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  picker: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  titleInput: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '600',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    minHeight: 50,
  },
  contentInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    padding: theme.spacing.md,
    minHeight: 200,
    maxHeight: 400,
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  locationSection: {
    marginBottom: theme.spacing.lg,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  locationText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    fontWeight: '500',
  },
  photosSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photoContainer: {
    position: 'relative',
    marginRight: theme.spacing.sm,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxxl*2,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  saveButtonText: {
    ...theme.typography.body,
    color: 'white',
    fontWeight: '700',
  },
  saveButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
});

export default EntryEditor;