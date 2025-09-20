// src/context/JournalContext.tsx
import { entriesService } from '@/services/entries';
import { supabase } from '@/services/supabase';
import PeriodAnalyzer from '@/services/periodAnalyzer';
import { Entry } from '@/types/journal';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface JournalContextType {
  entries: Entry[];
  isLoading: boolean;
  refreshEntries: () => Promise<void>;
  createEntry: (data: Partial<Entry>) => Promise<Entry>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  // New: Efficient day title access
  getDayTitle: (date: string, dayEntries: Entry[]) => Promise<string>;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setEntries([]);
        return;
      }
      const loaded = await entriesService.listEntries();
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
    
    // Trigger efficient analysis check
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
    
    // Trigger analysis check for affected date(s)
    if (oldEntry?.date) {
      PeriodAnalyzer.handleEntryChange(oldEntry.date).catch(error => {
        console.log('Background analysis trigger failed (non-critical):', error);
      });
    }
    
    // If date changed, check the new date too
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
    
    // Trigger analysis check for affected date
    if (oldEntry?.date) {
      PeriodAnalyzer.handleEntryChange(oldEntry.date).catch(error => {
        console.log('Background analysis trigger failed (non-critical):', error);
      });
    }
  }, [refreshEntries, entries]);

  // Efficient day title getter
  const getDayTitle = useCallback(async (date: string, dayEntries: Entry[]): Promise<string> => {
    return PeriodAnalyzer.getDayTitle(date, dayEntries);
  }, []);

  useEffect(() => { 
    refreshEntries(); 
  }, [refreshEntries]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshEntries();
    });
    return () => { 
      sub.subscription.unsubscribe(); 
    };
  }, [refreshEntries]);

  // Periodic cleanup of outdated summaries (runs once when context loads)
  useEffect(() => {
    const cleanupOutdatedSummaries = () => {
      PeriodAnalyzer.processOutdatedSummaries(3).catch(error => {
        console.log('Background cleanup failed (non-critical):', error);
      });
    };

    // Run cleanup after initial load
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