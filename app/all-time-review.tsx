// app/all-time-review.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/constants/theme';
import { useJournal } from '../src/context/JournalContext';
import PeriodAnalyzer, { PeriodAnalysis } from '../src/services/periodAnalyzer';
import { Stack } from 'expo-router';

export default function AllTimeReviewScreen() {
  const router = useRouter();
  const { entries } = useJournal();

  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<PeriodAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // Calculate the date range based on all entries
  useEffect(() => {
    if (entries.length === 0) {
      setDateRange(null);
      return;
    }

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const firstEntry = sortedEntries[0];
    const lastEntry = sortedEntries[sortedEntries.length - 1];

    const startDate = firstEntry.date || firstEntry.createdAt.split('T')[0];
    const endDate = lastEntry.date || lastEntry.createdAt.split('T')[0];

    setDateRange({ start: startDate, end: endDate });
  }, [entries]);

  const formatDateRange = useCallback(() => {
    if (!dateRange) return '';
    
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    const startFormatted = startDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    const endFormatted = endDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Calculate the time span
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    let timeSpan = '';
    if (diffYears > 0) {
      timeSpan = diffYears === 1 ? '1 year' : `${diffYears} years`;
    } else if (diffMonths > 0) {
      timeSpan = diffMonths === 1 ? '1 month' : `${diffMonths} months`;
    } else {
      timeSpan = diffDays === 1 ? '1 day' : `${diffDays} days`;
    }

    return `${startFormatted} - ${endFormatted} (${timeSpan})`;
  }, [dateRange]);

  const handleGenerateReview = async () => {
    if (!dateRange) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Use the custom period type for all-time analysis
      const result = await PeriodAnalyzer.analyzeMonthEntries(dateRange.start, dateRange.end);
      
      // Override the analysis to reflect "all-time" nature
      const allTimeResult = {
        ...result,
        title: result.title.replace(/Month|Week/gi, 'Journey'),
        period_type: 'custom' as const,
      };
      
      setAnalysis(allTimeResult);
    } catch (err) {
      console.error('All-time analysis failed:', err);
      setError('Failed to generate all-time review. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getEntryStats = useCallback(() => {
    if (entries.length === 0) return null;

    const moodEntries = entries.filter(e => e.mood);
    const avgMood = moodEntries.length > 0 
      ? moodEntries.reduce((sum, e) => sum + (e.mood || 0), 0) / moodEntries.length 
      : null;

    const entriesWithPhotos = entries.filter(e => e.photos && e.photos.length > 0).length;
    const entriesWithLocation = entries.filter(e => e.locationData).length;

    return {
      totalEntries: entries.length,
      avgMood: avgMood ? avgMood.toFixed(1) : null,
      entriesWithPhotos,
      entriesWithLocation,
    };
  }, [entries]);

  const stats = getEntryStats();

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
            <Text style={styles.headerTitle}>All Time Review</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>No journal entries found</Text>
              <Text style={styles.emptyStateSubtext}>Start journaling to generate your all-time review</Text>
            </View>
          ) : (
            <>
              {/* Overview Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Journaling Journey</Text>
                <Text style={styles.sectionDescription}>
                  Generate a comprehensive review of your entire journaling experience
                </Text>

                {dateRange && (
                  <View style={styles.dateRangeCard}>
                    <View style={styles.dateRangeHeader}>
                      <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                      <Text style={styles.dateRangeTitle}>Journey Timeline</Text>
                    </View>
                    <Text style={styles.dateRangeText}>{formatDateRange()}</Text>
                  </View>
                )}

                {/* {stats && (
                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{stats.totalEntries}</Text>
                      <Text style={styles.statLabel}>Total Entries</Text>
                    </View>
                    {stats.avgMood && (
                      <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.avgMood}</Text>
                        <Text style={styles.statLabel}>Avg Mood</Text>
                      </View>
                    )}
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{stats.entriesWithPhotos}</Text>
                      <Text style={styles.statLabel}>With Photos</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{stats.entriesWithLocation}</Text>
                      <Text style={styles.statLabel}>With Location</Text>
                    </View>
                  </View>
                )} */}
              </View>

              {/* Generate Button */}
              <TouchableOpacity
                style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                onPress={handleGenerateReview}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="telescope" size={20} color="white" />
                )}
                <Text style={styles.generateButtonText}>
                  {isGenerating ? 'Generating...' : 'Generate All-Time Review'}
                </Text>
              </TouchableOpacity>

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
                    <Ionicons name="telescope" size={24} color={theme.colors.primary} />
                    <Text style={styles.analysisTitle}>{analysis.title}</Text>
                  </View>

                  <Text style={styles.analysisSummary}>{analysis.summary}</Text>

                  {/* Life Insights */}
                  {analysis.insights.length > 0 && (
                    <View style={styles.insightSection}>
                      <Text style={styles.insightSectionTitle}>Life Insights</Text>
                      {analysis.insights.map((insight, index) => (
                        <View key={index} style={styles.insightItem}>
                          <Ionicons name="telescope" size={16} color={theme.colors.primary} />
                          <Text style={styles.insightText}>{insight}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Journey Highlights & Growth */}
                  <View style={styles.highlightsChallengesContainer}>
                    {analysis.highlights.length > 0 && (
                      <View style={styles.highlightsChallengesSection}>
                        <Text style={styles.insightSectionTitle}>Journey Highlights</Text>
                        {analysis.highlights.map((highlight, index) => (
                          <View key={index} style={styles.insightItem}>
                            <Ionicons name="star" size={16} color="#FFD700" />
                            <Text style={styles.insightText}>{highlight}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {analysis.challenges.length > 0 && (
                      <View style={styles.highlightsChallengesSection}>
                        <Text style={styles.insightSectionTitle}>Growth Through Challenges</Text>
                        {analysis.challenges.map((challenge, index) => (
                          <View key={index} style={styles.insightItem}>
                            <Ionicons name="trending-up" size={16} color="#4CAF50" />
                            <Text style={styles.insightText}>{challenge}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Comprehensive Life Metadata */}
                  <View style={styles.comprehensiveMetadata}>
                    {analysis.themes.length > 0 && (
                      <View style={styles.metadataSection}>
                        <Text style={styles.metadataTitle}>Life Themes</Text>
                        <View style={styles.tagContainer}>
                          {analysis.themes.slice(0, 10).map((theme, index) => (
                            <View key={index} style={styles.tag}>
                              <Text style={styles.tagText}>{theme}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {analysis.people.length > 0 && (
                      <View style={styles.metadataSection}>
                        <Text style={styles.metadataTitle}>Important People</Text>
                        <View style={styles.tagContainer}>
                          {analysis.people.slice(0, 8).map((person, index) => (
                            <View key={index} style={[styles.tag, styles.peopleTag]}>
                              <Text style={[styles.tagText, styles.peopleTagText]}>{person}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {analysis.places.length > 0 && (
                      <View style={styles.metadataSection}>
                        <Text style={styles.metadataTitle}>Places in Your Journey</Text>
                        <View style={styles.tagContainer}>
                          {analysis.places.slice(0, 8).map((place, index) => (
                            <View key={index} style={[styles.tag, styles.placeTag]}>
                              <Text style={[styles.tagText, styles.placeTagText]}>{place}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {analysis.activities.length > 0 && (
                      <View style={styles.metadataSection}>
                        <Text style={styles.metadataTitle}>Life Activities</Text>
                        <View style={styles.tagContainer}>
                          {analysis.activities.slice(0, 10).map((activity, index) => (
                            <View key={index} style={[styles.tag, styles.activityTag]}>
                              <Text style={[styles.tagText, styles.activityTagText]}>{activity}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Journey Stats */}
                  <View style={styles.statsContainer}>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{analysis.entry_count}</Text>
                      <Text style={styles.statLabel}>Total Entries</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{analysis.overall_sentiment}</Text>
                      <Text style={styles.statLabel}>Overall Journey</Text>
                    </View>     
                  </View>
                </View>
              )}
            </>
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
    paddingTop: 60,
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
  dateRangeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateRangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  dateRangeTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dateRangeText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    minWidth: '22%',
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    textAlign: 'center',
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
    paddingTop: theme.spacing.xxl,
  },
  emptyStateText: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
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
  highlightsChallengesContainer: {
    marginBottom: theme.spacing.lg,
  },
  highlightsChallengesSection: {
    marginBottom: theme.spacing.lg,
  },
  comprehensiveMetadata: {
    marginBottom: theme.spacing.lg,
  },
  metadataSection: {
    marginBottom: theme.spacing.lg,
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
  peopleTag: {
    backgroundColor: '#E3F2FD',
  },
  peopleTagText: {
    color: '#1976D2',
  },
  placeTag: {
    backgroundColor: '#E8F5E8',
  },
  placeTagText: {
    color: '#388E3C',
  },
  activityTag: {
    backgroundColor: '#FFF3E0',
  },
  activityTagText: {
    color: '#F57C00',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  stat: {
    alignItems: 'center',
    minWidth: '20%',
  },
});