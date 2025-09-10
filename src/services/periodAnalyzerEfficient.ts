// src/services/efficientPeriodAnalyzer.ts
import { EdgeApi } from './apiClient';
import { supabase } from './supabase';
import { Entry } from '@/types/journal';
import { entriesService } from './entries';

export interface DaySummary {
  id: string;
  date: string; // YYYY-MM-DD
  entry_count: number;
  title: string;
  summary?: string;
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
  average_mood?: number;
  needs_regeneration: boolean;
  generated_at: string;
  updated_at: string;
}

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

export class EfficientPeriodAnalyzer {
  
  /**
   * Get day title efficiently - checks cache first, generates only if needed
   * This is the main function called from Timeline
   */
  static async getDayTitle(date: string, dayEntries: Entry[]): Promise<string> {
    // Single entries always use their own title - no AI needed
    if (dayEntries.length === 1) {
      return dayEntries[0].title || 'Daily Entry';
    }

    // Check if we have a cached summary
    const cached = await this.getCachedDaySummary(date);
    if (cached && !cached.needs_regeneration) {
      return cached.title;
    }

    // Need to generate - but only if explicitly requested or triggered
    // For Timeline, show a fallback title and generate in background
    this.generateDaySummaryInBackground(date, dayEntries);
    
    // Return immediate fallback while AI processes
    return this.generateFallbackTitle(dayEntries);
  }

  /**
   * Explicitly request day analysis (when user taps on day or adds 2nd+ entry)
   */
  static async analyzeDayEntries(date: string, dayEntries: Entry[]): Promise<DaySummary> {
    // Check cache first
    const cached = await this.getCachedDaySummary(date);
    if (cached && !cached.needs_regeneration) {
      return cached;
    }

    // Generate new analysis
    return this.generateAndCacheDaySummary(date, dayEntries);
  }

  /**
   * Week/Month analysis - only called when user explicitly requests insights
   */
  static async analyzeWeekEntries(startDate: string, endDate: string): Promise<PeriodAnalysis> {
    const entries = await this.getEntriesInDateRange(startDate, endDate);
    return this.runAIAnalysis(entries, 'week', startDate, endDate);
  }

  static async analyzeMonthEntries(startDate: string, endDate: string): Promise<PeriodAnalysis> {
    const entries = await this.getEntriesInDateRange(startDate, endDate);
    return this.runAIAnalysis(entries, 'month', startDate, endDate);
  }

  /**
   * Called from JournalContext when entries are created/updated
   * Only triggers AI if there are multiple entries for the day
   */
  static async handleEntryChange(entryDate: string): Promise<void> {
    try {
      // Use entriesService to get properly formatted entries for the day
      const groupedEntries = await entriesService.groupEntriesByDay();
      const dayEntries = groupedEntries[entryDate] || [];
      
      if (dayEntries.length <= 1) {
        // Single or no entries - remove any cached summary
        await this.deleteCachedDaySummary(entryDate);
        return;
      }
  
      // Multiple entries - mark for regeneration
      await this.markDayForRegeneration(entryDate);
      
      console.log(`Marked ${entryDate} for regeneration (${dayEntries.length} entries)`);
      
    } catch (error) {
      console.error('Error handling entry change:', error);
    }
  }
  /**
   * Background generation - non-blocking
   */
  private static async generateDaySummaryInBackground(date: string, dayEntries: Entry[]): Promise<void> {
    try {
      await this.generateAndCacheDaySummary(date, dayEntries);
      console.log(`Background analysis completed for ${date}`);
    } catch (error) {
      console.error(`Background analysis failed for ${date}:`, error);
    }
  }

  /**
   * Core AI generation with caching
   */
  private static async generateAndCacheDaySummary(date: string, dayEntries: Entry[]): Promise<DaySummary> {
    const analysis = await this.runAIAnalysis(dayEntries, 'day', date, date);
    
    const summary: Omit<DaySummary, 'id' | 'generated_at' | 'updated_at'> = {
      date,
      entry_count: dayEntries.length,
      title: analysis.title,
      summary: analysis.summary,
      emotions: analysis.emotions,
      themes: analysis.themes,
      people: analysis.people,
      places: analysis.places,
      activities: analysis.activities,
      mood_trend: analysis.mood_trend,
      insights: analysis.insights,
      highlights: analysis.highlights,
      challenges: analysis.challenges,
      overall_sentiment: analysis.overall_sentiment,
      average_mood: analysis.average_mood,
      needs_regeneration: false,
    };

    // Upsert to database
    const { data, error } = await supabase
      .from('day_summaries')
      .upsert(summary, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) {
      console.error('Failed to cache day summary:', error);
      throw error;
    }

    return data;
  }

  /**
   * Database operations
   */
  private static async getCachedDaySummary(date: string): Promise<DaySummary | null> {
    const { data, error } = await supabase
      .from('day_summaries')
      .select('*')
      .eq('date', date)
      .single();

    if (error || !data) return null;
    return data;
  }

  private static async markDayForRegeneration(date: string): Promise<void> {
    await supabase
      .from('day_summaries')
      .upsert({ 
        date, 
        needs_regeneration: true,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,date',
        ignoreDuplicates: false 
      });
  }

  private static async deleteCachedDaySummary(date: string): Promise<void> {
    await supabase
      .from('day_summaries')
      .delete()
      .eq('date', date);
  }

  /**
   * Utility functions
   */
  private static generateFallbackTitle(dayEntries: Entry[]): string {
    const moods = dayEntries.filter(e => e.mood).map(e => e.mood!);
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 3;
    
    if (avgMood >= 4) return `Great Day - ${dayEntries.length} moments`;
    if (avgMood >= 3) return `Good Day - ${dayEntries.length} entries`;
    if (avgMood >= 2) return `Mixed Day - ${dayEntries.length} thoughts`;
    return `Challenging Day - ${dayEntries.length} reflections`;
  }

  private static async getEntriesInDateRange(startDate: string, endDate: string): Promise<Entry[]> {
    // Use the entriesService which properly handles encrypted_blob decryption
    return entriesService.listByDateRange(
      new Date(startDate + 'T00:00:00.000Z'),
      new Date(endDate + 'T23:59:59.999Z')
    );
  }

  private static async runAIAnalysis(
    entries: Entry[], 
    periodType: 'day' | 'week' | 'month' | 'custom',
    startDate: string, 
    endDate: string
  ): Promise<PeriodAnalysis> {
    
    console.log(`🔍 AI Analysis Debug - ${periodType} from ${startDate} to ${endDate}:`);
    console.log(`📊 Found ${entries.length} entries`);
    
    const analysisEntries = entries.map(entry => ({
      content: entry.body || '',
      mood: entry.mood,
      title: entry.title,
      createdAt: entry.createdAt,
      location: this.extractLocationString(entry),
      tags: entry.tags?.map(tag => tag.name) || []
    }));
  
    // Debug: Log what we're actually sending to AI
    console.log('📝 Sample entry data being sent to AI:');
    analysisEntries.slice(0, 2).forEach((entry, i) => {
      console.log(`Entry ${i + 1}:`, {
        title: entry.title,
        contentLength: entry.content?.length || 0,
        contentPreview: entry.content?.substring(0, 100) + '...',
        mood: entry.mood,
        tags: entry.tags
      });
    });
  
    // Check if we have meaningful content
    const hasContent = analysisEntries.some(entry => 
      (entry.content && entry.content.trim().length > 10) || 
      (entry.title && entry.title.trim().length > 3)
    );
    
    if (!hasContent) {
      console.warn('⚠️ No meaningful content found in entries - AI will generate generic response');
    }
  
    try {
      const result = await EdgeApi.analyzePeriod({
        entries: analysisEntries,
        periodType,
        startDate,
        endDate
      });
  
      console.log('✅ AI Analysis completed:', {
        title: result.title,
        entryCount: result.entry_count,
        sentiment: result.overall_sentiment
      });
  
      return result;
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      throw error;
    }
  }

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
   * Batch process days that need regeneration (maintenance function)
   */
  static async processOutdatedSummaries(limit: number = 5): Promise<void> {
    const { data: outdated } = await supabase
      .from('day_summaries')
      .select('date')
      .eq('needs_regeneration', true)
      .limit(limit);

    if (!outdated?.length) return;

    for (const { date } of outdated) {
      try {
        const groupedEntries = await entriesService.groupEntriesByDay();
        const dayEntries = groupedEntries[date] || [];
        
        if (dayEntries.length > 1) {
          await this.generateAndCacheDaySummary(date, dayEntries);
        } else {
          await this.deleteCachedDaySummary(date);
        }
      } catch (error) {
        console.error(`Failed to process outdated summary for ${date}:`, error);
      }
    }
  }
}

export default EfficientPeriodAnalyzer;