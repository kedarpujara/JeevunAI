// app/create.tsx (or wherever CreateScreen lives)

import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/context/JournalContext';
import { analyzeEntryWithAI } from '@/services/aiAnalyzer';
import { getCurrentLocation } from '@/services/locationService';
import { transcribeAudio } from '@/services/transcription';
import { LocationData, Mood } from '@/types/journal';

import ConfirmationSheet, { ConfirmationSheetRef } from '@/components/ConfirmationSheet';
import EntryEditor from '@/components/EntryEditor';
import EntryPreview from '@/components/EntryPreview';
import RecordButton from '@/components/RecordButton';

export interface EntryData {
  content: string;
  title: string;
  mood?: Mood;
  photoUris: string[];
  location?: LocationData;
  entryDate: Date;
}

export default function CreateScreen() {
  const router = useRouter();
  const { refreshEntries } = useJournal();
  const { user } = useAuth();

  // Recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Editor state
  const [entryData, setEntryData] = useState<EntryData>({
    content: '',
    title: '',
    mood: undefined,
    photoUris: [],
    location: undefined,
    entryDate: new Date(),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const hasContent =
    entryData.content.trim().length > 0 ||
    entryData.title.trim().length > 0 ||
    entryData.photoUris.length > 0;

  // Refs
  const editorSheetRef = useRef<BottomSheet>(null);
  const confirmRef = useRef<ConfirmationSheetRef>(null);
  const previewOpacity = useRef(new Animated.Value(0)).current;
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate preview
  useEffect(() => {
    Animated.timing(previewOpacity, {
      toValue: hasContent ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [hasContent, previewOpacity]);

  // Recording controls
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow microphone access to record audio.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      durationInterval.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
    } catch (e) {
      console.error('Failed to start recording:', e);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      const uri = recording.getURI();
      setRecording(null);
      setRecordingDuration(0);

      if (uri) {
        setIsTranscribing(true);
        editorSheetRef.current?.snapToIndex(1);
        try {
          const text = await transcribeAudio(uri);
          setEntryData((prev) => ({
            ...prev,
            content: prev.content ? `${prev.content}\n\n${text}` : text,
          }));
        } catch (e) {
          console.error('Transcription failed:', e);
          Alert.alert('Transcription Failed', 'You can type your entry manually.');
        } finally {
          setIsTranscribing(false);
        }
      }
    } catch (e) {
      console.error('Failed to stop recording:', e);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  // Voice Memos Import (on main screen, not in editor)
  const handleImportVoiceMemo = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/wav', 'public.audio'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled || !res.assets?.length) return;

      const fileUri = res.assets[0].uri;
      setIsTranscribing(true);
      editorSheetRef.current?.snapToIndex(1);

      try {
        const text = await transcribeAudio(fileUri);
        setEntryData((prev) => ({
          ...prev,
          content: prev.content ? `${prev.content}\n\n${text}` : text,
        }));
      } catch (err) {
        console.error('Voice memo transcription failed:', err);
        Alert.alert('Transcription Failed', 'Unable to transcribe that file.');
      } finally {
        setIsTranscribing(false);
      }
    } catch (e) {
      console.error('Voice memo import error:', e);
    }
  };

  // Photos & location
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((a) => a.uri);
      setEntryData((prev) => ({
        ...prev,
        photoUris: [...prev.photoUris, ...newPhotos].slice(0, 5),
      }));
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false });
    if (!result.canceled && result.assets?.[0]) {
      setEntryData((prev) => ({
        ...prev,
        photoUris: [...prev.photoUris, result.assets[0].uri].slice(0, 5),
      }));
    }
  };

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) setEntryData((p) => ({ ...p, location: loc }));
    } catch {
      Alert.alert('Error', 'Failed to get location.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleRemoveLocation = () => setEntryData((p) => ({ ...p, location: undefined }));
  const handleRemovePhoto = (index: number) =>
    setEntryData((p) => ({ ...p, photoUris: p.photoUris.filter((_, i) => i !== index) }));

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Please sign in to save.');
      return;
    }
    const content = entryData.content.trim();
    if (!content && !entryData.title.trim() && entryData.photoUris.length === 0) {
      Alert.alert('Empty Entry', 'Please add some content to save.');
      return;
    }

    setIsSaving(true);
    try {
      let ai = { title: entryData.title.trim(), tags: [] as string[], themes: [] as string[], sentiment: null as any };
      try {
        ai = await analyzeEntryWithAI(
          content,
          entryData.mood,
          entryData.photoUris.length > 0,
          entryData.location
        );
      } catch {}

      const finalTitle = entryData.title.trim() || ai.title || 'Journal Entry';
      const dateStr = entryData.entryDate.toISOString().split('T')[0];

      await (await import('@/services/entries')).entriesService.createEntry({
        title: finalTitle,
        body: content,
        mood: entryData.mood,
        tags: (ai.tags || []).map((name) => ({ id: name, name })),
        photoUris: entryData.photoUris,
        hasPhotos: entryData.photoUris.length > 0,
        locationData: entryData.location,
        sentiment: ai.sentiment,
        themes: ai.themes,
        date: dateStr,
        createdAt: entryData.entryDate.toISOString(),
      });

      refreshEntries().catch(() => {});
      editorSheetRef.current?.close();

      requestAnimationFrame(() => {
        confirmRef.current?.present({
          title: 'Saved',
          onDone: () => {
            confirmRef.current?.dismiss();
            router.replace('/history');
          },
        });
      });

      setEntryData({
        content: '',
        title: '',
        mood: undefined,
        photoUris: [],
        location: undefined,
        entryDate: new Date(),
      });
    } catch (e: any) {
      console.error('Save error:', e);
      Alert.alert('Save Error', e?.message ?? 'Could not save entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ---- derived UI state for the subtle “added” pills
  const hasLocation = !!entryData.location;
  const photoCount = entryData.photoUris.length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={styles.mainContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Date header (centered) */}
        <View style={styles.dateHeader}>
          <View style={styles.dateHeaderTop}>
            <View style={{ width: 24 }} />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </Text>
            <View style={{ width: 24 }} />
          </View>
        </View>

        {/* Entry preview */}
        {hasContent && (
          <EntryPreview
            title={entryData.title}
            content={entryData.content}            
            opacity={previewOpacity}
            onPress={() => editorSheetRef.current?.snapToIndex(1)}
          />
        )}

        {/* Record button row */}
        <RecordButton
          isRecording={isRecording}
          duration={recordingDuration}
          onStart={startRecording}
          onStop={stopRecording}
          formatDuration={formatDuration}
        />

        {/* Prompt */}
        {!isRecording && !hasContent && (
          <Text style={styles.promptText}>Tap to start recording your thoughts</Text>
        )}

        {/* Actions (tighter, smaller icons) */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={() => editorSheetRef.current?.snapToIndex(1)}>
            <Ionicons name="text-outline" size={22} color={theme.colors.text} />
            <Text style={styles.actionLabel}>Write</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={handleImportVoiceMemo}>
            <Ionicons name="arrow-up-circle-outline" size={22} color={theme.colors.text} />
            <Text style={styles.actionLabel}>
              {Platform.OS === 'ios' ? 'Voice Memos' : 'Import Audio'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={() => router.push('/history')}>
            <Ionicons name="time-outline" size={22} color={theme.colors.text} />
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Tips card */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.tipsTitle}>Quick tips</Text>
          </View>

          <View style={styles.tipRow}>
            <Ionicons name="help-circle-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.tipText}>
              <Text style={styles.tipEmph}>Five Ws</Text>: Who, What, When, Where, Why
            </Text>
          </View>

          <View style={styles.tipRow}>
            <Ionicons name="color-palette-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.tipText}>
              <Text style={styles.tipEmph}>Go Sensory</Text>: emotions 😊, smells 👃, sounds 🎧
            </Text>
          </View>
        </View>

        {/* Subtle status pills — only visible when something’s added */}
        {(hasLocation || photoCount > 0) && (
          <View style={styles.statusRow}>
            {hasLocation && (
              <View style={styles.pill}>
                <Ionicons name="location-outline" size={14} color="#34C759" />
                <Text style={styles.pillText}>Location</Text>
                <Ionicons name="checkmark" size={14} color="#34C759" />
              </View>
            )}
            {photoCount > 0 && (
              <View style={styles.pill}>
                <Ionicons name="image-outline" size={14} color="#34C759" />
                <Text style={styles.pillText}>{photoCount} Photo{photoCount > 1 ? 's' : ''}</Text>
                <Ionicons name="checkmark" size={14} color="#34C759" />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Entry editor sheet */}
      <EntryEditor
        ref={editorSheetRef}
        entryData={entryData}
        onUpdateEntry={setEntryData}
        onSave={handleSave}
        onPickImage={handlePickImage}
        onTakePhoto={handleTakePhoto}
        onRemovePhoto={handleRemovePhoto}
        onGetLocation={handleGetLocation}
        onRemoveLocation={handleRemoveLocation}
        isGettingLocation={isGettingLocation}
        isSaving={isSaving}
        isTranscribing={isTranscribing}
        hasContent={hasContent}
      />

      {/* Confirmation sheet (modal) */}
      <ConfirmationSheet ref={confirmRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  mainContent: { flex: 1 },
  mainContentContainer: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },

  dateHeader: { alignItems: 'center', marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg },
  dateHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  dateText: { ...theme.typography.body, color: theme.colors.text, marginBottom: theme.spacing.xs, textAlign: 'center', flex: 1 },

  promptText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,   // ↓ was lg
    marginBottom: theme.spacing.md // gives a little breathing room before the actions row
  },

  // tighter actions row
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xl, // was xxxl
    marginTop: theme.spacing.lg, // was xl
  },
  action: { alignItems: 'center', padding: theme.spacing.sm },
  actionLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 4 },

  // subtle status pills shown only when something is attached
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#eef9f0', // very light green
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cdeed2',
  },
  pillText: { ...theme.typography.caption, color: '#2e7d32', fontWeight: '600' },
  tipsCard: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: '#FFF',                    // crisp card
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  tipsTitle: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  tipText: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  tipEmph: {
    color: theme.colors.text,
    fontWeight: '600',
  },
});