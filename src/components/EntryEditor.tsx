import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput
} from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { forwardRef, useCallback, useState } from 'react';
import {
  ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { theme } from '../constants/theme';
import { Mood } from '../types/journal';
import MoodPicker from './MoodPicker';

interface EntryData {
  content: string;
  title: string;
  mood?: Mood;
  photoUris: string[];
  entryDate: Date;
}

interface EntryEditorProps {
  entryData: EntryData;
  onUpdateEntry: (data: EntryData) => void;
  onSave: () => void;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onRemovePhoto: (index: number) => void;
  onGetLocation: () => void;
  onRemoveLocation: () => void;
  isGettingLocation: boolean;
  isSaving: boolean;
  isTranscribing: boolean;
  hasContent: boolean;
}

const EntryEditor = forwardRef<BottomSheet, EntryEditorProps>(
  ({
    entryData,
    onUpdateEntry,
    onSave,
    onPickImage,
    onTakePhoto,
    onRemovePhoto,
    onGetLocation,
    onRemoveLocation,
    isGettingLocation,
    isSaving,
    isTranscribing,
    hasContent
  }, ref) => {

    const [showDatePicker, setShowDatePicker] = useState(false);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const onDateChange = (_e: DateTimePickerEvent, selected?: Date) => {
      if (selected) onUpdateEntry({ ...entryData, entryDate: selected });
      // collapse after any selection (both iOS inline & Android modal)
      setShowDatePicker(false);
    };

    const formatDate = (date: Date) => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={['25%', '50%', '90%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={!hasContent}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isTranscribing ? 'Transcribing...' : 'Your Entry'}
            </Text>
            <View style={styles.headerActions}>
              {isTranscribing && <ActivityIndicator size="small" color={theme.colors.primary} />}
              {hasContent && !isTranscribing && (
                <TouchableOpacity onPress={onSave} disabled={isSaving}>
                  {isSaving
                    ? <ActivityIndicator size="small" color={theme.colors.primary} />
                    : <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary} />
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>

          <BottomSheetScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Date Selector */}
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(prev => !prev)}
              activeOpacity={0.7}
            >
              <View style={styles.dateSelectorContent}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.dateSelectorText}>
                  Entry Date: {formatDate(entryData.entryDate)}
                </Text>
                <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Title */}
            <BottomSheetTextInput
              style={styles.titleInput}
              placeholder="Title (optional)"
              placeholderTextColor={theme.colors.muted}
              value={entryData.title}
              onChangeText={(text) => onUpdateEntry({ ...entryData, title: text })}
              maxLength={100}
            />

            {/* Content */}
            <BottomSheetTextInput
              style={styles.contentInput}
              placeholder={isTranscribing ? 'Transcribing your words...' : 'Write or speak your thoughts...'}
              placeholderTextColor={theme.colors.muted}
              value={entryData.content}
              onChangeText={(text) => onUpdateEntry({ ...entryData, content: text })}
              multiline
              textAlignVertical="top"
              editable={!isTranscribing}
            />

            {/* Photos */}
            {entryData.photoUris.length > 0 && (
              <View style={styles.photosSection}>
                <Text style={styles.sectionLabel}>Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                  {entryData.photoUris.map((uri, index) => (
                    <View key={index} style={styles.photoContainer}>
                      <Image source={{ uri }} style={styles.photo} />
                      <TouchableOpacity style={styles.removePhotoButton} onPress={() => onRemovePhoto(index)}>
                        <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Attachments */}
            <View style={styles.attachmentBar}>
              <TouchableOpacity style={styles.attachmentButton} onPress={onTakePhoto}>
                <Ionicons name="camera-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.attachmentText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachmentButton} onPress={onPickImage}>
                <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.attachmentText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachmentButton} onPress={onGetLocation}>
                <Ionicons
                  name="location-outline"
                  size={22}
                  color={isGettingLocation ? theme.colors.muted : theme.colors.primary}
                />
                <Text
                  style={[
                    styles.attachmentText,
                    { color: isGettingLocation ? theme.colors.muted : theme.colors.primary }
                  ]}
                >
                  {isGettingLocation ? 'Getting...' : 'Location'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mood */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>How are you feeling?</Text>
              <MoodPicker value={entryData.mood} onChange={(m) => onUpdateEntry({ ...entryData, mood: m })} />
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={onSave}
              disabled={isSaving || isTranscribing}
            >
              {isSaving
                ? <ActivityIndicator color="#FFFFFF" />
                : <>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Entry</Text>
                </>
              }
            </TouchableOpacity>
          </BottomSheetScrollView>
        </View>

        {/* Date Picker: iOS inline (with Done), Android modal */}
        {showDatePicker && (
          <View style={{
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            backgroundColor: '#fff',
            borderTopLeftRadius: 16, borderTopRightRadius: 16,
            padding: theme.spacing.lg
          }}>
            <Text style={{ ...theme.typography.body, fontWeight: '600', marginBottom: theme.spacing.md }}>Pick a date</Text>
            <DateTimePicker
              value={entryData.entryDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={{
                  alignSelf: 'flex-end',
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  marginTop: theme.spacing.md
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: theme.spacing.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.lg
  },
  title: { ...theme.typography.h2, color: theme.colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  scrollContent: { paddingBottom: theme.spacing.xxl },
  dateSelector: { marginBottom: theme.spacing.lg },
  dateSelectorContent: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md
  },
  dateSelectorText: { flex: 1, ...theme.typography.body, color: theme.colors.text },
  titleInput: {
    ...theme.typography.h2, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.md, marginBottom: theme.spacing.lg, color: theme.colors.text
  },
  contentInput: {
    ...theme.typography.body, minHeight: 120, marginBottom: theme.spacing.lg,
    color: theme.colors.text, lineHeight: 24
  },
  photosSection: { marginBottom: theme.spacing.lg },
  photosScroll: { marginTop: theme.spacing.sm },
  photoContainer: { marginRight: theme.spacing.sm, position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: theme.radius.md },
  removePhotoButton: { position: 'absolute', top: -8, right: -8, backgroundColor: theme.colors.danger, borderRadius: 12 },
  attachmentBar: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: theme.spacing.md,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.lg
  },
  attachmentButton: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, padding: theme.spacing.sm },
  attachmentText: { ...theme.typography.caption, color: theme.colors.primary },
  section: { marginBottom: theme.spacing.xl },
  sectionLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, textTransform: 'uppercase' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.lg, borderRadius: theme.radius.md, marginTop: theme.spacing.lg
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { ...theme.typography.button, color: '#FFFFFF' },
});

export default EntryEditor;