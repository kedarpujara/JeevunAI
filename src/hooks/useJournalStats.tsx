import { useJournal } from '@/context/JournalContext';
import { useEffect, useState } from 'react';

interface JournalStats {
  totalEntries: number;
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
}

export const useJournalStats = () => {
  const { entries } = useJournal();
  const [stats, setStats] = useState<JournalStats>({
    totalEntries: 0,
    totalDays: 0,
    currentStreak: 0,
    longestStreak: 0,
  });

  useEffect(() => {
    calculateStats();
  }, [entries]);

  const calculateStats = () => {
    if (!entries || entries.length === 0) {
      setStats({
        totalEntries: 0,
        totalDays: 0,
        currentStreak: 0,
        longestStreak: 0,
      });
      return;
    }

    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Get unique days
    const uniqueDays = new Set(sortedEntries.map(e => e.date));
    const totalDays = uniqueDays.size;

    // Calculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(Array.from(uniqueDays).sort());

    setStats({
      totalEntries: entries.length,
      totalDays,
      currentStreak,
      longestStreak,
    });
  };

  const calculateStreaks = (dates: string[]): { currentStreak: number; longestStreak: number } => {
    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    // Check if the most recent entry is today or yesterday for current streak
    const mostRecentDate = new Date(dates[dates.length - 1]);
    mostRecentDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If last entry is today or yesterday, we might have a current streak
    const hasCurrentStreak = daysDiff <= 1;

    for (let i = dates.length - 1; i > 0; i--) {
      const currentDate = new Date(dates[i]);
      const prevDate = new Date(dates[i - 1]);
      
      currentDate.setHours(0, 0, 0, 0);
      prevDate.setHours(0, 0, 0, 0);
      
      const diff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        tempStreak++;
      } else {
        if (hasCurrentStreak && i === dates.length - 1) {
          currentStreak = tempStreak;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    // Final check for streaks
    if (hasCurrentStreak && currentStreak === 0) {
      currentStreak = tempStreak;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  };

  return stats;
};