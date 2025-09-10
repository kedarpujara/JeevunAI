// app/_layout.tsx
import { DrawerContent } from '@/components/DrawerContent';
import { HamburgerButton } from '@/components/HamburgerButton';
import { HomeButton } from '@/components/HomeButton';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { JournalProvider } from '@/context/JournalContext';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useRouter, useSegments } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


function AuthenticatedDrawer() {
  const { user, isReady } = useAuth(); // <— use isReady instead of loading
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!user && !inAuthGroup) {
      router.replace('/auth/authentication');
    }
  }, [user, isReady, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        drawerPosition: 'right',
        drawerType: 'slide',
        drawerStyle: { width: 280 },
        headerLeft: () => <HomeButton />,
        headerRight: () => <HamburgerButton />,
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
    >
      {/* Main tabs - hidden from drawer */}
      <Drawer.Screen name="(tabs)" options={{ headerShown: false, drawerItemStyle: { display: 'none' } }} />

      {/* Auth screens - hidden from drawer */}
      {/* <Drawer.Screen name="auth/login" options={{ headerShown: false, drawerItemStyle: { display: 'none' }, swipeEnabled: false }} />
      <Drawer.Screen name="auth/signup" options={{ headerShown: false, drawerItemStyle: { display: 'none' }, swipeEnabled: false }} /> */}
      <Drawer.Screen name="auth/authentication" options={{ headerShown: false, drawerItemStyle: { display: 'none' }, swipeEnabled: false }} />

      {/* Settings screens (route names must match files) */}
      <Drawer.Screen name="settings/general" options={{ title: 'General', headerShown: true, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/profile" options={{ title: 'Profile', headerShown: true, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/privacy" options={{ title: 'Privacy', headerShown: true, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/notifications" options={{ title: 'Notifications', headerShown: true, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/help" options={{ title: 'Help & Support', headerShown: true, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/billing" options={{title: 'Upgrade to Pro', headerShown: true, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/subscriptions" options={{title: 'Subscription', headerShown: true, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/backup" options={{title: 'Backup', headerShown: true, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/export" options={{title: 'Export', headerShown: true, drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/about" options={{title: 'About Quill', headerShown: true, drawerItemStyle: { display: 'none' } }} />

      {/* Entry detail (matches app/entry/[id].tsx) */}
      <Drawer.Screen name="entry/[id]" options={{ title: 'Entry Details', headerShown: false, drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <JournalProvider>
        <BottomSheetModalProvider>
          <AuthenticatedDrawer />
          </BottomSheetModalProvider>
        </JournalProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}