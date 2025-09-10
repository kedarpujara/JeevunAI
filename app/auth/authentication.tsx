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
  Switch,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthMode = 'signin' | 'signup';

export default function AuthenticationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const EMAIL_STORAGE_KEY = '@journal_last_email';


  useEffect(() => {
    loadSavedEmail();
    checkBiometricSupport();
  }, []);

  const loadSavedEmail = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem(EMAIL_STORAGE_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch (error) {
      console.log('Failed to load saved email:', error);
    }
  };

  const saveEmail = async (emailToSave: string) => {
    try {
      await AsyncStorage.setItem(EMAIL_STORAGE_KEY, emailToSave.trim());
    } catch (error) {
      console.log('Failed to save email:', error);
    }
  };

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(compatible && enrolled);
    } catch (error) {
      setBiometricSupported(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const validateForm = (): boolean => {
    if (!email.trim() || !password) return false;
    if (!validateEmail(email)) return false;
    if (password.length < 6) return false;
    
    if (mode === 'signup') {
      if (!name.trim()) return false;
      if (password !== confirmPassword) return false;
      if (name.trim().length < 2) return false;
    }
    
    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) {
      Alert.alert('Invalid Input', 'Please check your information and try again.');
      return;
    }

    setLoading(true);
    
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        
        if (error) throw error;

        // Save email on successful sign in        
        await saveEmail(email);
        router.replace('/(tabs)');
        
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { 
            data: { display_name: name.trim() } 
          },
        });
        
        if (error) throw error;
        
        if (data.session?.user) {
          // Save email on successful sign up
          await saveEmail(email);
          // Handle profile creation logic here
          router.replace('/(tabs)');
        } else {
          Alert.alert(
            'Check Your Email', 
            'Please verify your email address to complete registration.'
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        mode === 'signin' ? 'Sign In Failed' : 'Sign Up Failed',
        error.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    // Clear form when switching modes    
    setPassword('');
    setName('');
    setConfirmPassword('');
  };

  const clearSavedEmail = async () => {
    try {
      await AsyncStorage.removeItem(EMAIL_STORAGE_KEY);
      setEmail('');
    } catch (error) {
      console.log('Failed to clear saved email:', error);
    }
  };


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
                source={require('../../assets/images/full_quill_logo.png')}
                style={{
                    width: 200,
                    height: 200,
                }}
                resizeMode="contain"
                />
            </View>
            <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#8B5CF6',
                letterSpacing: -0.5,
                paddingTop: 15,
            }}>
                Welcome
            </Text>
            </View>

              {/* Mode Toggle */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: '#F8FAFC',
                borderRadius: 16,
                padding: 4,
                marginBottom: 32,
              }}>
                <TouchableOpacity
                  onPress={() => switchMode('signup')}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: mode === 'signup' ? '#FFFFFF' : 'transparent',
                    shadowColor: mode === 'signup' ? '#000000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: mode === 'signup' ? 0.08 : 0,
                    shadowRadius: 4,
                    elevation: mode === 'signup' ? 2 : 0,
                  }}
                >
                  <Text style={{
                    textAlign: 'center',
                    fontSize: 16,
                    fontWeight: '600',
                    color: mode === 'signup' ? '#1F2937' : '#6B7280',
                  }}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => switchMode('signin')}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: mode === 'signin' ? '#FFFFFF' : 'transparent',
                    shadowColor: mode === 'signin' ? '#000000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: mode === 'signin' ? 0.08 : 0,
                    shadowRadius: 4,
                    elevation: mode === 'signin' ? 2 : 0,
                  }}
                >
                  <Text style={{
                    textAlign: 'center',
                    fontSize: 16,
                    fontWeight: '600',
                    color: mode === 'signin' ? '#1F2937' : '#6B7280',
                  }}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={{ gap: 20 }}>
                
                {/* Name Field (Sign Up Only) */}
                {mode === 'signup' && (
                  <View>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: 8,
                    }}>
                      Name
                    </Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Your full name"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      autoCorrect={false}
                      style={{
                        backgroundColor: '#F9FAFB',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        fontSize: 16,
                        color: '#111827',
                      }}
                    />
                  </View>
                )}

                {/* Email Field */}
                <View>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 8,
                  }}>
                    Email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      backgroundColor: '#F9FAFB',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 16,
                      color: '#111827',
                    }}
                  />
                </View>

                {/* Password Field */}
                <View>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 8,
                  }}>
                    Password
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter password'}
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
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
                      onPress={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 16,
                        top: 14,
                        padding: 2,
                      }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password (Sign Up Only) */}
                {mode === 'signup' && (
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
                        placeholder="Re-enter password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
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
                )}

                {/* Biometric Toggle */}
                {biometricSupported && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    marginTop: 8,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: '#374151',
                      }}>
                        Enable biometrics
                      </Text>
                      <Text style={{
                        fontSize: 13,
                        color: '#6B7280',
                        marginTop: 2,
                      }}>
                        Use Face ID or Touch ID for quick access
                      </Text>
                    </View>
                    <Switch
                      value={biometricEnabled}
                      onValueChange={setBiometricEnabled}
                      trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                      thumbColor={biometricEnabled ? '#8B5CF6' : '#F9FAFB'}
                    />
                  </View>
                )}
              </View>

              {/* Main Action Button */}
              <TouchableOpacity
                onPress={handleAuth}
                disabled={!validateForm() || loading}
                style={{
                  marginTop: 32,
                  marginBottom: 16,
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
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Forgot Password (Sign In Only) */}
              {mode === 'signin' && (
                <TouchableOpacity style={{ alignSelf: 'center', marginBottom: 24 }}>
                  <Text style={{
                    fontSize: 15,
                    color: '#8B5CF6',
                    fontWeight: '600',
                  }}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              )}

              {/* Divider */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 24,
              }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                <Text style={{
                  marginHorizontal: 16,
                  fontSize: 14,
                  color: '#6B7280',
                }}>
                  or
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              </View>

              {/* Google Sign In */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 12,
                  paddingVertical: 14,
                  marginBottom: 24,
                }}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={{
                  marginLeft: 12,
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#374151',
                }}>
                  {mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
                </Text>
              </TouchableOpacity>

              {/* Terms (Sign Up Only) */}
              {mode === 'signup' && (
                <Text style={{
                  fontSize: 13,
                  color: '#6B7280',
                  textAlign: 'center',
                  lineHeight: 18,
                }}>
                  By signing up, you agree to our{' '}
                  <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>
                    Privacy Policy
                  </Text>
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}