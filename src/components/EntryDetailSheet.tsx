// components/EntryDetailSheet.tsx - Based on your working version with delete added

import React, { forwardRef, useImperativeHandle, useRef, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Modal } from 'react-native';
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
  onEdit?: (entry: Entry) => void;
  onDelete?: (entry: Entry) => void;
}

const EntryDetailSheet = forwardRef<EntryDetailSheetRef, EntryDetailSheetProps>(
  ({ entry, onDismiss, onEdit, onDelete }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

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

    const handleDelete = useCallback(() => {
      if (entry && onDelete) {
        onDelete(entry);
      }
    }, [entry, onDelete]);

    const handlePhotoPress = useCallback((photoUri: string) => {
      setViewingPhoto(photoUri);
    }, []);

    const closePhotoViewer = useCallback(() => {
      setViewingPhoto(null);
    }, []);

    if (!entry) return null;

    return (
      <>
        <BottomSheetModal
          ref={bottomSheetRef}
          snapPoints={['85%']}
          onDismiss={onDismiss}
          backgroundStyle={styles.background}
          handleIndicatorStyle={styles.indicator}
        >
          <View style={styles.container}>
            {/* Header with Edit and Delete buttons */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>Entry Details</Text>
                <Text style={styles.headerDate}>
                  {formatDisplayDate(entry.date)} • {formatTime(entry.createdAt)}
                </Text>
              </View>
              
              <View style={styles.actionButtons}>
                {onDelete && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]} 
                    onPress={handleDelete}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                  </TouchableOpacity>
                )}
                
                {onEdit && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.editButton]} 
                    onPress={handleEdit}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <BottomSheetScrollView 
              style={styles.scrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
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
                      <TouchableOpacity
                        key={index}
                        onPress={() => handlePhotoPress(uri)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri }} style={styles.photo} />
                      </TouchableOpacity>
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
                <View style={[styles.section, styles.lastSection]}>
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
            </BottomSheetScrollView>
          </View>
        </BottomSheetModal>

        {/* Photo viewer modal */}
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
      </>
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
    paddingBottom: theme.spacing.xl,
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
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: theme.colors.primary + '15',
  },
  deleteButton: {
    backgroundColor: theme.colors.danger + '15',
  },
  scrollView: {
    flex: 1,
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  lastSection: {
    marginBottom: theme.spacing.xxl * 2,
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
    width: '90%',
    height: '80%',
    borderRadius: theme.radius.lg,
  },
});

export default EntryDetailSheet;