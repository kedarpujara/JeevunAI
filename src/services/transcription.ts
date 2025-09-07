// src/services/transcription.ts
import { EdgeApi } from "./apiClient";

export async function transcribeAudio(audioUri: string): Promise<string> {
  console.log('[transcribeAudio] uri:', audioUri);

  try {
    const { text } = await EdgeApi.transcribe({
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    });
    return text || '';
  } catch (e: any) {
    console.error('Transcription error:', e);
    throw e;
  }
}