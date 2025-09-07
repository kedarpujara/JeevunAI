import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

type Props = {
  isRecording: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  formatDuration: (s: number) => string;
};

export default function RecordButton({ isRecording, duration, onStart, onStop, formatDuration }: Props) {
  const BG = isRecording ? '#FF3B30' : theme.colors.primary;
  return (
    <View style={{ alignItems: 'center', marginVertical: 16 }}>
      <TouchableOpacity
        onPress={isRecording ? onStop : onStart}
        activeOpacity={0.9}
        style={[styles.btn, { backgroundColor: BG }]}
      >
        <Ionicons name="mic" size={36} color="#fff" />
      </TouchableOpacity>
      {isRecording && <Text style={styles.dur}>{formatDuration(duration)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  dur: {
    marginTop: 8,
    fontWeight: '600',
  },
});
