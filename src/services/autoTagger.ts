import { Mood } from '../types/journal';

/**
 * Generate a smart, concise title from entry content
 * Creates 2-4 word descriptive titles
 */
export async function generateSmartTitle(content: string, mood?: Mood): Promise<string> {
  if (!content) return 'Untitled Entry';
  
  const lowerContent = content.toLowerCase();
  
  // Priority 1: Strong emotional moments
  const emotionalPhrases = [
    { keywords: ['amazing', 'wonderful', 'fantastic'], title: 'Amazing Day' },
    { keywords: ['terrible', 'awful', 'horrible'], title: 'Tough Day' },
    { keywords: ['excited', 'thrilled'], title: 'Feeling Excited' },
    { keywords: ['grateful', 'thankful', 'blessed'], title: 'Grateful Moment' },
    { keywords: ['accomplished', 'achieved', 'succeeded'], title: 'Achievement Unlocked' },
    { keywords: ['love', 'loved', 'loving'], title: 'Love & Connection' },
    { keywords: ['peaceful', 'calm', 'serene'], title: 'Peaceful Moment' },
    { keywords: ['anxious', 'worried', 'nervous'], title: 'Anxious Thoughts' },
    { keywords: ['happy birthday'], title: 'Birthday Celebration' },
    { keywords: ['new job', 'promotion'], title: 'Career Milestone' },
  ];
  
  for (const phrase of emotionalPhrases) {
    if (phrase.keywords.some(keyword => lowerContent.includes(keyword))) {
      return phrase.title;
    }
  }
  
  // Priority 2: Activity-based titles
  const activities = [
    { keywords: ['meeting', 'presentation', 'work'], title: 'Work Day' },
    { keywords: ['gym', 'workout', 'exercise', 'run'], title: 'Fitness Session' },
    { keywords: ['coffee', 'lunch', 'dinner', 'breakfast'], title: 'Meal Moments' },
    { keywords: ['friend', 'friends'], title: 'Friend Time' },
    { keywords: ['family'], title: 'Family Time' },
    { keywords: ['travel', 'trip', 'vacation'], title: 'Travel Adventures' },
    { keywords: ['movie', 'show', 'netflix'], title: 'Entertainment Night' },
    { keywords: ['book', 'reading', 'study'], title: 'Learning Time' },
    { keywords: ['walk', 'park', 'nature'], title: 'Nature Walk' },
    { keywords: ['date', 'romantic'], title: 'Date Night' },
  ];
  
  for (const activity of activities) {
    if (activity.keywords.some(keyword => lowerContent.includes(keyword))) {
      return activity.title;
    }
  }
  
  // Priority 3: Time-based titles
  const now = new Date();
  const hour = now.getHours();
  
  if (lowerContent.includes('morning') || (hour >= 5 && hour < 12)) {
    if (lowerContent.includes('coffee')) return 'Morning Coffee';
    if (lowerContent.includes('routine')) return 'Morning Routine';
    return 'Morning Thoughts';
  }
  
  if (lowerContent.includes('afternoon') || (hour >= 12 && hour < 17)) {
    return 'Afternoon Reflection';
  }
  
  if (lowerContent.includes('evening') || lowerContent.includes('night') || hour >= 17) {
    return 'Evening Reflection';
  }
  
  // Priority 4: Mood-based fallback
  if (mood) {
    const moodTitles: Record<Mood, string> = {
      1: 'Difficult Day',
      2: 'Challenging Times',
      3: 'Regular Day',
      4: 'Good Vibes',
      5: 'Great Day',
    };
    return moodTitles[mood];
  }
  
  // Priority 5: Extract key action words
  const actionWords = ['decided', 'realized', 'learned', 'discovered', 'started', 'finished'];
  for (const action of actionWords) {
    if (lowerContent.includes(action)) {
      return `${action.charAt(0).toUpperCase() + action.slice(1)} Something`;
    }
  }
  
  // Priority 6: Day of week fallback
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  return `${dayName} Entry`;
}

/**
 * Generate automatic tags from entry content
 */
export async function generateAutoTags(
  content: string, 
  mood?: Mood,
  hasPhotos?: boolean
): Promise<string[]> {
  const tags: Set<string> = new Set();
  const lowerContent = content.toLowerCase();
  
  // Add photo tag if applicable
  if (hasPhotos) {
    tags.add('photo');
    tags.add('visual-memory');
  }
  
  // 1. Mood-based tags
  if (mood) {
    const moodTags: Record<Mood, string[]> = {
      1: ['difficult', 'challenging', 'low-mood'],
      2: ['struggling', 'tough'],
      3: ['neutral', 'balanced'],
      4: ['good', 'positive'],
      5: ['great', 'happy', 'excellent'],
    };
    moodTags[mood].forEach(tag => tags.add(tag));
  }
  
  // 2. Emotion detection
  const emotions = {
    happy: ['happy', 'joy', 'excited', 'delighted', 'cheerful', 'glad'],
    sad: ['sad', 'depressed', 'down', 'unhappy', 'miserable', 'crying'],
    anxious: ['anxious', 'worried', 'nervous', 'stressed', 'tense', 'panic'],
    grateful: ['grateful', 'thankful', 'blessed', 'appreciate'],
    angry: ['angry', 'frustrated', 'annoyed', 'irritated', 'mad'],
    peaceful: ['peaceful', 'calm', 'relaxed', 'serene', 'tranquil'],
    love: ['love', 'caring', 'affection', 'romance'],
  };
  
  for (const [emotion, keywords] of Object.entries(emotions)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      tags.add(emotion);
    }
  }
  
  // 3. Activity detection
  const activities = {
    work: ['work', 'job', 'office', 'meeting', 'project', 'deadline', 'colleague', 'boss'],
    exercise: ['gym', 'workout', 'run', 'walk', 'exercise', 'yoga', 'fitness'],
    social: ['friend', 'family', 'party', 'dinner', 'lunch', 'coffee', 'chat'],
    travel: ['trip', 'travel', 'vacation', 'journey', 'flight', 'hotel'],
    learning: ['learn', 'study', 'read', 'book', 'course', 'class', 'school'],
    creative: ['create', 'write', 'draw', 'paint', 'music', 'art', 'design'],
    health: ['doctor', 'health', 'sick', 'medicine', 'hospital', 'therapy'],
    nature: ['nature', 'park', 'tree', 'mountain', 'beach', 'ocean', 'forest'],
    food: ['breakfast', 'lunch', 'dinner', 'eat', 'food', 'meal', 'restaurant'],
  };
  
  for (const [activity, keywords] of Object.entries(activities)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      tags.add(activity);
    }
  }
  
  // 4. Time of day detection
  if (lowerContent.includes('morning') || lowerContent.includes('breakfast')) {
    tags.add('morning');
  }
  if (lowerContent.includes('afternoon') || lowerContent.includes('lunch')) {
    tags.add('afternoon');
  }
  if (lowerContent.includes('evening') || lowerContent.includes('dinner') || lowerContent.includes('night')) {
    tags.add('evening');
  }
  
  // 5. Relationship detection
  const relationships = ['mom', 'dad', 'parent', 'sister', 'brother', 'spouse', 'partner', 'kid', 'child', 'friend'];
  if (relationships.some(rel => lowerContent.includes(rel))) {
    tags.add('relationships');
  }
  
  // 6. Achievement/Goal detection
  if (['achieved', 'accomplished', 'completed', 'finished', 'succeeded', 'goal'].some(word => lowerContent.includes(word))) {
    tags.add('achievement');
  }
  
  // 7. Reflection tags
  if (['think', 'thought', 'realize', 'understand', 'reflect', 'consider'].some(word => lowerContent.includes(word))) {
    tags.add('reflection');
  }
  
  // 8. Weather detection
  const weatherWords = ['sunny', 'rain', 'snow', 'cold', 'hot', 'warm', 'weather'];
  if (weatherWords.some(word => lowerContent.includes(word))) {
    tags.add('weather');
  }
  
  // 9. Length-based tags
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 50) {
    tags.add('brief');
  } else if (wordCount > 200) {
    tags.add('detailed');
  }
  
  // 10. Day of week
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  tags.add(dayName);
  
  // Convert Set to Array and limit to reasonable number
  return Array.from(tags).slice(0, 15);
}