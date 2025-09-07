// src/services/aiAnalyzer.ts
import { EdgeApi } from './apiClient';
import LocationData from './locationService';


export interface AIAnalysisResult {
  title: string;
  tags: string[];
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  themes?: string[];
}

export async function analyzeEntryWithAI(
  content: string,
  mood?: number,
  hasPhotos?: boolean,
  location?: LocationData,
): Promise<AIAnalysisResult> {
  
  try {
    // Extract a meaningful location string from the nested structure
    let locationName: string | undefined;
    if (location?.locationData) {
      const loc = location.locationData;
      locationName = 
        loc.place?.name || // "Olive Garden"
        loc.address?.formattedAddress || // "123 Main St, City, State"
        (loc.address?.city && loc.address?.region ? `${loc.address.city}, ${loc.address.region}` : undefined) ||
        undefined;
    }

    const result = await EdgeApi.analyzeJournal({
      content,
      mood,
      hasPhotos,
      location: locationName // Send the extracted string
    });

    // normalize shape
    return {
      title: result.title || 'Daily Entry',
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 10) : [],
      sentiment: (result.sentiment as any) || 'neutral',
      themes: Array.isArray(result.themes) ? result.themes : [],
    };
  } catch (e) {
    console.error('AI Analysis failed:', e);
    // fallback if function unavailable
    return {
      title: content?.slice(0, 24) || 'Daily Entry',
      tags: ['journal'],
      sentiment: 'neutral',
      themes: [],
    };
  }
}