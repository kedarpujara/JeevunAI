export type Mood = 1 | 2 | 3 | 4 | 5;

export interface Tag {
    id: string;
    name: string; // lowercase, no '#'
}

export interface LocationData {
    coordinates: { latitude: number; longitude: number; };
    address: {
        formattedAddress: string;
        street?: string;
        city?: string;
        region?: string;
        country?: string;
        postalCode?: string;
    };
    place?: {
        name?: string;        // "Olive Garden"
        category?: string;    // "Restaurant"  
        placeId?: string;     // Google Places ID
    };
    accuracy?: number;      // GPS accuracy
    timestamp?: string;     // When captured    
}

export interface Entry {
    id: string;
    createdAt: string; // ISO
    updatedAt: string; // ISO
    date: string;      // "YYYY-MM-DD" (for grouping)
    title?: string;
    body?: string;
    mood?: Mood;
    tags: Tag[];
    // Media placeholders for future:
    photoUris?: string[];
    hasPhotos?: boolean;
    audioUri?: string;
    transcription?: string;
    locationData?: LocationData;
    deleted?: boolean; // soft delete
}

export type ViewMode = 'day' | 'week' | 'month';

export interface GroupedEntries {
    [date: string]: Entry[];
}