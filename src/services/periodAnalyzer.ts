// src/services/periodAnalyzer.ts - Fixed database constraint error

import { EdgeApi } from './apiClient';
import { supabase } from './supabase';
import { Entry } from '@/types/journal';
import { entriesService } from './entries';

export interface DaySummary {
  id: string;
  user_id: string;
  date: string;
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

export class PeriodAnalyzer {
  
  static async getDayTitle(date: string, dayEntries: Entry[]): Promise<string> {
    console.log(`🔍 getDayTitle called for ${date} with ${dayEntries.length} entries`);
    
    if (dayEntries.length === 1) {
      const title = dayEntries[0].title || 'Daily Entry';
      console.log(`📝 Single entry title: ${title}`);
      return title;
    }

    const cached = await this.getCachedDaySummary(date);
    if (cached && !cached.needs_regeneration) {
      console.log(`💾 Using cached title for ${date}: ${cached.title}`);
      return cached.title;
    }

    console.log(`🚀 No cache found for ${date}, generating in background...`);
    
    this.generateDaySummaryInBackground(date, dayEntries);
    
    const fallback = this.generateFallbackTitle(dayEntries);
    console.log(`⏰ Returning fallback title: ${fallback}`);
    return fallback;
  }

  static async analyzeDayEntries(date: string, dayEntries: Entry[]): Promise<DaySummary> {
    console.log(`🎯 analyzeDayEntries called for ${date} with ${dayEntries.length} entries`);
    
    const cached = await this.getCachedDaySummary(date);
    if (cached && !cached.needs_regeneration) {
      console.log(`💾 Using cached analysis for ${date}`);
      return cached;
    }

    console.log(`🤖 Generating new AI analysis for ${date}...`);
    return this.generateAndCacheDaySummary(date, dayEntries);
  }

  static async analyzeWeekEntries(startDate: string, endDate: string): Promise<PeriodAnalysis> {
    const entries = await this.getEntriesInDateRange(startDate, endDate);
    return this.runAIAnalysis(entries, 'week', startDate, endDate);
  }

  static async analyzeMonthEntries(startDate: string, endDate: string): Promise<PeriodAnalysis> {
    const entries = await this.getEntriesInDateRange(startDate, endDate);
    return this.runAIAnalysis(entries, 'month', startDate, endDate);
  }

  // ✅ Fixed handleEntryChange to prevent database constraint errors
  static async handleEntryChange(entryDate: string): Promise<void> {
    try {
      console.log(`📊 handleEntryChange triggered for ${entryDate}`);
      
      const groupedEntries = await entriesService.groupEntriesByDay();
      const dayEntries = groupedEntries[entryDate] || [];
      
      console.log(`📈 Found ${dayEntries.length} entries for ${entryDate}`);
      
      if (dayEntries.length <= 1) {
        console.log(`🗑️ Removing cached summary for ${entryDate} (${dayEntries.length} entries)`);
        await this.deleteCachedDaySummary(entryDate);
        return;
      }

      // ✅ Mark for regeneration with proper null handling
      console.log(`🔄 Marking ${entryDate} for regeneration (${dayEntries.length} entries)`);
      await this.markDayForRegeneration(entryDate, dayEntries.length);
      
      console.log(`✅ Marked ${entryDate} for regeneration`);
      
    } catch (error) {
      console.error('Error handling entry change:', error);
    }
  }
  
  private static async generateDaySummaryInBackground(date: string, dayEntries: Entry[]): Promise<void> {
    try {
      console.log(`🌟 Starting background analysis for ${date}...`);
      const result = await this.generateAndCacheDaySummary(date, dayEntries);
      console.log(`✅ Background analysis completed for ${date}: "${result.title}"`);
    } catch (error) {
      console.error(`❌ Background analysis failed for ${date}:`, error);
    }
  }

  private static async generateAndCacheDaySummary(date: string, dayEntries: Entry[]): Promise<DaySummary> {
    console.log(`🔧 generateAndCacheDaySummary for ${date} with ${dayEntries.length} entries`);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User authentication required for day summary generation');
    }

    console.log(`👤 User authenticated: ${user.id.substring(0, 8)}...`);

    const analysis = await this.runAIAnalysis(dayEntries, 'day', date, date);
    
    // ✅ Ensure title is never null or empty
    const safeTitle = analysis.title?.trim() || this.generateFallbackTitle(dayEntries);
    
    const summary: Omit<DaySummary, 'id' | 'generated_at' | 'updated_at'> = {
      user_id: user.id,
      date,
      entry_count: dayEntries.length,
      title: safeTitle, // ✅ Always provide a safe title
      summary: analysis.summary || 'Daily summary',
      emotions: analysis.emotions || [],
      themes: analysis.themes || [],
      people: analysis.people || [],
      places: analysis.places || [],
      activities: analysis.activities || [],
      mood_trend: analysis.mood_trend || 'stable',
      insights: analysis.insights || [],
      highlights: analysis.highlights || [],
      challenges: analysis.challenges || [],
      overall_sentiment: analysis.overall_sentiment || 'neutral',
      average_mood: analysis.average_mood,
      needs_regeneration: false,
    };

    console.log(`💾 Saving summary to database: "${safeTitle}"`);

    const { data, error } = await supabase
      .from('day_summaries')
      .upsert(summary, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to cache day summary:', error);
      throw error;
    }

    console.log(`🎉 Successfully cached summary for ${date}`);
    return data;
  }

  private static async getCachedDaySummary(date: string): Promise<DaySummary | null> {
    console.log(`🔍 Checking cache for ${date}...`);
    
    const { data, error } = await supabase
      .from('day_summaries')
      .select('*')
      .eq('date', date)
      .single();

    if (error || !data) {
      console.log(`💿 No cached summary found for ${date}`);
      return null;
    }
    
    console.log(`💾 Found cached summary for ${date}: "${data.title}" (needs_regen: ${data.needs_regeneration})`);
    return data;
  }

  // ✅ Fixed markDayForRegeneration to prevent null constraint violations
  private static async markDayForRegeneration(date: string, entryCount: number): Promise<void> {
    console.log(`🔄 Marking ${date} for regeneration...`);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User authentication required for marking regeneration');
      return;
    }
  
    // ✅ OPTIMIZATION: Check if entry already exists
    const { data: existing } = await supabase
      .from('day_summaries')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();
  
    if (existing) {
      // ✅ If entry exists, just mark for regeneration without changing the title
      const { error } = await supabase
        .from('day_summaries')
        .update({ 
          needs_regeneration: true,
          entry_count: entryCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
        
      if (error) {
        console.error(`❌ Failed to mark ${date} for regeneration:`, error);
        throw error;
      } else {
        console.log(`✅ Successfully marked existing ${date} for regeneration`);
      }
    } else {
      // ✅ If no entry exists, create with minimal fallback (will be replaced by AI)
      const fallbackTitle = entryCount === 1 ? 'Daily Entry' : `${entryCount} entries`;
  
      const { error } = await supabase
        .from('day_summaries')
        .insert({ 
          user_id: user.id,
          date, 
          title: fallbackTitle,
          summary: 'Pending AI analysis',
          entry_count: entryCount,
          emotions: [],
          themes: [],
          people: [],
          places: [],
          activities: [],
          mood_trend: 'stable',
          insights: [],
          highlights: [],
          challenges: [],
          overall_sentiment: 'neutral',
          average_mood: 3,
          needs_regeneration: true,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error(`❌ Failed to create regeneration marker for ${date}:`, error);
        throw error;
      } else {
        console.log(`✅ Successfully created regeneration marker for ${date}`);
      }
    }
  };

  private static async deleteCachedDaySummary(date: string): Promise<void> {
    console.log(`🗑️ Deleting cached summary for ${date}...`);
    
    const { error } = await supabase
      .from('day_summaries')
      .delete()
      .eq('date', date);
      
    if (error) {
      console.error(`❌ Failed to delete summary for ${date}:`, error);
    } else {
      console.log(`✅ Successfully deleted summary for ${date}`);
    }
  }

  private static generateFallbackTitle(dayEntries: Entry[]): string {
    const moods = dayEntries.filter(e => e.mood).map(e => e.mood!);
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 3;
    
    let title = '';
    if (avgMood >= 4) title = `Great Day - ${dayEntries.length} moments`;
    else if (avgMood >= 3) title = `Good Day - ${dayEntries.length} entries`;
    else if (avgMood >= 2) title = `Mixed Day - ${dayEntries.length} thoughts`;
    else title = `Challenging Day - ${dayEntries.length} reflections`;
    
    console.log(`🎯 Generated fallback title: ${title} (avg mood: ${avgMood.toFixed(1)})`);
    return title;
  }

  private static async getEntriesInDateRange(startDate: string, endDate: string): Promise<Entry[]> {
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

    console.log('🔍 Sample entry data being sent to AI:');
    analysisEntries.slice(0, 2).forEach((entry, i) => {
      console.log(`Entry ${i + 1}:`, {
        title: entry.title,
        contentLength: entry.content?.length || 0,
        contentPreview: entry.content?.substring(0, 100) + '...',
        mood: entry.mood,
        tags: entry.tags
      });
    });

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

      // ✅ Ensure title is never null
      if (!result.title || result.title.trim().length === 0) {
        result.title = this.generateFallbackTitle(entries);
        console.log(`⚠️ AI returned empty title, using fallback: ${result.title}`);
      }

      return result;
    } catch (error) {
      console.error('❌ AI analysis failed, using fallback:', error);
      
      // ✅ Return safe fallback analysis
      const moods = entries.filter(e => e.mood).map(e => e.mood!);
      const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 3;
      
      return {
        title: this.generateFallbackTitle(entries),
        summary: `Summary of ${entries.length} entries from ${startDate}`,
        emotions: [],
        themes: [],
        people: [],
        places: [],
        activities: [],
        mood_trend: 'stable',
        insights: [],
        highlights: [],
        challenges: [],
        overall_sentiment: avgMood >= 4 ? 'positive' : avgMood >= 3 ? 'neutral' : 'negative',
        entry_count: entries.length,
        period_type: periodType,
        start_date: startDate,
        end_date: endDate,
        average_mood: avgMood
      };
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

  static async processOutdatedSummaries(limit: number = 5): Promise<void> {
    console.log(`🔧 Processing up to ${limit} outdated summaries...`);
    
    const { data: outdated } = await supabase
      .from('day_summaries')
      .select('date')
      .eq('needs_regeneration', true)
      .limit(limit);

    if (!outdated?.length) {
      console.log('✅ No outdated summaries to process');
      return;
    }

    console.log(`🔄 Found ${outdated.length} outdated summaries to process`);

    for (const { date } of outdated) {
      try {
        console.log(`🔧 Processing outdated summary for ${date}...`);
        
        const groupedEntries = await entriesService.groupEntriesByDay();
        const dayEntries = groupedEntries[date] || [];
        
        if (dayEntries.length > 1) {
          await this.generateAndCacheDaySummary(date, dayEntries);
          console.log(`✅ Regenerated summary for ${date}`);
        } else {
          await this.deleteCachedDaySummary(date);
          console.log(`🗑️ Deleted summary for ${date} (not enough entries)`);
        }
      } catch (error) {
        console.error(`❌ Failed to process outdated summary for ${date}:`, error);
      }
    }
    
    console.log(`🎉 Completed processing outdated summaries`);
  }
}

export default PeriodAnalyzer;