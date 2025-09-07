import { Tag } from '../types/journal';
import { generateId } from '../utils/id';

/**
 * Normalize a tag string (lowercase, trim, remove special chars)
 */
export function normalizeTagString(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .substring(0, 30); // Limit length
}

/**
 * Create a Tag object from a string
 */
export function normalizeTag(tagString: string): Tag {
  const normalized = normalizeTagString(tagString);
  return {
    id: generateId(),
    name: normalized,
  };
}

/**
 * Parse a string of tags separated by commas or spaces
 */
export function parseTags(input: string): string[] {
  if (!input.trim()) return [];
  
  // Split by commas or spaces
  const tags = input
    .split(/[,\s]+/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(normalizeTagString);
  
  // Remove duplicates
  return Array.from(new Set(tags));
}

/**
 * Format tags for display (add # prefix)
 */
export function formatTagForDisplay(tag: string): string {
  return `#${tag}`;
}

/**
 * Get tag suggestions based on input and existing tags
 */
export function getTagSuggestions(
  input: string,
  existingTags: string[],
  limit: number = 5
): string[] {
  if (!input.trim()) return [];
  
  const normalizedInput = normalizeTagString(input);
  
  return existingTags
    .filter(tag => 
      tag.toLowerCase().includes(normalizedInput) &&
      tag !== normalizedInput
    )
    .slice(0, limit);
}

/**
 * Sort tags by frequency
 */
export function sortTagsByFrequency(tags: Map<string, number>): string[] {
  return Array.from(tags.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

/**
 * Common tag presets for quick selection
 */
export const TAG_PRESETS = [
  'personal',
  'work',
  'family',
  'health',
  'goals',
  'gratitude',
  'reflection',
  'ideas',
  'dreams',
  'travel',
  'fitness',
  'learning',
  'creative',
  'social',
  'finance',
];

/**
 * Validate if a tag is valid
 */
export function isValidTag(tag: string): boolean {
  const normalized = normalizeTagString(tag);
  return normalized.length > 0 && normalized.length <= 30;
}