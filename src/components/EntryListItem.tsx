import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image, StyleSheet, Text,
    TouchableOpacity, View
} from 'react-native';
import { theme } from '../constants/theme';
import { Entry } from '../types/journal';
import { formatRelativeTime } from '../utils/format';

interface EntryListItemProps {
    entry: Entry;
    onPress: () => void;
    onDelete: () => void;
}
export default function EntryListItem({ entry, onPress, onDelete }: EntryListItemProps) {
    const getMoodEmoji = (mood: number): string => {
        const emojis = ['😔', '😕', '😐', '🙂', '😊'];
        return emojis[Math.min(Math.max(mood - 1, 0), 4)];
    };

    const hasPhotos = entry.photoUris && entry.photoUris.length > 0;

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.date}>{formatRelativeTime(entry.createdAt)}</Text>
                    <View style={styles.headerRight}>
                        {entry.mood && (
                            <Text style={styles.mood}>{getMoodEmoji(entry.mood)}</Text>
                        )}
                        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                {entry.title && (
                    <Text style={styles.title} numberOfLines={1}>
                        {entry.title}
                    </Text>
                )}

                {entry.body && (
                    <Text style={styles.body} numberOfLines={2}>
                        {entry.body}
                    </Text>
                )}

                {/* FIXED: Photos display with proper unique keys */}
                {hasPhotos && (
                    <View style={styles.photosContainer}>
                        <View style={styles.photosGrid}>
                            {entry.photoUris!.slice(0, 3).map((photoUri, index) => (
                                <Image
                                    key={`${entry.id}-photo-${index}`}  // ✅ FIXED: Use entry.id + index
                                    source={{ uri: photoUri }}
                                    style={styles.photoThumbnail}
                                    resizeMode="cover"
                                />
                            ))}
                            {entry.photoUris!.length > 3 && (
                                <View key={`${entry.id}-more-photos`} style={styles.morePhotosOverlay}>
                                    <Text style={styles.morePhotosText}>
                                        +{entry.photoUris!.length - 3}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* FIXED: Tags with guaranteed unique keys */}
                {entry.tags && entry.tags.length > 0 && (
                    <View style={styles.tags}>
                        {entry.tags.slice(0, 3).map((tag, index) => (
                            <View
                                key={`${entry.id}-tag-${index}-${tag.name || tag.id || 'unknown'}`}  // ✅ FIXED: Use entry.id + index + name
                                style={styles.tag}
                            >
                                <Text style={styles.tagText}>#{tag.name}</Text>
                            </View>
                        ))}
                        {entry.tags.length > 3 && (
                            <Text key={`${entry.id}-more-tags`} style={styles.moreTags}>
                                +{entry.tags.length - 3}
                            </Text>
                        )}
                    </View>
                )}

                {/* Location display */}
                {entry.locationData && (
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.locationText}>
                            {entry.locationData.locationData?.place?.name ||
                                entry.locationData.locationData?.address?.city ||
                                entry.locationData.locationData?.address?.formattedAddress}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}


const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.background,
        marginBottom: theme.spacing.sm,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    content: {
        padding: theme.spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    date: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    mood: {
        fontSize: 20,
    },
    deleteButton: {
        padding: theme.spacing.xs,
    },
    title: {
        ...theme.typography.body,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    body: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    tags: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    tag: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.radius.sm,
    },
    tagText: {
        ...theme.typography.caption,
        color: theme.colors.primary,
    },
    moreTags: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },

    photosContainer: {
        marginVertical: theme.spacing.sm,
    },
    photosGrid: {
        flexDirection: 'row',
        gap: 4,
    },
    photoThumbnail: {
        width: 50,
        height: 50,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.surface,
    },
    morePhotosOverlay: {
        width: 50,
        height: 50,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    morePhotosText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.xs,
    },
    locationText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
});