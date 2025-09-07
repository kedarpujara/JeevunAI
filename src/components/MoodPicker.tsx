import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';
import { Mood } from '../types/journal';

interface MoodPickerProps {
  value?: Mood;
  onChange: (mood: Mood) => void;
}

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((mood) => (
        <TouchableOpacity
          key={mood}
          style={[
            styles.mood,
            value === mood && styles.moodSelected,
          ]}
          onPress={() => onChange(mood as Mood)}
        >
          <Text style={styles.emoji}>{moodEmojis[mood - 1]}</Text>
          <Text style={styles.label}>{mood}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  mood: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  moodSelected: {
    backgroundColor: theme.colors.primary,
  },
  emoji: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});