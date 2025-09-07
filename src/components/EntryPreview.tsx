import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';

interface EntryPreviewProps {
  title: string;
  content: string;
  opacity: Animated.Value;
  onPress: () => void;
}

export default function EntryPreview({ title, content, opacity, onPress }: EntryPreviewProps) {
  const getPreviewText = () => {
    if (title) return title;
    if (content) {
      const preview = content.substring(0, 100);
      return content.length > 100 ? preview + '...' : preview;
    }
    return '';
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.header}>
          <Text style={styles.label}>Current Entry</Text>
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.text} numberOfLines={3}>
          {getPreviewText()}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
});