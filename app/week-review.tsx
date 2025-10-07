// app/week-review.tsx

import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/constants/theme';
import { useJournal } from '../src/context/JournalContext';
import PeriodAnalyzer, { PeriodAnalysis } from '../src/services/periodAnalyzer';
import { Stack } from 'expo-router';
import analytics from '@/utils/analytics';


export default function WeekReviewScreen() {
  const router = useRouter();
  const { entries } = useJournal();

  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<PeriodAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get available weeks with entries
  const getAvailableWeeks = useCallback(() => {
    const weeks: Array<{ label: string; startDate: string; endDate: string }> = [];
    const now = new Date();

    // Generate last 12 weeks
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + 7 * i)); // Start of week (Sunday)

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      // Check if this week has any entries
      const hasEntries = entries.some(entry => {
        const entryDate = entry.date || entry.createdAt.split('T')[0];
        return entryDate >= startStr && entryDate <= endStr;
      });

      if (hasEntries) {
        const label = i === 0
          ? 'This Week'
          : i === 1
            ? 'Last Week'
            : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

        weeks.push({ label, startDate: startStr, endDate: endStr });
      }
    }
    analytics.logTrack('weekly_entries_viewed', {
      total_days: Object.keys(entries).length,
      total_entries: entries.length
    });
    
    return weeks;
  }, [entries]);

  const handleGenerateReview = async () => {
    if (!selectedWeek) return;

    const week = getAvailableWeeks().find(w => w.startDate === selectedWeek);
    if (!week) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await PeriodAnalyzer.analyzeWeekEntries(week.startDate, week.endDate);
      setAnalysis(result);
    } catch (err) {
      console.error('Week analysis failed:', err);
      setError('Failed to generate week review. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const availableWeeks = getAvailableWeeks();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Week in Review</Text>
            {/* <Text style={styles.headerSubtitle}>AI-powered weekly insights</Text> */}
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Week Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select a Week</Text>
            <Text style={styles.sectionDescription}>
              Choose a week to generate your personalized review and insights
            </Text>

            <View style={styles.weekOptions}>
              {availableWeeks.map((week) => (
                <TouchableOpacity
                  key={week.startDate}
                  style={[
                    styles.weekOption,
                    selectedWeek === week.startDate && styles.weekOptionSelected
                  ]}
                  onPress={() => setSelectedWeek(week.startDate)}
                >
                  <Text style={[
                    styles.weekOptionText,
                    selectedWeek === week.startDate && styles.weekOptionTextSelected
                  ]}>
                    {week.label}
                  </Text>
                  {selectedWeek === week.startDate && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {availableWeeks.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyStateText}>No journal entries found in recent weeks</Text>
                <Text style={styles.emptyStateSubtext}>Start journaling to generate weekly reviews</Text>
              </View>
            )}
          </View>

          {/* Generate Button */}
          {selectedWeek && (
            <TouchableOpacity
              style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
              onPress={handleGenerateReview}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="sparkles" size={20} color="white" />
              )}
              <Text style={styles.generateButtonText}>
                {isGenerating ? 'Generating...' : 'Generate Week Review'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Error State */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Analysis Results */}
          {analysis && (
            <View style={styles.analysisContainer}>
              <View style={styles.analysisHeader}>
                <Ionicons name="document-text" size={24} color={theme.colors.primary} />
                <Text style={styles.analysisTitle}>{analysis.title}</Text>
              </View>

              <Text style={styles.analysisSummary}>{analysis.summary}</Text>

              {/* Key Insights */}
              {analysis.insights.length > 0 && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionTitle}>Key Insights</Text>
                  {analysis.insights.map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <Ionicons name="bulb" size={16} color={theme.colors.primary} />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Highlights */}
              {analysis.highlights.length > 0 && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionTitle}>Highlights</Text>
                  {analysis.highlights.map((highlight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.insightText}>{highlight}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Themes & People */}
              <View style={styles.metadataContainer}>
                {analysis.themes.length > 0 && (
                  <View style={styles.metadataSection}>
                    <Text style={styles.metadataTitle}>Themes</Text>
                    <View style={styles.tagContainer}>
                      {analysis.themes.slice(0, 5).map((theme, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{theme}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {analysis.people.length > 0 && (
                  <View style={styles.metadataSection}>
                    <Text style={styles.metadataTitle}>People</Text>
                    <View style={styles.tagContainer}>
                      {analysis.people.slice(0, 5).map((person, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{person}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{analysis.entry_count}</Text>
                  <Text style={styles.statLabel}>Entries</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{analysis.overall_sentiment}</Text>
                  <Text style={styles.statLabel}>Overall Tone</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{analysis.mood_trend}</Text>
                  <Text style={styles.statLabel}>Mood Trend</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60, // Add more top padding for status bar
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  weekOptions: {
    gap: theme.spacing.sm,
  },
  weekOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  weekOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  weekOptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '500',
  },
  weekOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.xl,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    ...theme.typography.body,
    color: 'white',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.danger + '10',
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  analysisContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  analysisTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
    flex: 1,
  },
  analysisSummary: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  insightSection: {
    marginBottom: theme.spacing.lg,
  },
  insightSectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  insightText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  metadataContainer: {
    marginBottom: theme.spacing.lg,
  },
  metadataSection: {
    marginBottom: theme.spacing.md,
  },
  metadataTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tag: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  tagText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});