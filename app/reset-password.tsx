// app/reset-password.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    handleInitialUrl();
    
    // Listen for URL changes when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });
    
    return () => subscription.remove();
  }, []);

  const handleInitialUrl = async () => {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('Initial URL:', url);
        await handleIncomingUrl(url);
      } else {
        // No URL, check for existing session
        await checkExistingSession();
      }
    } catch (error) {
      console.error('Error getting initial URL:', error);
      await checkExistingSession();
    }
  };

  const handleIncomingUrl = async (url: string) => {
    try {
      console.log('Processing URL:', url);
      console.log('URL parts:', {
        hasHash: url.includes('#'),
        hasQuery: url.includes('?'),
        fullUrl: url
      });
      
      // First try to extract from hash fragment (new format)
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const hash = url.substring(hashIndex + 1);
        const params = new URLSearchParams(hash);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        if (accessToken && type === 'recovery') {
          console.log('Found hash tokens, setting session...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('Failed to set session from hash:', error);
            showInvalidLinkAlert();
          } else if (data.session) {
            console.log('Session established from hash successfully');
            setReady(true);
            setSessionLoading(false);
            return;
          }
        }
      }
      
      // Try query parameters (your current link format)
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      const type = urlObj.searchParams.get('type');
      
      if (token && type === 'recovery') {
        console.log('Found query token, verifying...');
        
        // Use verifyOtp for recovery tokens
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        });
        
        if (error) {
          console.error('Token verification failed:', error);
          showInvalidLinkAlert();
        } else if (data.session) {
          console.log('Session established from token successfully');
          setReady(true);
          setSessionLoading(false);
          return;
        } else {
          console.log('Token verified but no session created');
          showInvalidLinkAlert();
        }
      } else {
        console.log('No valid recovery token found in URL');
        await checkExistingSession();
      }
    } catch (error) {
      console.error('Error processing URL:', error);
      await checkExistingSession();
    }
  };

  const checkExistingSession = async () => {
    try {
      // First try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshData.session && !refreshError) {
        console.log('Session refreshed successfully');
        setReady(true);
        setSessionLoading(false);
        return;
      }
      
      // If refresh failed, check current session
      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        console.log('Existing session found');
        setReady(true);
      } else {
        console.log('No valid session found');
        showInvalidLinkAlert();
      }
    } catch (error) {
      console.error('Session check error:', error);
      showInvalidLinkAlert();
    } finally {
      setSessionLoading(false);
    }
  };

  const showInvalidLinkAlert = () => {
    setReady(false);
    setSessionLoading(false);
    Alert.alert(
      'Invalid Reset Link',
      'This reset link is invalid or has expired. Please request a new password reset.',
      [{ text: 'OK', onPress: () => router.replace('/auth/authentication') }]
    );
  };

  const validateForm = (): boolean => {
    if (!newPassword || !confirmPassword) return false;
    if (newPassword.length < 8) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) {
      if (newPassword.length < 8) {
        Alert.alert('Invalid Password', 'Password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return;
      }
      return;
    }

    setLoading(true);

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Verify we still have a valid session after password update
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        Alert.alert(
          'Password Updated',
          'Your password has been successfully updated. You are now signed in.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(tabs)')
            }
          ]
        );
      } else {
        // Password updated but no session, redirect to sign in
        Alert.alert(
          'Password Updated',
          'Your password has been successfully updated. Please sign in with your new password.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/auth/authentication')
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      Alert.alert('Reset Failed', error.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={{
          marginTop: 16,
          fontSize: 16,
          color: '#6B7280',
          textAlign: 'center'
        }}>
          Verifying reset link...
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32
      }}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={{
          marginTop: 24,
          fontSize: 20,
          fontWeight: '700',
          color: '#1F2937',
          textAlign: 'center'
        }}>
          Invalid Reset Link
        </Text>
        <Text style={{
          marginTop: 8,
          fontSize: 16,
          color: '#6B7280',
          textAlign: 'center',
          lineHeight: 24
        }}>
          This password reset link is invalid or has expired. Please request a new one.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/auth/authentication')}
          style={{
            marginTop: 32,
            paddingHorizontal: 24,
            paddingVertical: 12,
            backgroundColor: '#8B5CF6',
            borderRadius: 12
          }}
        >
          <Text style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '600'
          }}>
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{
              flex: 1,
              paddingTop: insets.top + 60,
              paddingHorizontal: 32,
              paddingBottom: insets.bottom + 32,
            }}>

              {/* Logo Section */}
              <View style={{ alignItems: 'center', marginBottom: 48 }}>
                <View style={{
                  width: 80,
                  height: 80,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}>
                  <Image
                    source={require('../assets/images/full_quill_logo.png')}
                    style={{
                      width: 200,
                      height: 200,
                    }}
                    resizeMode="contain"
                  />
                </View>
                <Text style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: '#1F2937',
                  letterSpacing: -0.5,
                  marginBottom: 8,
                }}>
                  Reset Password
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: '#6B7280',
                  textAlign: 'center',
                  lineHeight: 22,
                }}>
                  Enter your new password below
                </Text>
              </View>

              {/* Form Fields */}
              <View style={{ gap: 20 }}>

                {/* New Password Field */}
                <View>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 8,
                  }}>
                    New Password
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter your new password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        backgroundColor: '#F9FAFB',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        paddingRight: 48,
                        fontSize: 16,
                        color: '#111827',
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: 16,
                        top: 14,
                        padding: 2,
                      }}
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={{
                    fontSize: 13,
                    color: '#6B7280',
                    marginTop: 4,
                  }}>
                    Must be at least 8 characters
                  </Text>
                </View>

                {/* Confirm Password Field */}
                <View>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 8,
                  }}>
                    Confirm Password
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter your new password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        backgroundColor: '#F9FAFB',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        paddingRight: 48,
                        fontSize: 16,
                        color: '#111827',
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: 16,
                        top: 14,
                        padding: 2,
                      }}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Update Password Button */}
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={!validateForm() || loading}
                style={{
                  marginTop: 40,
                  marginBottom: 24,
                }}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                    shadowColor: '#8B5CF6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                    opacity: (!validateForm() || loading) ? 0.6 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 17,
                      fontWeight: '600',
                    }}>
                      Update Password
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Back to Sign In */}
              <TouchableOpacity
                style={{ alignSelf: 'center' }}
                onPress={() => router.replace('/auth/authentication')}
              >
                <Text style={{
                  fontSize: 15,
                  color: '#8B5CF6',
                  fontWeight: '600',
                }}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>

              {/* Security Note */}
              <View style={{
                marginTop: 40,
                padding: 16,
                backgroundColor: '#F0F9FF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#BAE6FD',
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#0EA5E9" />
                  <Text style={{
                    marginLeft: 8,
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#0C4A6E',
                  }}>
                    Security Note
                  </Text>
                </View>
                <Text style={{
                  fontSize: 13,
                  color: '#0C4A6E',
                  lineHeight: 18,
                }}>
                  After updating your password, you'll be automatically signed in. We recommend using a strong, unique password for your account.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}