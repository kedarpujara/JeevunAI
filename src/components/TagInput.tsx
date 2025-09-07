import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet, Text, TextInput,
    TouchableOpacity, View
} from 'react-native';
import { theme } from '../constants/theme';
import { normalizeTagString, TAG_PRESETS } from '../services/tags';
import Chip from './Chip';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ 
  value, 
  onChange, 
  placeholder = 'Add tags...' 
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddTag = (tag: string) => {
    const normalized = normalizeTagString(tag);
    if (normalized && !value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setInput('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  const handleSubmit = () => {
    if (input.trim()) {
      handleAddTag(input);
    }
  };

  const filteredPresets = TAG_PRESETS.filter(
    preset => 
      !value.includes(preset) && 
      preset.includes(input.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.tagsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsScroll}
        >
          {value.map(tag => (
            <Chip
              key={tag}
              label={`#${tag}`}
              onRemove={() => handleRemoveTag(tag)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onFocus={() => setShowSuggestions(true)}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          returnKeyType="done"
        />
        {input.length > 0 && (
          <TouchableOpacity onPress={handleSubmit}>
            <Ionicons 
              name="add-circle-outline" 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && filteredPresets.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.suggestions}
        >
          {filteredPresets.slice(0, 5).map(preset => (
            <TouchableOpacity
              key={preset}
              style={styles.suggestion}
              onPress={() => handleAddTag(preset)}
            >
              <Text style={styles.suggestionText}>#{preset}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  tagsContainer: {
    minHeight: 32,
  },
  tagsScroll: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
  },
  suggestions: {
    maxHeight: 40,
  },
  suggestion: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
  },
  suggestionText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
  },
});