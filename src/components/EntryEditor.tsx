// components/EntryEditor.tsx - V2 improvements

import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { 
  Alert, 
  Image, 
  Keyboard, 
  Platform, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  KeyboardAvoidingView,
  ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { theme } from '@/constants/theme';
import { EntryData } from '@/app/create';

// Mood emoji mapping
const MOOD_EMOJIS = ['😔', '🙁', '😐', '🙂', '😄'];

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
  hasLocationConfirmation?: boolean;
}

export interface EntryEditorRef {
  snapToIndex: (index: number) => void;
  close: () => void;
}

const EntryEditor = forwardRef<EntryEditorRef, EntryEditorProps>(
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
    hasContent,
    hasLocationConfirmation = false,
  }, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // V2: Enhanced snap points for taller bottom sheet
    const snapPoints = useMemo(() => ['40%', '85%'], []);

    useImperativeHandle(ref, () => ({
      snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
      close: () => bottomSheetRef.current?.close(),
    }));

    const handleSheetChanges = useCallback((index: number) => {
      if (index === -1) {
        Keyboard.dismiss();
      }
    }, []);

    const updateField = (field: keyof EntryData, value: any) => {
      onUpdateEntry({ ...entryData, [field]: value });
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
      setShowDatePicker(Platform.OS === 'ios');
      if (selectedDate) {
        updateField('entryDate', selectedDate);
      }
    };

    const handleMoodSelect = (mood: number) => {
      updateField('mood', mood === entryData.mood ? undefined : mood);
    };

    const canSave = hasContent && !isSaving && !isTranscribing;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        // V2: Hide background when sheet is open to remove bottom nav visibility
        backgroundComponent={({ style }) => (
          <View style={[style, styles.sheetOverlay]} />
        )}
      >
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <BottomSheetScrollView 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Your Entry</Text>

            {/* Date Picker Section */}
            <TouchableOpacity 
              style={styles.dateSection} 
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.dateLabel}>
                Entry Date: {entryData.entryDate.toLocaleDateString()}
              </Text>
              <Ionicons name="chevron-down-outline" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={entryData.entryDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            {/* Title Input */}
            <Text style={styles.fieldLabel}></Text>
            <BottomSheetTextInput
              style={styles.titleInput}
              value={entryData.title}
              onChangeText={(text) => updateField('title', text)}
              placeholder="Entry Ttile (optional)"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={100}
            />

            {/* Content Input */}
            <BottomSheetTextInput
              style={styles.contentInput}
              value={entryData.content}
              onChangeText={(text) => updateField('content', text)}
              placeholder="Write or speak your thoughts..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              textAlignVertical="top"
            />

            {/* Transcription Indicator */}
            {isTranscribing && (
              <View style={styles.transcribingIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.transcribingText}>Transcribing audio...</Text>
              </View>
            )}

            {/* Media and Location Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={onTakePhoto}>
                <Ionicons name="camera-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={onPickImage}>
                <Ionicons name="images-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  hasLocationConfirmation && styles.actionButtonActive
                ]} 
                onPress={entryData.location ? onRemoveLocation : onGetLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size={20} color={theme.colors.primary} />
                ) : (
                  <Ionicons 
                    name={entryData.location ? "location" : "location-outline"} 
                    size={22} 
                    color={hasLocationConfirmation ? '#34C759' : theme.colors.primary} 
                  />
                )}
                <Text style={[
                  styles.actionButtonText,
                  hasLocationConfirmation && styles.actionButtonTextActive
                ]}>
                  {entryData.location ? 'Remove Location' : 'Location'}
                </Text>
                {hasLocationConfirmation && (
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                )}
              </TouchableOpacity>
            </View>

            {/* Photo Preview */}
            {entryData.photoUris.length > 0 && (
              <View style={styles.photoPreview}>
                <Text style={styles.fieldLabel}>Photos ({entryData.photoUris.length})</Text>
                <View style={styles.photoGrid}>
                  {entryData.photoUris.map((uri, index) => (
                    <View key={index} style={styles.photoContainer}>
                      <Image source={{ uri }} style={styles.photo} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => onRemovePhoto(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Mood Selection */}
            <View style={styles.moodSection}>
              <Text style={styles.fieldLabel}>HOW ARE YOU FEELING?</Text>
              <View style={styles.moodRow}>
                {MOOD_EMOJIS.map((emoji, index) => {
                  const moodValue = index + 1;
                  const isSelected = entryData.mood === moodValue;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.moodButton, isSelected && styles.moodButtonSelected]}
                      onPress={() => handleMoodSelect(moodValue)}
                    >
                      <Text style={styles.moodEmoji}>{emoji}</Text>
                      <Text style={styles.moodNumber}>{moodValue}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* V2: Enhanced Save Button with better spacing */}
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                onPress={onSave}
                disabled={!canSave}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Entry</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* V2: Additional spacing to ensure content is visible above bottom nav area */}
            <View style={styles.bottomSpacer} />
          </BottomSheetScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>
    );
  }
);

EntryEditor.displayName = 'EntryEditor';

export default EntryEditor;

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  
  // V2: Overlay to hide bottom navigation
  sheetOverlay: {
    backgroundColor: theme.colors.background,
    opacity: 1.0,
  },
  
  handleIndicator: {
    backgroundColor: theme.colors.textSecondary,
    width: 40,
    height: 4,
    marginTop: theme.spacing.sm,
  },
  
  container: {
    flex: 1,
  },
  
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl, // Extra padding for better scrolling
  },
  
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'left',
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  
  dateLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    fontWeight: '500',
  },
  
  fieldLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  
  titleInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  
  contentInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: 'transparent',
    minHeight: 120,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  
  transcribingText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  actionButtonActive: {
    backgroundColor: '#E8F5E8',
    borderColor: '#34C759',
  },
  
  actionButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  
  actionButtonTextActive: {
    color: '#34C759',
  },
  
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  
  locationText: {
    ...theme.typography.caption,
    color: '#2E7D32',
    flex: 1,
    fontWeight: '500',
  },
  
  photoPreview: {
    marginBottom: theme.spacing.lg,
  },
  
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  
  photoContainer: {
    position: 'relative',
    width: 80,
    height: 80,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  
  moodSection: {
    marginBottom: theme.spacing.xl,
  },
  
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  
  moodButton: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  moodButtonSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  
  moodEmoji: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  
  moodNumber: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  
  saveButtonContainer: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  
  saveButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  
  saveButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  
  saveButtonText: {
    ...theme.typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // V2: Extra spacing to ensure content is visible above bottom navigation
  bottomSpacer: {
    height: 100, // Ensures content is visible above bottom navigation
  },
});