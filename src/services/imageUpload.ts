// services/imageUpload.ts
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export class ImageUploadService {
  private static readonly BUCKET_NAME = 'journal-photos';

  /**
   * Upload a single image to Supabase Storage
   * @param localUri - Local file URI from ImagePicker
   * @param userId - Current user ID
   * @param entryId - Entry ID for organizing files
   * @returns Public URL of uploaded image
   */
  static async uploadImage(
    localUri: string, 
    userId: string, 
    entryId: string
  ): Promise<string> {
    try {
      // Read the file as base64
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Generate unique filename
      const fileExt = localUri.split('.').pop() || 'jpg';
      const timestamp = new Date().getTime();
      const fileName = `${userId}/${entryId}/${timestamp}.${fileExt}`;

      // Convert base64 to ArrayBuffer
      const arrayBuffer = decode(base64);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrl;

    } catch (error) {
      console.error('Image upload failed:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Upload multiple images and return their URLs
   */
  static async uploadImages(
    localUris: string[], 
    userId: string, 
    entryId: string
  ): Promise<string[]> {
    const uploadPromises = localUris.map(uri => 
      this.uploadImage(uri, userId, entryId)
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Multiple image upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete image from Supabase Storage
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts.slice(-3).join('/'); // userId/entryId/filename.jpg

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Image deletion failed:', error);
      // Don't throw - deletion failure shouldn't break the app
    }
  }

  /**
   * Delete multiple images
   */
  static async deleteImages(imageUrls: string[]): Promise<void> {
    const deletePromises = imageUrls.map(url => this.deleteImage(url));
    await Promise.allSettled(deletePromises);
  }
}

// Helper function to check if URI is local vs remote
export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || 
         uri.startsWith('content://') || 
         uri.startsWith('ph://');
}

// Helper function to check if URI is already uploaded
export function isSupabaseUri(uri: string): boolean {
  return uri.includes('supabase') || uri.startsWith('http');
}