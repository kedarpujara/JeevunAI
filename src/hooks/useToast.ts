import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';

interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom';
}

export function useToast() {
  const showToast = useCallback((message: string, options?: ToastOptions) => {
    // For now, use Alert as a simple toast
    // Later can integrate with a proper toast library
    if (Platform.OS === 'web') {
      // For web, could use a different approach
      console.log(message);
    } else {
      // For mobile, show a simple alert
      // In production, replace with react-native-toast-message or similar
      Alert.alert('', message, [{ text: 'OK' }], {
        cancelable: true,
      });
    }
  }, []);

  const showError = useCallback((message: string) => {
    Alert.alert('Error', message);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message);
  }, [showToast]);

  return {
    showToast,
    showError,
    showSuccess,
  };
}