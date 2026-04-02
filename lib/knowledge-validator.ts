/**
 * KNOWLEDGE VALIDATION
 * Validates knowledge entries for consistency and quality
 */

import type { KnowledgeEntry } from './siggy-knowledge';
import { RITUAL_COMMUNITY_KNOWLEDGE } from './ritual-community-knowledge';
import { SIGGY_KNOWLEDGE } from './siggy-knowledge';
import { RITUAL_WEB_KNOWLEDGE } from './ritual-web-knowledge';
import { RITUAL_DISCORD_KNOWLEDGE } from './ritual-discord-knowledge';
import { RITUAL_STATS_KNOWLEDGE } from './ritual-stats-knowledge';
import { MANUAL_KNOWLEDGE } from './manual-knowledge';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalEntries: number;
    duplicateIds: string[];
    missingPriorities: string[];
    emptyContent: string[];
  };
}

export function validateKnowledge(): ValidationResult {
  const allKnowledge: KnowledgeEntry[] = [
    ...RITUAL_COMMUNITY_KNOWLEDGE,
    ...SIGGY_KNOWLEDGE,
    ...RITUAL_WEB_KNOWLEDGE,
    ...RITUAL_DISCORD_KNOWLEDGE,
    ...RITUAL_STATS_KNOWLEDGE,
    ...MANUAL_KNOWLEDGE,
  ];

  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const missingPriorities: string[] = [];
  const emptyContent: string[] = [];

  for (const entry of allKnowledge) {
    // Check for duplicate IDs
    if (ids.has(entry.id)) {
      duplicateIds.push(entry.id);
      errors.push(`Duplicate ID found: ${entry.id}`);
    }
    ids.add(entry.id);

    // Check for missing priority
    if (entry.priority === undefined || entry.priority === null) {
      missingPriorities.push(entry.id);
      warnings.push(`Missing priority for: ${entry.id}`);
    }

    // Check for empty content
    if (!entry.content || entry.content.trim().length === 0) {
      emptyContent.push(entry.id);
      errors.push(`Empty content for: ${entry.id}`);
    }

    // Check for outdated date patterns (YYYY where year is old)
    const currentYear = new Date().getFullYear();
    const yearMatches = entry.content.match(/\b(20\d{2})\b/g);
    if (yearMatches) {
      for (const yearStr of yearMatches) {
        const year = parseInt(yearStr);
        if (year < currentYear - 2) {
          warnings.push(`Possibly outdated date ${year} in: ${entry.id}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalEntries: allKnowledge.length,
      duplicateIds,
      missingPriorities,
      emptyContent,
    },
  };
}

// Run validation if this file is executed directly
if (require.main === module) {
  const result = validateKnowledge();
  console.log('=== KNOWLEDGE VALIDATION RESULTS ===\n');
  console.log(`Total Entries: ${result.stats.totalEntries}`);
  console.log(`Valid: ${result.valid ? '✅ YES' : '❌ NO'}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}\n`);

  if (result.errors.length > 0) {
    console.log('🚨 ERRORS:');
    result.errors.forEach(e => console.log(`  - ${e}`));
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    result.warnings.slice(0, 10).forEach(w => console.log(`  - ${w}`));
    if (result.warnings.length > 10) {
      console.log(`  ... and ${result.warnings.length - 10} more`);
    }
    console.log('');
  }

  process.exit(result.valid ? 0 : 1);
}

export { validateKnowledge };
