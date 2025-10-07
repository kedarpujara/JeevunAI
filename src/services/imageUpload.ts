
// services/imageUpload.ts
import { supabase } from './supabase';
import { readAsStringAsync } from 'expo-file-system/legacy'; // Use legacy for now
import { decode } from 'base64-arraybuffer';

export class ImageUploadService {
  private static readonly BUCKET_NAME = 'journal-photos';

  static async uploadImage(
    localUri: string, 
    userId: string, 
    entryId: string
  ): Promise<string> {
    try {
      // Read as base64 using legacy API (works but deprecated)
      const base64 = await readAsStringAsync(localUri, {
        encoding: 'base64',
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

  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts.slice(-3).join('/');

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Image deletion failed:', error);
    }
  }

  static async deleteImages(imageUrls: string[]): Promise<void> {
    const deletePromises = imageUrls.map(url => this.deleteImage(url));
    await Promise.allSettled(deletePromises);
  }
}

export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || 
         uri.startsWith('content://') || 
         uri.startsWith('ph://');
}

export function isSupabaseUri(uri: string): boolean {
  return uri.includes('supabase') || uri.startsWith('http');
}
// // services/imageUpload.ts
// import { supabase } from './supabase';

// export class ImageUploadService {
//   private static readonly BUCKET_NAME = 'journal-photos';

//   static async uploadImage(localUri: string, userId: string, entryId: string): Promise<string> {
//     const res = await fetch(localUri);
//     if (!res.ok) {
//       throw new Error(`Failed to read image at URI: ${localUri} (status ${res.status})`);
//     }
//     const arrayBuffer = await res.arrayBuffer();

//     const headerCt = res.headers.get('content-type') || '';
//     const contentType =
//       headerCt ||
//       (localUri.endsWith('.png')
//         ? 'image/png'
//         : localUri.endsWith('.webp')
//         ? 'image/webp'
//         : localUri.endsWith('.heic') || localUri.endsWith('.heif')
//         ? 'image/heic'
//         : 'image/jpeg');

//     const ext =
//       contentType.includes('png')
//         ? 'png'
//         : contentType.includes('webp')
//         ? 'webp'
//         : contentType.includes('heic') || contentType.includes('heif')
//         ? 'heic'
//         : 'jpg';

//     const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
//     const path = `${userId}/${entryId}/${fileName}`;

//     const { error } = await supabase.storage
//       .from(this.BUCKET_NAME)
//       .upload(path, arrayBuffer, { contentType, upsert: false });
//     if (error) {
//       console.error('Supabase upload error:', error);
//       throw error;
//     }

//     const { data: pub } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(path);
//     return pub.publicUrl;
//   }

//   static async deleteImage(imageUrl: string): Promise<void> {
//     try {
//       const url = new URL(imageUrl);
//       const parts = url.pathname.split('/');
//       const bucketIndex = parts.findIndex((p) => p === 'public') + 1;
//       const bucket = parts[bucketIndex];
//       const objectPath = parts.slice(bucketIndex + 1).join('/');
//       if (bucket !== this.BUCKET_NAME || !objectPath) return;
//       const { error } = await supabase.storage.from(bucket).remove([objectPath]);
//       if (error) console.error('Supabase delete error:', error);
//     } catch (e) {
//       console.error('Image deletion failed:', e);
//     }
//   }

//   static async deleteImages(imageUrls: string[]): Promise<void> {
//     await Promise.allSettled(imageUrls.map((u) => this.deleteImage(u)));
//   }
// }
// export function isLocalUri(uri: string): boolean {
//   return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');
// }
// export function isSupabaseUri(uri: string): boolean {
//   return uri.startsWith('http');
// }