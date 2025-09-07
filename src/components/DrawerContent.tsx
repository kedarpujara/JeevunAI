// src/components/DrawerContent.tsx
import { useAuth } from '@/context/AuthContext';
import { useJournalStats } from '@/hooks/useJournalStats';
import { ensureUserProfile, getUserProfile, PROFILE_UPDATED_EVENT, type UserProfile } from '@/services/profile';
import { supabase } from '@/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  DeviceEventEmitter, Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  badge?: string;
  separator?: boolean;
}

const menuItems: MenuItem[] = [
  // Profile
  { id: 'profile', label: 'Profile', icon: 'person-circle-outline', route: '/settings/profile' },

  // Main Settings
  { id: 'sep1', separator: true, label: '', icon: 'cube' },
  // { id: 'general', label: 'General', icon: 'settings-outline', route: '/settings/general' },
  { id: 'privacy', label: 'Privacy & Security', icon: 'lock-closed-outline', route: '/settings/privacy' },
  // { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', route: '/settings/notifications' },

  // Data Management
  // { id: 'sep2', separator: true, label: '', icon: 'cube' },
  // { id: 'backup', label: 'Backup & Sync', icon: 'cloud-outline', route: '/settings/backup' },
  // { id: 'export', label: 'Export Data', icon: 'download-outline', route: '/settings/export' },
  // { id: 'storage', label: 'Storage', icon: 'folder-outline', route: '/settings/storage' },

  // Account & Billing
  // { id: 'sep3', separator: true, label: '', icon: 'cube' },
  { id: 'billing', label: 'Upgrade', icon: 'card-outline', route: '/settings/billing', badge: 'PRO' },
  
  // { id: 'subscription', label: 'Subscription', icon: 'star-outline', route: '/settings/subscriptions' },

  // Support
  { id: 'sep4', separator: true, label: '', icon: 'cube' },
  // { id: 'help', label: 'Help & Support', icon: 'help-circle-outline', route: '/settings/help' },
  // { id: 'about', label: 'About Jeevun', icon: 'information-circle-outline', route: '/settings/about' },
];

export const DrawerContent: React.FC<any> = (props) => {
  const router = useRouter();
  const { user } = useAuth(); // no 'profile' here
  const stats = useJournalStats();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    let alive = true;
  
    async function refreshProfile() {
      if (!user) { setProfile(null); return; }
      try {
        const ensured = await ensureUserProfile(user.id, user.email ?? null, user.user_metadata?.display_name ?? null);
        const fresh = await getUserProfile(user.id);
        if (!alive) return;
        setProfile(fresh ?? ensured);
      } catch (e) {
        if (__DEV__) console.warn('Drawer profile load error:', e);
      }
    }
  
    // 1) initial
    refreshProfile();
  
    // 2) when drawer opens
    const unsubOpen = props.navigation?.addListener?.('drawerOpen', refreshProfile);
  
    // 3) when profile is updated anywhere in the app
    const sub = DeviceEventEmitter.addListener(PROFILE_UPDATED_EVENT, (payload: { userId?: string }) => {
      if (!user?.id) return;
      if (!payload?.userId || payload.userId === user.id) refreshProfile();
    });
  
    return () => {
      alive = false;
      unsubOpen?.();
      sub.remove();
    };
  }, [user, props.navigation]);
  
  // Load (or create) profile row for current user
  // useEffect(() => {
  //   let alive = true;
  
  //   async function refreshProfile() {
  //     if (!user) { setProfile(null); return; }
  //     try {
  //       const ensured = await ensureUserProfile(user.id, user.email ?? null);
  //       const fresh = await getUserProfile(user.id);
  //       if (!alive) return;
  //       setProfile(fresh ?? ensured);
  //     } catch (e) {
  //       if (__DEV__) console.warn('Drawer profile load error:', e);
  //     }
  //   }
  
  //   // 1) initial fetch
  //   refreshProfile();
  
  //   // 2) refresh when drawer opens
  //   const unsubOpen = props.navigation?.addListener?.('drawerOpen', refreshProfile);
  
  //   // 3) refresh when any screen emits PROFILE_UPDATED_EVENT
  //   const sub = DeviceEventEmitter.addListener(PROFILE_UPDATED_EVENT, (payload) => {
  //     if (payload?.userId === user?.id) refreshProfile();
  //   });
  
  //   // 4) realtime push from DB (instant updates after ProfileScreen save, etc.)
  //   let channel: ReturnType<typeof supabase.channel> | null = null;
  //   if (user) {
  //     channel = supabase
  //       .channel(`profile-${user.id}`)
  //       .on(
  //         'postgres_changes',
  //         { event: '*', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` },
  //         (payload) => {
  //           const row = (payload.new ?? payload.old) as UserProfile | null;
  //           if (row) setProfile((prev) => ({ ...(prev || {}), ...row }));
  //         }
  //       )
  //       .subscribe();
  //   }
  
  //   return () => {
  //     alive = false;
  //     unsubOpen?.();
  //     sub.remove();
  //     if (channel) supabase.removeChannel(channel);
  //   };
  // }, [user?.id, user?.email, props.navigation]);

  const displayName = useMemo(() => {
    return profile?.display_name || user?.email?.split('@')[0] || 'User';
  }, [profile, user]);

  const avatarUri = useMemo(() => {
    if (profile?.avatar_url) return profile.avatar_url;
    const initialsName = encodeURIComponent(displayName);
    // cache-buster so it updates immediately if displayName changes
    return `https://ui-avatars.com/api/?name=${initialsName}&background=007AFF&color=fff&size=80&v=${encodeURIComponent(displayName)}`;
  }, [profile?.avatar_url, displayName]);

  const handleItemPress = (route?: string) => {
    if (route) {
      router.push(route as any);
      props.navigation?.closeDrawer?.();
    }
  };

  const onSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      if (__DEV__) console.warn('signOut error:', e);
    } finally {
      props.navigation?.closeDrawer?.();
      router.replace('/auth/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <DrawerContentScrollView {...props} scrollEnabled>
        {/* Header with User Info */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Image source={{ uri: avatarUri }} style={styles.profileImage} />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => handleItemPress('/settings/profile')}
            >
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{profile?.email || user?.email || ''}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.totalDays}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => {
            if (item.separator) return <View key={item.id} style={styles.separator} />;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleItemPress(item.route)}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon} size={22} color="#666" />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </View>
                {item.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Jeevun v1.0.0</Text>
          <TouchableOpacity onPress={() => handleItemPress('/settings/privacy')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Divider + Sign out */}
        <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 12 }} />
        <TouchableOpacity
          onPress={onSignOut}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}
        >
          <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
          <Text style={{ marginLeft: 12, fontSize: 16, color: '#ff3b30', fontWeight: '600' }}>
            Sign out
          </Text>
        </TouchableOpacity>
      </DrawerContentScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    paddingTop: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  profileImageContainer: { position: 'relative', marginBottom: 12 },
  profileImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5E5EA' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: { fontSize: 20, fontWeight: '600', color: '#000', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#8E8E93', marginBottom: 16 },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#8E8E93' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: '#E5E5EA' },
  menuContainer: { backgroundColor: '#FFF', marginBottom: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuItemText: { fontSize: 16, color: '#000', marginLeft: 12 },
  badge: { backgroundColor: '#7c3aed', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  separator: { height: 8, backgroundColor: '#F2F2F7' },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#8E8E93', marginBottom: 8 },
  footerLink: { fontSize: 12, color: '#7c3aed' },
});