import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = '@quill_onboarding_completed';

export default function IntroScreen() {
  const router = useRouter();

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      router.replace('/auth/authentication');
    } catch (error) {
      console.log('Failed to save onboarding status:', error);
      router.replace('/auth/authentication');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={{
        flex: 1,
        paddingHorizontal: 32,
        paddingVertical: 60,
        justifyContent: 'space-between',
      }}>
        
        {/* Header Section */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          
          {/* Logo */}
          <View style={{
            marginBottom: 48,
            alignItems: 'center',
          }}>
            <View style={{
              width: 120,
              height: 120,
              backgroundColor: '#F8F4FF',
              borderRadius: 60,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
              shadowColor: '#8B5CF6',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 8,
            }}>
              <Image
                source={require('../assets/images/full_quill_logo.png')}
                style={{
                  width: 80,
                  height: 80,
                }}
                resizeMode="contain"
              />
            </View>
            
            <Text style={{
              fontSize: 36,
              fontWeight: '700',
              color: '#8B5CF6',
              letterSpacing: -1,
              marginBottom: 8,
            }}>
              Quill
            </Text>
          </View>

          {/* Main Heading */}
          <Text style={{
            fontSize: 32,
            fontWeight: '800',
            color: '#1F2937',
            textAlign: 'center',
            lineHeight: 40,
            marginBottom: 16,
            letterSpacing: -0.5,
          }}>
            Your life, recorded
          </Text>

          {/* Subtitle */}
          <Text style={{
            fontSize: 18,
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: 26,
            fontWeight: '400',
            marginBottom: 48,
          }}>
            Each day is a movie, why not{'\n'}remember it?
          </Text>

          {/* Features Card */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 32,
            marginHorizontal: 8,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 8,
            borderWidth: 1,
            borderColor: '#F3F4F6',
          }}>
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#1F2937',
              textAlign: 'center',
              marginBottom: 24,
              letterSpacing: -0.5,
            }}>
              What You Get
            </Text>

            <View style={{ gap: 20 }}>
              {/* Voice-first journaling */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 44,
                  height: 44,
                  backgroundColor: '#F3E8FF',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name="mic" size={20} color="#8B5CF6" />
                </View>
                <Text style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: '#374151',
                  flex: 1,
                }}>
                  Voice-first journaling
                </Text>
              </View>

              {/* Private and secure */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 44,
                  height: 44,
                  backgroundColor: '#F0FDF4',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name="lock-closed" size={20} color="#16A34A" />
                </View>
                <Text style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: '#374151',
                  flex: 1,
                }}>
                  Private and secure
                </Text>
              </View>

              {/* AI-powered insights */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 44,
                  height: 44,
                  backgroundColor: '#FFF7ED',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name="bulb" size={20} color="#EA580C" />
                </View>
                <Text style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: '#374151',
                  flex: 1,
                }}>
                  AI-powered insights
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          style={{ marginTop: 40 }}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              paddingVertical: 18,
              alignItems: 'center',
              shadowColor: '#8B5CF6',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '700',
              letterSpacing: 0.5,
            }}>
              Continue
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}