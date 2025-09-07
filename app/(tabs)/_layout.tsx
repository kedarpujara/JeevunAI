
// UPDATE app/(tabs)/_layout.tsx - MINIMAL padding fix

import { HamburgerButton } from '@/components/HamburgerButton';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../src/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 65, // ✅ TINY increase (was 60)
          paddingBottom: 12, // ✅ TINY increase (was 8)
          paddingTop: 8,
        },
        // ✅ TINY spacing adjustments
        tabBarLabelStyle: {
          marginBottom: 2, // ✅ Just a hair more space
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTitleStyle: {
          fontSize: 22,
          fontWeight: '600',
          color: theme.colors.text,
        },
      }}
    >
      <Tabs.Screen      
        name="history"
        options={{
          title: 'History',
          headerTitle: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
          headerRight: () => <HamburgerButton />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          headerTitle: 'New Entry',
          tabBarIcon: ({ focused }) => (
            <View style={styles.createButtonContainer}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primary]}
                style={[styles.createButton, focused && styles.createButtonFocused]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'AI',
          headerTitle: 'AI Assistant',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// ✨ Keep your existing button styles
const styles = StyleSheet.create({
  createButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10, // ✅ Slightly elevated above tab bar
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF', // Beautiful iOS blue
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // ✅ Beautiful gradient-like effect
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  createButtonFocused: {
    backgroundColor: '#0051D0', // Darker blue when pressed
    transform: [{ scale: 1.05 }], // Slight scale up when focused
    shadowOpacity: 0.4,
  },
});