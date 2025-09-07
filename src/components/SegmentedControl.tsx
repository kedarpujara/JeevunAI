import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
  activeColor?: string;
  activeBackground?: string;
};

export default function SegmentedControl({
  options,
  selectedIndex,
  onChange,
  style,
  activeColor = theme.colors.primary,
  activeBackground = theme.colors.surface,
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {options.map((label, i) => {
        const active = i === selectedIndex;
        return (
          <TouchableOpacity
            key={label}
            onPress={() => onChange(i)}
            style={[
              styles.item,
              {
                backgroundColor: active ? activeBackground : 'transparent',
                borderColor: active ? activeColor : 'rgba(0,0,0,0.12)',
              },
            ]}
            activeOpacity={0.9}
          >
            <Text style={[styles.text, { color: active ? activeColor : '#111' }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
