import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet, Text, View
} from 'react-native';
import { theme } from '../../src/constants/theme';
import { storageService } from '../../src/services/storage/asyncStorage';

export default function AssistantTab() {
  const [notifyEnabled, setNotifyEnabled] = React.useState(false);

  const handleNotifyToggle = async (value: boolean) => {
    setNotifyEnabled(value);
    await storageService.setSetting('notify_ai_ready', value.toString());
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="sparkles" size={80} color={theme.colors.primary} />
        <Text style={styles.title}>AI Assistant Coming Soon</Text>
        <Text style={styles.message}>
          Your personal AI journaling companion will help you reflect on your thoughts,
          identify patterns, and provide insights about your journey.
        </Text>
        
        {/* <TextInput
          style={styles.input}
          placeholder="Ask me anything..."
          placeholderTextColor={theme.colors.muted}
          editable={false}
        /> */}
        
        {/* <View style={styles.notifyContainer}>
          <Text style={styles.notifyText}>Notify me when ready</Text>
          <Switch
            value={notifyEnabled}
            onValueChange={handleNotifyToggle}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  input: {
    width: '100%',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    ...theme.typography.body,
    marginBottom: theme.spacing.xl,
  },
  notifyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  notifyText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});