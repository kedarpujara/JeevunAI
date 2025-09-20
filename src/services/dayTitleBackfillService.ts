// src/services/dayTitleBackfillService.ts
import { supabase } from './supabase';
import { entriesService } from './entries';
import PeriodAnalyzer from './periodAnalyzer';

export interface BackfillProgress {
  total: number;
  processed: number;
  current: string | null;
  errors: number;
  completed: boolean;
}

export class DayTitleBackfillService {
  private static isRunning = false;
  private static currentProgress: BackfillProgress = {
    total: 0,
    processed: 0,
    current: null,
    errors: 0,
    completed: false,
  };

  /**
   * Main backfill function - generates AI titles for all days with multiple entries
   */
  static async backfillAllDayTitles(
    onProgress?: (progress: BackfillProgress) => void,
    batchSize: number = 5
  ): Promise<BackfillProgress> {
    if (this.isRunning) {
      throw new Error('Backfill is already running');
    }

    this.isRunning = true;
    console.log('🚀 Starting day title backfill...');

    try {
      // Get all days that need backfilling
      const daysToBackfill = await this.getDaysNeedingBackfill();
      
      this.currentProgress = {
        total: daysToBackfill.length,
        processed: 0,
        current: null,
        errors: 0,
        completed: false,
      };

      console.log(`📊 Found ${daysToBackfill.length} days needing AI titles`);
      onProgress?.(this.currentProgress);

      if (daysToBackfill.length === 0) {
        this.currentProgress.completed = true;
        onProgress?.(this.currentProgress);
        return this.currentProgress;
      }

      // Process in batches to avoid overwhelming the AI service
      for (let i = 0; i < daysToBackfill.length; i += batchSize) {
        const batch = daysToBackfill.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (date) => {
            try {
              this.currentProgress.current = date;
              onProgress?.(this.currentProgress);

              await this.backfillSingleDay(date);
              
              this.currentProgress.processed++;
              console.log(`✅ Backfilled ${date} (${this.currentProgress.processed}/${this.currentProgress.total})`);
              
            } catch (error) {
              this.currentProgress.errors++;
              console.error(`❌ Failed to backfill ${date}:`, error);
            }
            
            onProgress?.(this.currentProgress);
          })
        );

        // Small delay between batches to be nice to the AI service
        if (i + batchSize < daysToBackfill.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.currentProgress.completed = true;
      this.currentProgress.current = null;
      
      console.log(`🎉 Backfill completed! Processed: ${this.currentProgress.processed}, Errors: ${this.currentProgress.errors}`);
      onProgress?.(this.currentProgress);

      return this.currentProgress;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get the current backfill progress
   */
  static getProgress(): BackfillProgress {
    return { ...this.currentProgress };
  }

  /**
   * Check if backfill is currently running
   */
  static isBackfillRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Find all days that have multiple entries but no AI-generated title
   */
  private static async getDaysNeedingBackfill(): Promise<string[]> {
    try {
      // Get all entries grouped by day
      const groupedEntries = await entriesService.groupEntriesByDay();
      
      // Filter to days with multiple entries
      const multipleDays = Object.entries(groupedEntries)
        .filter(([date, entries]) => entries.length > 1)
        .map(([date]) => date);

      if (multipleDays.length === 0) {
        return [];
      }

      // Check which days already have AI-generated summaries
      const { data: existingSummaries } = await supabase
        .from('day_summaries')
        .select('date')
        .in('date', multipleDays);

      const existingDates = new Set(existingSummaries?.map(s => s.date) || []);
      
      // Return days that need backfilling
      const needsBackfill = multipleDays.filter(date => !existingDates.has(date));
      
      console.log(`📈 Backfill analysis:
        - Days with multiple entries: ${multipleDays.length}
        - Already have AI titles: ${existingDates.size}
        - Need backfilling: ${needsBackfill.length}`);

      return needsBackfill.sort(); // Chronological order

    } catch (error) {
      console.error('Failed to analyze days needing backfill:', error);
      return [];
    }
  }

  /**
   * Backfill a single day's entries
   */
  private static async backfillSingleDay(date: string): Promise<void> {
    try {
      // Get entries for this day
      const groupedEntries = await entriesService.groupEntriesByDay();
      const dayEntries = groupedEntries[date];

      if (!dayEntries || dayEntries.length <= 1) {
        console.log(`⏭️ Skipping ${date} - not enough entries`);
        return;
      }

      // Use the efficient analyzer to generate and cache the summary
      await PeriodAnalyzer.analyzeDayEntries(date, dayEntries);
      
      console.log(`🤖 Generated AI title for ${date} (${dayEntries.length} entries)`);

    } catch (error) {
      console.error(`Failed to backfill day ${date}:`, error);
      throw error;
    }
  }

  /**
   * Quick check to see how many days would benefit from backfill
   */
  static async getBackfillStats(): Promise<{
    totalDaysWithMultipleEntries: number;
    daysWithAITitles: number;
    daysNeedingBackfill: number;
  }> {
    try {
      const groupedEntries = await entriesService.groupEntriesByDay();
      const multipleDays = Object.entries(groupedEntries)
        .filter(([date, entries]) => entries.length > 1)
        .map(([date]) => date);

      const totalDaysWithMultipleEntries = multipleDays.length;

      if (totalDaysWithMultipleEntries === 0) {
        return {
          totalDaysWithMultipleEntries: 0,
          daysWithAITitles: 0,
          daysNeedingBackfill: 0,
        };
      }

      const { data: existingSummaries } = await supabase
        .from('day_summaries')
        .select('date')
        .in('date', multipleDays);

      const daysWithAITitles = existingSummaries?.length || 0;
      const daysNeedingBackfill = totalDaysWithMultipleEntries - daysWithAITitles;

      return {
        totalDaysWithMultipleEntries,
        daysWithAITitles,
        daysNeedingBackfill,
      };

    } catch (error) {
      console.error('Failed to get backfill stats:', error);
      return {
        totalDaysWithMultipleEntries: 0,
        daysWithAITitles: 0,
        daysNeedingBackfill: 0,
      };
    }
  }

  /**
   * Force regeneration of all day titles (even existing ones)
   */
  static async forceRegenerateAll(
    onProgress?: (progress: BackfillProgress) => void
  ): Promise<BackfillProgress> {
    if (this.isRunning) {
      throw new Error('Backfill is already running');
    }

    console.log('🔄 Force regenerating ALL day titles...');

    try {
      // Mark all existing summaries for regeneration
      await supabase
        .from('day_summaries')
        .update({ needs_regeneration: true });

      // Then run normal backfill which will regenerate marked days
      return await this.backfillAllDayTitles(onProgress);

    } catch (error) {
      console.error('Failed to force regenerate:', error);
      throw error;
    }
  }
}

export default DayTitleBackfillService;