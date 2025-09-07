import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry } from '../../types/journal';
import { StorageService } from './index';

const ENTRIES_KEY = '@journal/entries';
const SETTINGS_PREFIX = '@journal/settings/';

export class AsyncStorageService implements StorageService {
  async listEntries(): Promise<Entry[]> {
    try {
      const json = await AsyncStorage.getItem(ENTRIES_KEY);
      if (!json) return [];
      const entries = JSON.parse(json);
      // Filter out soft-deleted entries
      return entries.filter((e: Entry) => !e.deleted);
    } catch (error) {
      console.error('Failed to load entries:', error);
      return [];
    }
  }

  async getEntry(id: string): Promise<Entry | null> {
    const entries = await this.listEntries();
    return entries.find(e => e.id === id) || null;
  }

  async addEntry(entry: Entry): Promise<void> {
    const entries = await this._getAllEntries();
    entries.unshift(entry); // Add to beginning
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  }

  async updateEntry(entry: Entry): Promise<void> {
    const entries = await this._getAllEntries();
    const index = entries.findIndex(e => e.id === entry.id);
    if (index !== -1) {
      entries[index] = entry;
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    }
  }

  async deleteEntry(id: string): Promise<void> {
    const entries = await this._getAllEntries();
    const entry = entries.find(e => e.id === id);
    if (entry) {
      entry.deleted = true;
      entry.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    }
  }

  async listByDateRange(startDate: string, endDate: string): Promise<Entry[]> {
    const entries = await this.listEntries();
    return entries.filter(e => e.date >= startDate && e.date <= endDate);
  }

  async searchEntries(query: string): Promise<Entry[]> {
    const entries = await this.listEntries();
    const lowerQuery = query.toLowerCase();
    return entries.filter(e => 
      e.title?.toLowerCase().includes(lowerQuery) ||
      e.body?.toLowerCase().includes(lowerQuery) ||
      e.tags.some(t => t.name.includes(lowerQuery))
    );
  }

  async getSetting(key: string): Promise<string | null> {
    return AsyncStorage.getItem(SETTINGS_PREFIX + key);
  }

  async setSetting(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(SETTINGS_PREFIX + key, value);
  }

  private async _getAllEntries(): Promise<Entry[]> {
    try {
      const json = await AsyncStorage.getItem(ENTRIES_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const storageService = new AsyncStorageService();