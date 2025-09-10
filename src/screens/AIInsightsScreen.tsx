// app/ai_insights.tsx

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import { theme } from '../constants/theme';
import { useJournal } from '../context/JournalContext';

export default function AIInsightsScreen() {
  const router = useRouter();
  const { refreshEntries } = useJournal();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEntries();
    setRefreshing(false);
  }, [refreshEntries]);

  const handleWeekReview = () => {
    router.push('/week-review');
  };

  const handleMonthReview = () => {
    router.push('/month-review');
  };

  const handleUnavailableFeature = () => {
    // Could show a "Coming Soon" modal or just ignore tap
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* <Text style={styles.headerTitle}>AI Insights</Text> */}
        <Text style={styles.headerSubtitle}>Discover patterns in your journey using AI</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.insightsContainer}
      >
        {/* Week in Review */}
        <TouchableOpacity onPress={handleWeekReview}>
          <Card style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIcon}>
                <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.insightTitle}>Week in Review</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.insightDescription}>
              Your journaling patterns and highlights from the past 7 days
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Month in Review */}
        <TouchableOpacity onPress={handleMonthReview}>
          <Card style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIcon}>
                <Ionicons name="stats-chart-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.insightTitle}>Month in Review</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.insightDescription}>
              Monthly trends, mood patterns, and writing insights
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Memory Chatbot - Unavailable */}
        <TouchableOpacity onPress={handleUnavailableFeature} disabled>
          <Card style={[styles.insightCard, styles.unavailableCard]}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, styles.unavailableIcon]}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.insightTitle, styles.unavailableTitle]}>Memory Chatbot</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </View>
            <Text style={[styles.insightDescription, styles.unavailableDescription]}>
              Chat with an AI that remembers your entire journal history
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Bubble Words */}
        {/* Bubble Words - Unavailable */}
        <TouchableOpacity onPress={handleUnavailableFeature} disabled>
          <Card style={[styles.insightCard, styles.unavailableCard]}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, styles.unavailableIcon]}>
                <Ionicons name="chatbubbles-outline" size={24} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.insightTitle, styles.unavailableTitle]}>Bubble Words</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </View>
            <Text style={[styles.insightDescription, styles.unavailableDescription]}>
              Your most frequently used words and themes
            </Text>
            <View style={styles.bubbleWordsPreview}>
              <View style={[styles.bubbleWord, styles.unavailableBubble]}><Text style={styles.unavailableBubbleText}>grateful</Text></View>
              <View style={[styles.bubbleWord, styles.unavailableBubble]}><Text style={styles.unavailableBubbleText}>peaceful</Text></View>
              <View style={[styles.bubbleWord, styles.unavailableBubble]}><Text style={styles.unavailableBubbleText}>progress</Text></View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Highlights - Unavailable */}
        <TouchableOpacity onPress={handleUnavailableFeature} disabled>
          <Card style={[styles.insightCard, styles.unavailableCard]}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, styles.unavailableIcon]}>
                <Ionicons name="star-outline" size={24} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.insightTitle, styles.unavailableTitle]}>Highlights</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </View>
            <Text style={[styles.insightDescription, styles.unavailableDescription]}>
              Your brightest moments and positive entries
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Growth Moments - Unavailable */}
        <TouchableOpacity onPress={handleUnavailableFeature} disabled>
          <Card style={[styles.insightCard, styles.unavailableCard]}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, styles.unavailableIcon]}>
                <Ionicons name="trending-up-outline" size={24} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.insightTitle, styles.unavailableTitle]}>Growth Moments</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </View>
            <Text style={[styles.insightDescription, styles.unavailableDescription]}>
              Challenging times that led to personal growth
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Mood Patterns - Unavailable */}
        <TouchableOpacity onPress={handleUnavailableFeature} disabled>
          <Card style={[styles.insightCard, styles.unavailableCard]}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, styles.unavailableIcon]}>
                <Ionicons name="pulse-outline" size={24} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.insightTitle, styles.unavailableTitle]}>Mood Patterns</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </View>
            <Text style={[styles.insightDescription, styles.unavailableDescription]}>
              Discover trends in your emotional journey
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Writing Streaks - Unavailable */}
        <TouchableOpacity onPress={handleUnavailableFeature} disabled>
          <Card style={[styles.insightCard, styles.unavailableCard]}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, styles.unavailableIcon]}>
                <Ionicons name="flame-outline" size={24} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.insightTitle, styles.unavailableTitle]}>Writing Streaks</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </View>
            <Text style={[styles.insightDescription, styles.unavailableDescription]}>
              Track your consistency and celebrate milestones
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Relationship Insights - Unavailable */}
        <TouchableOpacity onPress={handleUnavailableFeature} disabled>
          <Card style={[styles.insightCard, styles.unavailableCard]}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, styles.unavailableIcon]}>
                <Ionicons name="people-outline" size={24} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.insightTitle, styles.unavailableTitle]}>Relationship Insights</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </View>
            <Text style={[styles.insightDescription, styles.unavailableDescription]}>
              Analyze mentions of people and relationships in your entries
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Goal Progress - Unavailable */}
        <TouchableOpacity onPress={handleUnavailableFeature} disabled>
          <Card style={[styles.insightCard, styles.unavailableCard]}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, styles.unavailableIcon]}>
                <Ionicons name="trophy-outline" size={24} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.insightTitle, styles.unavailableTitle]}>Goal Progress</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            </View>
            <Text style={[styles.insightDescription, styles.unavailableDescription]}>
              Track progress toward goals mentioned in your journal
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Premium Banner */}
        <Card style={[styles.insightCard, styles.premiumBanner]}>
          <View style={styles.premiumContent}>
            <View style={styles.premiumIcon}>
              <Ionicons name="star" size={28} color="#FFD700" />
            </View>
            <View style={styles.premiumText}>
              <Text style={styles.premiumTitle}>Unlock Premium Insights</Text>
              <Text style={styles.premiumDescription}>
                Get deeper analysis and unlimited access to all AI-powered insights
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  insightsContainer: {
    padding: theme.spacing.lg,
  },
  insightCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  insightTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    flex: 1,
  },
  insightDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginLeft: 60,
  },
  bubbleWordsPreview: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginLeft: 60,
  },
  bubbleWord: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  bubbleWordText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  
  // Unavailable feature styles
  unavailableCard: {
    opacity: 0.6,
    backgroundColor: theme.colors.surface + '80',
  },
  unavailableIcon: {
    backgroundColor: theme.colors.textSecondary + '15',
  },
  unavailableTitle: {
    color: theme.colors.textSecondary,
  },
  unavailableDescription: {
    color: theme.colors.textSecondary + '80',
  },
  unavailableBubble: {
    backgroundColor: theme.colors.textSecondary + '20',
  },
  unavailableBubbleText: {
    color: theme.colors.textSecondary,
  },
  comingSoonBadge: {
    backgroundColor: theme.colors.textSecondary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  comingSoonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 11,
  },

  // Premium banner
  premiumBanner: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderWidth: 2,
    borderColor: theme.colors.primary + '30',
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  premiumDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});