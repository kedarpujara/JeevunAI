import { supabase } from '@/services/supabase';
import { Link, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text,
  TextInput, TouchableWithoutFeedback, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── validators ────────────────────────────────────────────────────────────────
function validateDisplayName(name: string): string | null {
  const n = name.trim();
  if (!n) return 'Display name is required.';
  if (n.length < 2) return 'Display name must be at least 2 characters.';
  if (n.length > 40) return 'Display name must be at most 40 characters.';
  const ok = /^[A-Za-z][A-Za-z .'\-]*$/.test(n);
  if (!ok) return 'Use letters, spaces, apostrophes, hyphens, or periods only.';
  return null;
}
function validateEmail(email: string): string | null {
  const e = email.trim();
  if (!e) return 'Email is required.';
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  if (!ok) return 'Enter a valid email address.';
  return null;
}
function validatePassword(pw: string): string | null {
  if (pw.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  // track which fields have been interacted with (to gate error visibility)
  const [touched, setTouched] = useState<{name:boolean; email:boolean; pw:boolean}>({
    name: false, email: false, pw: false,
  });

  // server/API errors only
  const [err, setErr]   = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // compute field errors (pure)
  const nameErr = useMemo(() => validateDisplayName(displayName), [displayName]);
  const emailErr = useMemo(() => validateEmail(email), [email]);
  const pwErr = useMemo(() => validatePassword(password), [password]);

  const canSubmit =
    !nameErr && !emailErr && !pwErr && !submitting;

  function markTouched(which: 'name'|'email'|'pw') {
    setTouched(t => ({ ...t, [which]: true }));
  }

  async function onSignup() {
    setSubmitted(true);
    setErr(null);
    setInfo(null);

    // stop here if client-side invalid; do NOT set a global err (prevents cross-field confusion)
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const cleanName = displayName.trim();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: cleanName } },
      });
      if (error) throw error;

      if (data.session?.user) {
        // seed profile + default avatar
        const u = data.session.user;
        const {
          ensureUserProfile,
          ensureDefaultAvatar,
          broadcastProfileUpdated,
        } = await import('@/services/profile');

        const prof = await ensureUserProfile(u.id, u.email ?? null, cleanName);
        if (!prof.avatar_url) await ensureDefaultAvatar(u.id, cleanName);
        broadcastProfileUpdated(u.id);

        router.replace('/(tabs)');
      } else {
        setInfo('Check your email to confirm your account, then log in.');
      }
    } catch (e: any) {
      // server-side error only
      setErr(e?.message ?? 'Unable to sign up');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1, backgroundColor: '#0b0b0e', paddingTop: insets.top }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }}
          >
            <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', marginBottom: 24 }}>
              Create your account
            </Text>

            <View style={{ gap: 12 }}>
              {/* Display name */}
              <TextInput
                value={displayName}
                onChangeText={(t) => { setDisplayName(t); }}
                onBlur={() => markTouched('name')}
                placeholder="Full name"
                placeholderTextColor="#8b8b92"
                returnKeyType="next"
                onSubmitEditing={() => Keyboard.dismiss()}
                style={{
                  color: 'white',
                  backgroundColor: '#11131a',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#262a33',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
              />
              {(submitted || touched.name) && !!nameErr && (
                <Text style={{ color: '#ff6b6b', marginTop: -6, marginBottom: 6 }}>{nameErr}</Text>
              )}

              {/* Email */}
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); }}
                onBlur={() => markTouched('email')}
                placeholder="Email"
                placeholderTextColor="#8b8b92"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => Keyboard.dismiss()}
                style={{
                  color: 'white',
                  backgroundColor: '#11131a',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#262a33',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
              />
              {(submitted || touched.email) && !!emailErr && (
                <Text style={{ color: '#ff6b6b', marginTop: -6, marginBottom: 6 }}>{emailErr}</Text>
              )}

              {/* Password */}
              <TextInput
                value={password}
                onChangeText={(t) => { setPassword(t); }}
                onBlur={() => markTouched('pw')}
                placeholder="Password (min 6 chars)"
                placeholderTextColor="#8b8b92"
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={onSignup}
                style={{
                  color: 'white',
                  backgroundColor: '#11131a',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#262a33',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
              />
              {(submitted || touched.pw) && !!pwErr && (
                <Text style={{ color: '#ff6b6b', marginTop: -6, marginBottom: 6 }}>{pwErr}</Text>
              )}
            </View>

            {/* Only server errors go here */}
            {!!err && <Text style={{ color: '#ff6b6b', marginTop: 12 }}>{err}</Text>}
            {!!info && <Text style={{ color: '#9be7c4', marginTop: 12 }}>{info}</Text>}

            <View style={{ marginTop: 16 }}>
              <Text
                onPress={onSignup}
                style={{
                  textAlign: 'center',
                  backgroundColor: canSubmit ? '#7c3aed' : '#5b21b6',
                  color: 'white',
                  paddingVertical: 12,
                  borderRadius: 12,
                  fontWeight: '700',
                  opacity: submitting ? 0.8 : 1,
                }}
              >
                {submitting ? 'Creating account…' : 'Sign Up'}
              </Text>
            </View>

            <View style={{ marginTop: 18, alignItems: 'center' }}>
              <Link href="/auth/login" style={{ color: '#bcbcc6' }}>
                Already have an account? <Text style={{ color: 'white', fontWeight: '700' }}>Sign in</Text>
              </Link>
            </View>

            {submitting && (
              <View style={{ marginTop: 16, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}