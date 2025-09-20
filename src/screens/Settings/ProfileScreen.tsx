import { useAuth } from '@/context/AuthContext';
import {
  ensureUserProfile,
  getUserProfile,
  saveUserProfile,
  type UserProfile
} from '@/services/profile';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export default function ProfileScreen() {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);

  // editable fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!isReady) return;
      if (!user) { setLoading(false); return; }
      try {
        const ensured = await ensureUserProfile(user.id, user.email ?? null);
        const fresh = await getUserProfile(user.id);
        const p = fresh ?? ensured ?? null;
        setProfile(p);
        setDisplayName(p?.display_name ?? '');
        setBio(p?.bio ?? '');
        setAvatarUrl(p?.avatar_url ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [isReady, user]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      (displayName ?? '') !== (profile.display_name ?? '') ||
      (bio ?? '') !== (profile.bio ?? '') ||
      (avatarUrl ?? null) !== (profile.avatar_url ?? null)
    );
  }, [profile, displayName, bio, avatarUrl]);

  const onPickAvatar = async () => {
    if (!editMode) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const onSave = async () => {
    if (!user || !profile || !hasChanges) return;
    setSaving(true);
    try {
      await saveUserProfile(user.id, {
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_uri:
          avatarUrl === (profile.avatar_url ?? null) ? undefined : (avatarUrl ?? null),
      });
  
      const fresh = await getUserProfile(user.id);
      setProfile(fresh ?? null);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your journal entries and data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      'This will permanently delete your account and all data. Type "DELETE" to confirm.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'I understand, delete my account',
          style: 'destructive',
          onPress: performAccountDeletion,
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (!user) return;
    
    setDeleting(true);
    try {
      // Call the edge function to delete the account
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { userId: user.id }
      });

      if (error) {
        throw error;
      }

      // Clear all local storage data
      await Promise.all([
        // Clear saved email
        AsyncStorage.removeItem('@journal_last_email'),
        // Clear biometric session
        SecureStore.deleteItemAsync('biometric_session_v1'),
        // Clear biometric flag
        SecureStore.deleteItemAsync('biometric_enabled_v1'),
        // Clear any other stored data you might have
        AsyncStorage.clear() // This clears all AsyncStorage for the app
      ]);

      // Sign out the user
      await supabase.auth.signOut();
      
      // Navigate to authentication screen
      router.replace('/auth/authentication');
      
      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted.'
      );
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Deletion Failed', 
        error.message || 'Failed to delete account. Please try again or contact support.'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!isReady || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator style={styles.center} size="large" color="#007AFF" />          
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>No user</Text>
          <Text style={styles.muted}>Sign in to manage your profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.screenTitle}>Profile</Text>
          {!editMode ? (
            <TouchableOpacity onPress={() => setEditMode(true)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={styles.link}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={() => {
                // revert to stored values
                setDisplayName(profile.display_name ?? '');
                setBio(profile.bio ?? '');
                setAvatarUrl(profile.avatar_url ?? null);
                setEditMode(false);
              }}>
                <Text style={styles.linkMuted}>Cancel</Text>
              </TouchableOpacity>
              {hasChanges && (
                <TouchableOpacity onPress={onSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#007AFF" /> : <Text style={styles.link}>Save</Text>}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={onPickAvatar}
          activeOpacity={editMode ? 0.7 : 1}
          style={styles.avatarWrap}
        >
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            : <View style={[styles.avatar, styles.avatarPlaceholder]} />
          }
          <Text style={[styles.subtle, { marginTop: 8 }]}>
            {editMode ? 'Tap to change photo' : 'Profile photo'}
          </Text>
        </TouchableOpacity>

        {/* Email – locked */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.locked}>
            <Text style={styles.lockedText}>{user.email}</Text>
          </View>
        </View>

        {/* Display Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={[styles.input, !editMode && styles.readOnly]}
            editable={editMode}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#B0B3B8"
          />
        </View>

        {/* Bio */}
        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.multiline, !editMode && styles.readOnly]}
            editable={editMode}
            value={bio}
            onChangeText={setBio}
            placeholder="A short bio"
            placeholderTextColor="#B0B3B8"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      {/* Delete Account Button */}
      <View style={styles.deleteSection}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#FF3B30" size="small" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  card: {
    margin: 20, 
    marginTop: 0, // Remove top margin to reduce whitespace
    padding: 20, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#E5E5EA', 
    backgroundColor: '#FFFFFF'
  },

  cardHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 16,
  },

  avatarWrap: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5E5EA' },
  avatarPlaceholder: { borderWidth: 1, borderColor: '#E5E5EA' },
  subtle: { color: '#8E8E93', fontSize: 12 },

  field: { marginTop: 16 },
  label: { fontSize: 13, color: '#8E8E93', marginBottom: 6 },
  input: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#E5E5EA',
    color: '#111', backgroundColor: '#FAFAFA'
  },
  multiline: { height: 96, textAlignVertical: 'top' },
  readOnly: { backgroundColor: '#F7F7F7' },

  locked: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#E5E5EA',
    backgroundColor: '#F7F7F7'
  },
  lockedText: { color: '#3A3A3C' },

  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  muted: { marginTop: 8, color: '#8E8E93' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Delete Account Button Styles
  deleteSection: {
    margin: 20,
    marginTop: 0,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});