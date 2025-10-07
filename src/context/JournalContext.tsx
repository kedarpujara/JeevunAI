// src/context/JournalContext.tsx
import { entriesService } from '@/services/entries';
import { supabase } from '@/services/supabase';
import PeriodAnalyzer from '@/services/periodAnalyzer';
import { Entry } from '@/types/journal';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface JournalContextType {
  entries: Entry[];
  isLoading: boolean;
  refreshEntries: () => Promise<void>;
  createEntry: (data: Partial<Entry>) => Promise<Entry>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getDayTitle: (date: string, dayEntries: Entry[]) => Promise<string>;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const refreshEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setEntries([]);
        return;
      }
      const loaded = await entriesService.listEntries();
      console.log('📚 Loaded entries count:', loaded.length); // Add this
      setEntries(loaded);
    } catch (err) {
      console.error('Failed to refresh entries:', err);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEntry = useCallback(async (data: Partial<Entry>) => {
    const entry = await entriesService.createEntry(data);
    await refreshEntries();
    
    if (entry.date) {
      PeriodAnalyzer.handleEntryChange(entry.date).catch(error => {
        console.log('Background analysis trigger failed (non-critical):', error);
      });
    }
    
    return entry;
  }, [refreshEntries]);

  const updateEntry = useCallback(async (id: string, updates: Partial<Entry>) => {
    const oldEntry = entries.find(e => e.id === id);
    await entriesService.updateEntry(id, updates);
    await refreshEntries();
    
    if (oldEntry?.date) {
      PeriodAnalyzer.handleEntryChange(oldEntry.date).catch(error => {
        console.log('Background analysis trigger failed (non-critical):', error);
      });
    }
    
    if (updates.date && updates.date !== oldEntry?.date) {
      PeriodAnalyzer.handleEntryChange(updates.date).catch(error => {
        console.log('Background analysis trigger failed (non-critical):', error);
      });
    }
  }, [refreshEntries, entries]);

  const deleteEntry = useCallback(async (id: string) => {
    const oldEntry = entries.find(e => e.id === id);
    await entriesService.deleteEntry(id);
    await refreshEntries();
    
    if (oldEntry?.date) {
      PeriodAnalyzer.handleEntryChange(oldEntry.date).catch(error => {
        console.log('Background analysis trigger failed (non-critical):', error);
      });
    }
  }, [refreshEntries, entries]);

  const getDayTitle = useCallback(async (date: string, dayEntries: Entry[]): Promise<string> => {
    return PeriodAnalyzer.getDayTitle(date, dayEntries);
  }, []);

  useEffect(() => {
    // Only do initial load once
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      refreshEntries();
    }
    
    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Skip the initial INITIAL_SESSION event
      if (event === 'INITIAL_SESSION') return;
      
      // Only refresh on actual auth changes
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        refreshEntries();
      }
    });
    
    return () => { 
      sub.subscription.unsubscribe(); 
    };
  }, [refreshEntries]);

  useEffect(() => {
    const cleanupOutdatedSummaries = () => {
      PeriodAnalyzer.processOutdatedSummaries(3).catch(error => {
        console.log('Background cleanup failed (non-critical):', error);
      });
    };

    const timer = setTimeout(cleanupOutdatedSummaries, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <JournalContext.Provider value={{ 
      entries, 
      isLoading, 
      refreshEntries, 
      createEntry, 
      updateEntry, 
      deleteEntry,
      getDayTitle 
    }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}