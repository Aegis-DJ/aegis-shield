/**
 * Aegis Shield — Prompt Injection Scanner
 *
 * Scans text for known injection patterns and returns
 * a threat assessment with matched patterns and confidence score.
 */

import { PATTERNS, Pattern, Severity, PatternCategory } from "../patterns/index.js";

// --- Scan Result Types ---

export interface Match {
  pattern: Pattern;
  matched: string;
  index: number;
  line: number;
  context: string; // Surrounding text for review
}

export interface ScanResult {
  clean: boolean;
  score: number;          // 0.0 (safe) to 1.0 (definitely injection)
  severity: Severity;     // Highest severity found
  matches: Match[];
  summary: string;
  stats: {
    patternsChecked: number;
    matchesFound: number;
    categoriesHit: PatternCategory[];
    scanTimeMs: number;
  };
}

// --- Scanner Configuration ---

export interface ScannerConfig {
  /** Minimum severity to report (default: "low") */
  minSeverity?: Severity;
  /** Categories to check (default: all) */
  categories?: PatternCategory[];
  /** Custom patterns to include */
  extraPatterns?: Pattern[];
  /** Maximum context chars around match (default: 80) */
  contextChars?: number;
}

// --- Severity scoring ---

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
  info: 0.1,
};

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

// --- Scanner ---

export function scan(text: string, config: ScannerConfig = {}): ScanResult {
  const start = performance.now();

  const minSeverity = config.minSeverity ?? "low";
  const minIdx = SEVERITY_ORDER.indexOf(minSeverity);
  const contextChars = config.contextChars ?? 80;

  // Build pattern list
  let patterns = [...PATTERNS, ...(config.extraPatterns ?? [])];

  // Filter by severity
  patterns = patterns.filter(
    (p) => SEVERITY_ORDER.indexOf(p.severity) <= minIdx
  );

  // Filter by category
  if (config.categories) {
    const cats = new Set(config.categories);
    patterns = patterns.filter((p) => cats.has(p.category));
  }

  // Run all patterns
  const matches: Match[] = [];

  for (const pattern of patterns) {
    // Reset regex state
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags + (pattern.regex.flags.includes("g") ? "" : "g"));

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const index = match.index;
      const matched = match[0];
      const line = text.slice(0, index).split("\n").length;

      // Extract context
      const ctxStart = Math.max(0, index - contextChars);
      const ctxEnd = Math.min(text.length, index + matched.length + contextChars);
      const context = (ctxStart > 0 ? "..." : "") +
        text.slice(ctxStart, ctxEnd) +
        (ctxEnd < text.length ? "..." : "");

      matches.push({ pattern, matched, index, line, context });

      // Prevent infinite loops on zero-length matches
      if (matched.length === 0) regex.lastIndex++;
    }
  }

  // Compute score
  const score = computeScore(matches);
  const categoriesHit = [...new Set(matches.map((m) => m.pattern.category))];
  const highestSeverity = matches.length > 0
    ? SEVERITY_ORDER[Math.min(...matches.map((m) => SEVERITY_ORDER.indexOf(m.pattern.severity)))]
    : "info";

  const elapsed = performance.now() - start;

  return {
    clean: matches.length === 0,
    score,
    severity: highestSeverity,
    matches,
    summary: buildSummary(matches, score),
    stats: {
      patternsChecked: patterns.length,
      matchesFound: matches.length,
      categoriesHit,
      scanTimeMs: Math.round(elapsed * 100) / 100,
    },
  };
}

function computeScore(matches: Match[]): number {
  if (matches.length === 0) return 0;

  // Weighted sum with diminishing returns per category
  const categoryScores = new Map<PatternCategory, number>();

  for (const match of matches) {
    const cat = match.pattern.category;
    const weight = SEVERITY_WEIGHTS[match.pattern.severity];
    const current = categoryScores.get(cat) ?? 0;
    // Diminishing returns: each additional match in same category adds less
    categoryScores.set(cat, current + weight * (1 / (1 + current)));
  }

  // Sum across categories (multi-category attacks are more dangerous)
  let total = 0;
  for (const score of categoryScores.values()) {
    total += score;
  }

  // Multi-category bonus: hitting 3+ categories is very suspicious
  const categoryCount = categoryScores.size;
  if (categoryCount >= 3) total *= 1.3;
  if (categoryCount >= 5) total *= 1.5;

  // Normalize to 0-1
  return Math.min(1.0, total / 3.0);
}

function buildSummary(matches: Match[], score: number): string {
  if (matches.length === 0) return "✅ No injection patterns detected.";

  const categories = [...new Set(matches.map((m) => m.pattern.category))];
  const criticals = matches.filter((m) => m.pattern.severity === "critical");
  const highs = matches.filter((m) => m.pattern.severity === "high");

  let summary = `⚠️ Detected ${matches.length} injection pattern(s) across ${categories.length} categor${categories.length === 1 ? "y" : "ies"}`;
  summary += ` | Threat score: ${(score * 100).toFixed(0)}%`;

  if (criticals.length > 0) {
    summary += `\n🔴 CRITICAL: ${criticals.map((m) => m.pattern.name).join(", ")}`;
  }
  if (highs.length > 0) {
    summary += `\n🟠 HIGH: ${highs.map((m) => m.pattern.name).join(", ")}`;
  }

  return summary;
}

// --- Convenience functions ---

/** Quick check — returns true if text appears safe */
export function isSafe(text: string, threshold = 0.3): boolean {
  return scan(text).score < threshold;
}

/** Quick check — returns threat score 0.0 to 1.0 */
export function threatScore(text: string): number {
  return scan(text).score;
}

/** Scan and return only critical/high matches */
export function criticalScan(text: string): ScanResult {
  return scan(text, { minSeverity: "high" });
}
