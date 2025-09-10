// app/month-review.tsx

import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/constants/theme';
import { useJournal } from '../src/context/JournalContext';
import EfficientPeriodAnalyzer, { PeriodAnalysis } from '../src/services/periodAnalyzerEfficient';
import { Stack } from 'expo-router';


export default function MonthReviewScreen() {
  const router = useRouter();
  const { entries } = useJournal();

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<PeriodAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get available months with entries
  const getAvailableMonths = useCallback(() => {
    const months: Array<{ label: string; startDate: string; endDate: string; value: string }> = [];
    const now = new Date();

    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last day of month

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      const monthValue = `${year}-${String(month + 1).padStart(2, '0')}`;

      // Check if this month has any entries
      const hasEntries = entries.some(entry => {
        const entryDate = entry.date || entry.createdAt.split('T')[0];
        return entryDate >= startStr && entryDate <= endStr;
      });

      if (hasEntries) {
        const label = i === 0
          ? 'This Month'
          : i === 1
            ? 'Last Month'
            : monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        months.push({ label, startDate: startStr, endDate: endStr, value: monthValue });
      }
    }

    return months;
  }, [entries]);

  const handleGenerateReview = async () => {
    if (!selectedMonth) return;

    const month = getAvailableMonths().find(m => m.value === selectedMonth);
    if (!month) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await EfficientPeriodAnalyzer.analyzeMonthEntries(month.startDate, month.endDate);
      setAnalysis(result);
    } catch (err) {
      console.error('Month analysis failed:', err);
      setError('Failed to generate month review. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const availableMonths = getAvailableMonths();

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
            <Text style={styles.headerTitle}>Month in Review</Text>
            {/* <Text style={styles.headerSubtitle}>Comprehensive monthly insights</Text> */}
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Month Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select a Month</Text>
            <Text style={styles.sectionDescription}>
              Choose a month to generate your comprehensive review and growth insights
            </Text>

            <View style={styles.monthOptions}>
              {availableMonths.map((month) => (
                <TouchableOpacity
                  key={month.value}
                  style={[
                    styles.monthOption,
                    selectedMonth === month.value && styles.monthOptionSelected
                  ]}
                  onPress={() => setSelectedMonth(month.value)}
                >
                  <Text style={[
                    styles.monthOptionText,
                    selectedMonth === month.value && styles.monthOptionTextSelected
                  ]}>
                    {month.label}
                  </Text>
                  {selectedMonth === month.value && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {availableMonths.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyStateText}>No journal entries found in recent months</Text>
                <Text style={styles.emptyStateSubtext}>Start journaling to generate monthly reviews</Text>
              </View>
            )}
          </View>

          {/* Generate Button */}
          {selectedMonth && (
            <TouchableOpacity
              style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
              onPress={handleGenerateReview}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="analytics" size={20} color="white" />
              )}
              <Text style={styles.generateButtonText}>
                {isGenerating ? 'Generating...' : 'Generate Month Review'}
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
                <Ionicons name="library" size={24} color={theme.colors.primary} />
                <Text style={styles.analysisTitle}>{analysis.title}</Text>
              </View>

              <Text style={styles.analysisSummary}>{analysis.summary}</Text>

              {/* Growth Insights */}
              {analysis.insights.length > 0 && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionTitle}>Growth & Insights</Text>
                  {analysis.insights.map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <Ionicons name="trending-up" size={16} color={theme.colors.primary} />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Highlights & Challenges */}
              <View style={styles.highlightsChallengesContainer}>
                {analysis.highlights.length > 0 && (
                  <View style={styles.highlightsChallengesSection}>
                    <Text style={styles.insightSectionTitle}>Monthly Highlights</Text>
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
                    <Text style={styles.insightSectionTitle}>Growth Opportunities</Text>
                    {analysis.challenges.map((challenge, index) => (
                      <View key={index} style={styles.insightItem}>
                        <Ionicons name="flag" size={16} color="#FF6B6B" />
                        <Text style={styles.insightText}>{challenge}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Comprehensive Metadata */}
              <View style={styles.comprehensiveMetadata}>
                {analysis.themes.length > 0 && (
                  <View style={styles.metadataSection}>
                    <Text style={styles.metadataTitle}>Major Themes</Text>
                    <View style={styles.tagContainer}>
                      {analysis.themes.slice(0, 8).map((theme, index) => (
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
                      {analysis.people.slice(0, 6).map((person, index) => (
                        <View key={index} style={[styles.tag, styles.peopleTag]}>
                          <Text style={[styles.tagText, styles.peopleTagText]}>{person}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {analysis.places.length > 0 && (
                  <View style={styles.metadataSection}>
                    <Text style={styles.metadataTitle}>Places Visited</Text>
                    <View style={styles.tagContainer}>
                      {analysis.places.slice(0, 6).map((place, index) => (
                        <View key={index} style={[styles.tag, styles.placeTag]}>
                          <Text style={[styles.tagText, styles.placeTagText]}>{place}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {analysis.activities.length > 0 && (
                  <View style={styles.metadataSection}>
                    <Text style={styles.metadataTitle}>Key Activities</Text>
                    <View style={styles.tagContainer}>
                      {analysis.activities.slice(0, 8).map((activity, index) => (
                        <View key={index} style={[styles.tag, styles.activityTag]}>
                          <Text style={[styles.tagText, styles.activityTagText]}>{activity}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Comprehensive Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{analysis.entry_count}</Text>
                  <Text style={styles.statLabel}>Entries</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{analysis.overall_sentiment}</Text>
                  <Text style={styles.statLabel}>Overall Sentiment</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{analysis.mood_trend}</Text>
                  <Text style={styles.statLabel}>Emotional Journey</Text>
                </View>
                {analysis.average_mood && (
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{analysis.average_mood.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Avg Mood</Text>
                  </View>
                )}
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
  monthOptions: {
    gap: theme.spacing.sm,
  },
  monthOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  monthOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  monthOptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '500',
  },
  monthOptionTextSelected: {
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
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
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
});