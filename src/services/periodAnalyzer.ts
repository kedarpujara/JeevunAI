// src/services/periodAnalyzer.ts
import { EdgeApi } from './apiClient';
import { Entry } from '@/types/journal';
import { entriesService } from './entries';

export interface PeriodAnalysis {
  title: string;
  summary: string;
  emotions: string[];
  themes: string[];
  people: string[];
  places: string[];
  activities: string[];
  mood_trend: 'improving' | 'declining' | 'stable' | 'mixed';
  insights: string[];
  highlights: string[];
  challenges: string[];
  overall_sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  entry_count: number;
  period_type: 'day' | 'week' | 'month' | 'custom';
  start_date: string;
  end_date: string;
  average_mood: number | null;
}

export class PeriodAnalyzer {
  
  /**
   * Generate AI-powered title and analysis for a specific day
   * This replaces the basic generateDayTitle function
   */
  static async analyzeDayEntries(date: string, entries: Entry[]): Promise<PeriodAnalysis> {
    if (entries.length === 0) {
      throw new Error('No entries provided for day analysis');
    }

    // If single entry, use its existing title but still run analysis for other insights
    if (entries.length === 1) {
      const singleEntry = entries[0];
      return this.analyzeEntries(entries, 'day', date, date);
    }

    // Multiple entries - run full AI analysis
    return this.analyzeEntries(entries, 'day', date, date);
  }

  /**
   * Analyze entries for a week period
   */
  static async analyzeWeekEntries(startDate: string, endDate: string): Promise<PeriodAnalysis> {
    const entries = await this.getEntriesInDateRange(startDate, endDate);
    return this.analyzeEntries(entries, 'week', startDate, endDate);
  }

  /**
   * Analyze entries for a month period
   */
  static async analyzeMonthEntries(startDate: string, endDate: string): Promise<PeriodAnalysis> {
    const entries = await this.getEntriesInDateRange(startDate, endDate);
    return this.analyzeEntries(entries, 'month', startDate, endDate);
  }

  /**
   * Analyze entries for a custom date range
   */
  static async analyzeCustomPeriod(startDate: string, endDate: string): Promise<PeriodAnalysis> {
    const entries = await this.getEntriesInDateRange(startDate, endDate);
    return this.analyzeEntries(entries, 'custom', startDate, endDate);
  }

  /**
   * Core analysis function that calls the AI service
   */
  private static async analyzeEntries(
    entries: Entry[], 
    periodType: 'day' | 'week' | 'month' | 'custom',
    startDate: string, 
    endDate: string
  ): Promise<PeriodAnalysis> {
    
    try {
      // Prepare entries for AI analysis
      const analysisEntries = entries.map(entry => ({
        content: entry.body || '',
        mood: entry.mood,
        title: entry.title,
        createdAt: entry.createdAt,
        location: this.extractLocationString(entry),
        tags: entry.tags?.map(tag => tag.name) || []
      }));

      const result = await EdgeApi.analyzePeriod({
        entries: analysisEntries,
        periodType,
        startDate,
        endDate
      });

      return result;
    } catch (error) {
      console.error('Period analysis failed:', error);
      
      // Fallback to basic analysis if AI fails
      return this.createFallbackAnalysis(entries, periodType, startDate, endDate);
    }
  }

  /**
   * Get all entries within a date range
   */
  private static async getEntriesInDateRange(startDate: string, endDate: string): Promise<Entry[]> {
    try {
      // This would typically query your database
      // For now, we'll get all entries and filter
      const allGroupedEntries = await entriesService.groupEntriesByDay();
      const entries: Entry[] = [];
      
      const start = new Date(startDate + 'T00:00:00.000');
      const end = new Date(endDate + 'T23:59:59.999');
      
      Object.entries(allGroupedEntries).forEach(([date, dayEntries]) => {
        const entryDate = new Date(date + 'T00:00:00.000');
        if (entryDate >= start && entryDate <= end) {
          entries.push(...dayEntries);
        }
      });
      
      return entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      console.error('Error fetching entries in date range:', error);
      return [];
    }
  }

  /**
   * Extract a meaningful location string from entry
   */
  private static extractLocationString(entry: Entry): string | undefined {
    if (!entry.locationData) return undefined;
    
    const loc = entry.locationData;
    return (
      loc.place?.name ||
      loc.address?.formattedAddress ||
      (loc.address?.city && loc.address?.region 
        ? `${loc.address.city}, ${loc.address.region}` 
        : undefined)
    );
  }

  /**
   * Create fallback analysis when AI service is unavailable
   */
  private static createFallbackAnalysis(
    entries: Entry[], 
    periodType: 'day' | 'week' | 'month' | 'custom',
    startDate: string, 
    endDate: string
  ): PeriodAnalysis {
    
    const entryCount = entries.length;
    const moods = entries.filter(e => e.mood).map(e => e.mood!);
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
    
    // Basic title generation
    let title = '';
    if (periodType === 'day') {
      if (entryCount === 1) {
        title = entries[0].title || 'Daily Entry';
      } else if (avgMood && avgMood >= 4) {
        title = `Great Day - ${entryCount} moments`;
      } else if (avgMood && avgMood >= 3) {
        title = `Good Day - ${entryCount} entries`;
      } else if (avgMood && avgMood >= 2) {
        title = `Mixed Day - ${entryCount} thoughts`;
      } else {
        title = `Challenging Day - ${entryCount} reflections`;
      }
    } else {
      title = `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} Summary`;
    }

    // Extract basic themes from content
    const allContent = entries.map(e => e.body || '').join(' ').toLowerCase();
    const themes: string[] = [];
    
    if (allContent.includes('work') || allContent.includes('job')) themes.push('work');
    if (allContent.includes('family')) themes.push('family');
    if (allContent.includes('friend')) themes.push('friends');
    if (allContent.includes('health') || allContent.includes('exercise')) themes.push('health');
    if (allContent.includes('travel') || allContent.includes('trip')) themes.push('travel');

    return {
      title,
      summary: entryCount === 1 
        ? entries[0].body?.substring(0, 150) + '...' || 'A day of reflection.'
        : `A ${periodType} with ${entryCount} journal entries covering various aspects of life.`,
      emotions: [],
      themes,
      people: [],
      places: [],
      activities: [],
      mood_trend: 'stable',
      insights: [],
      highlights: [],
      challenges: [],
      overall_sentiment: avgMood ? (avgMood >= 4 ? 'positive' : avgMood >= 3 ? 'neutral' : 'negative') : 'neutral',
      entry_count: entryCount,
      period_type: periodType,
      start_date: startDate,
      end_date: endDate,
      average_mood: avgMood
    };
  }

  /**
   * Trigger day analysis when a new entry is added to an existing day
   * This should be called from the CreateScreen when saving an entry
   */
  static async triggerDayAnalysisUpdate(date: string): Promise<void> {
    try {
      const groupedEntries = await entriesService.groupEntriesByDay();
      const dayEntries = groupedEntries[date];
      
      if (dayEntries && dayEntries.length > 1) {
        // Multiple entries for this day - run analysis and potentially update day title
        const analysis = await this.analyzeDayEntries(date, dayEntries);
        
        // You might want to store this analysis in your database
        // or update the entries with the new collective title
        console.log(`Day analysis for ${date}:`, analysis.title);
        
        // TODO: Implement storage of day-level metadata if needed
        // This could involve creating a separate "day_summaries" table
        // or adding metadata to entries to mark them as part of an analyzed day
      }
    } catch (error) {
      console.error('Failed to trigger day analysis update:', error);
    }
  }
}

export default PeriodAnalyzer;