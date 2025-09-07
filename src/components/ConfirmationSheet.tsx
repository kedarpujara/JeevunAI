import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ConfirmationSheetRef = {
  present: (opts?: { title?: string; subtitle?: string; onDone?: () => void; durationMs?: number }) => void;
  dismiss: () => void;
};

type Props = { };

const ConfirmationSheet = forwardRef<ConfirmationSheetRef, Props>((_props, ref) => {
  const modalRef = useRef<BottomSheetModal>(null);
  const stateRef = useRef<{ title?: string; subtitle?: string; onDone?: () => void }>({});

  useImperativeHandle(ref, () => ({
    present: (opts) => {
      stateRef.current = opts || {};
      modalRef.current?.present();
      const ms = opts?.durationMs ?? 1400; // was 750
      setTimeout(() => {
        stateRef.current.onDone?.();
      }, ms);
    },
    dismiss: () => modalRef.current?.dismiss(),
  }));

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={['30%']}
      backdropComponent={(p) => (
        <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.3} />
      )}
      handleIndicatorStyle={{ backgroundColor: '#D1D1D6' }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.container}>
        <View style={styles.checkWrap}>
          <Ionicons name="checkmark-circle" size={64} color="#34C759" />
        </View>
        <Text style={styles.title}>{stateRef.current.title || 'Saved'}</Text>
        {!!stateRef.current.subtitle && <Text style={styles.subtitle}>{stateRef.current.subtitle}</Text>}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 28,
    alignItems: 'center',
  },
  checkWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#E8F9EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default ConfirmationSheet;