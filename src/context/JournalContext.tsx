import { entriesService } from '@/services/entries';
import { supabase } from '@/services/supabase';
import { Entry } from '@/types/journal';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface JournalContextType {
  entries: Entry[];
  isLoading: boolean;
  refreshEntries: () => Promise<void>;
  createEntry: (data: Partial<Entry>) => Promise<Entry>;
  updateEntry: (id: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
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
    const e = await entriesService.createEntry(data);
    await refreshEntries();
    return e;
  }, [refreshEntries]);

  const updateEntry = useCallback(async (id: string, updates: Partial<Entry>) => {
    await entriesService.updateEntry(id, updates);
    await refreshEntries();
  }, [refreshEntries]);

  const deleteEntry = useCallback(async (id: string) => {
    await entriesService.deleteEntry(id);
    await refreshEntries();
  }, [refreshEntries]);

  useEffect(() => { refreshEntries(); }, [refreshEntries]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshEntries();
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [refreshEntries]);

  return (
    <JournalContext.Provider value={{ entries, isLoading, refreshEntries, createEntry, updateEntry, deleteEntry }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}