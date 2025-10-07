// src/services/encryption.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

const STORAGE_KEY = 'journal_encryption_key';

export class EncryptionService {
  private static encryptionKey: string | null = null;

  /**
   * Generate or retrieve the user's encryption key
   */
  private static async getEncryptionKey(userId: string): Promise<string> {
    if (this.encryptionKey) return this.encryptionKey;

    const storageKey = `${STORAGE_KEY}_${userId}`;
    let key = await AsyncStorage.getItem(storageKey);

    if (!key) {
      // Generate a deterministic key from userId
      key = this.generateDeterministicKey(userId);
      await AsyncStorage.setItem(storageKey, key);
      console.log('Generated new deterministic encryption key for user');
    }

    this.encryptionKey = key;
    return key;
  }

  /**
   * Generate a deterministic key from userId (always the same for the same user)
   */
  private static generateDeterministicKey(userId: string): string {
    // Use a hash-like approach with the userId as seed
    let hash = 5381; // DJB2 hash initial value
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) + hash) + userId.charCodeAt(i); // hash * 33 + c
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    
    // Generate 64 characters using the hash as seed
    for (let i = 0; i < 64; i++) {
      // Linear Congruential Generator for pseudo-random but deterministic sequence
      hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
      key += chars[hash % chars.length];
    }
    
    return key;
  }

  static async encrypt(data: any, userId: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey(userId);
      const jsonString = JSON.stringify(data);
      
      const encoder = new TextEncoder();
      const jsonBytes = encoder.encode(jsonString);
      
      const encrypted = new Uint8Array(jsonBytes.length);
      for (let i = 0; i < jsonBytes.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        encrypted[i] = jsonBytes[i] ^ keyChar;
      }
      
      return Buffer.from(encrypted).toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt journal data');
    }
  }

  static async decrypt(encryptedData: string, userId: string): Promise<any> {
    try {
      const key = await this.getEncryptionKey(userId);
      
      const encrypted = Buffer.from(encryptedData, 'base64');
      
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        decrypted[i] = encrypted[i] ^ keyChar;
      }
      
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decrypted);
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt journal data');
    }
  }

  static clearKey(): void {
    this.encryptionKey = null;
  }
}