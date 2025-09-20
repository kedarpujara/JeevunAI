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
    const { currentStreak, longestStreak } = calculateStreaks(Array.from(uniqueDays));

    setStats({
      totalEntries: entries.length,
      totalDays,
      currentStreak,
      longestStreak,
    });
  };

  const calculateStreaks = (dates: string[]): { currentStreak: number; longestStreak: number } => {
    if (dates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Sort dates in descending order (most recent first)
    const sortedDates = dates.sort((a, b) => b.localeCompare(a));
    
    // ===== CURRENT STREAK CALCULATION =====
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    let currentStreak = 0;

    if (sortedDates.includes(todayString)) {
      currentStreak += 1;
    }

      // Work backwards from day before yesterday
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1);
    console.log("starting date", checkDate);
    
    while (true) {
      const checkDateString = checkDate.toISOString().split('T')[0];
      
      if (sortedDates.includes(checkDateString)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break; // Gap found, streak ends
      }      
    }
  
    
    // ===== LONGEST STREAK CALCULATION =====
    let longestStreak = 1; // At least one day if we have any dates
    let currentLongestStreak = 1;
    
    // If only one date, longest streak is 1
    if (sortedDates.length === 1) {
      return { currentStreak, longestStreak: 1 };
    }
    
    // Check all consecutive date sequences
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const currentDate = new Date(sortedDates[i]);
      const nextDate = new Date(sortedDates[i + 1]);
      
      // Calculate difference in milliseconds, then convert to days
      const timeDiff = currentDate.getTime() - nextDate.getTime();
      const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive days - extend current streak
        currentLongestStreak++;
      } else {
        // Gap found - save current streak if it's the longest, then reset
        longestStreak = Math.max(longestStreak, currentLongestStreak);
        currentLongestStreak = 1;
      }
    }
    
    // Don't forget to check the final streak after the loop
    longestStreak = Math.max(longestStreak, currentLongestStreak);

    return { currentStreak, longestStreak };
  };

  return stats;
};