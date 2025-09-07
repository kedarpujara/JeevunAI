import { Entry } from '../../types/journal';

export interface StorageService {
  // Core CRUD
  listEntries(): Promise<Entry[]>;
  getEntry(id: string): Promise<Entry | null>;
  addEntry(entry: Entry): Promise<void>;
  updateEntry(entry: Entry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  
  // Query methods
  listByDateRange(startDate: string, endDate: string): Promise<Entry[]>;
  searchEntries(query: string): Promise<Entry[]>;
  
  // Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}