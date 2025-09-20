// src/services/encryption.ts
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'journal_encryption_key';
const ALGORITHM = 'AES-GCM';

export class EncryptionService {
  private static encryptionKey: string | null = null;

  /**
   * Generate or retrieve the user's encryption key
   * This key should be unique per user and stored securely
   */
  private static async getEncryptionKey(userId: string): Promise<string> {
    if (this.encryptionKey) return this.encryptionKey;

    // Try to get existing key from secure storage
    const storageKey = `${STORAGE_KEY}_${userId}`;
    let key = await AsyncStorage.getItem(storageKey);

    if (!key) {
      // Generate a new 256-bit key for this user
      const keyBytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(keyBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      
      // Store the key securely
      await AsyncStorage.setItem(storageKey, key);
      console.log('🔐 Generated new encryption key for user');
    }

    this.encryptionKey = key;
    return key;
  }

  /**
   * Encrypt sensitive journal data
   */
  static async encrypt(data: any, userId: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey(userId);
      const jsonString = JSON.stringify(data);
      
      // Convert string to bytes
      const textEncoder = new TextEncoder();
      const dataBytes = textEncoder.encode(jsonString);
      
      // Generate random IV (Initialization Vector)
      const iv = await Crypto.getRandomBytesAsync(12); // 96-bit IV for GCM
      
      // Import the key for Web Crypto API
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        this.hexToArrayBuffer(key),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        cryptoKey,
        dataBytes
      );

      // Combine IV + encrypted data and encode as base64
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error('Failed to encrypt journal data');
    }
  }

  /**
   * Decrypt sensitive journal data
   */
  static async decrypt(encryptedData: string, userId: string): Promise<any> {
    try {
      const key = await this.getEncryptionKey(userId);
      
      // Decode base64 to get IV + encrypted data
      const combined = this.base64ToArrayBuffer(encryptedData);
      
      // Extract IV (first 12 bytes) and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedBuffer = combined.slice(12);
      
      // Import the key for Web Crypto API
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        this.hexToArrayBuffer(key),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        cryptoKey,
        encryptedBuffer
      );

      // Convert back to string and parse JSON
      const textDecoder = new TextDecoder();
      const jsonString = textDecoder.decode(decryptedBuffer);
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error('Failed to decrypt journal data');
    }
  }

  /**
   * Clear encryption key from memory (call on logout)
   */
  static clearKey(): void {
    this.encryptionKey = null;
  }

  // Helper functions for data conversion
  private static hexToArrayBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}