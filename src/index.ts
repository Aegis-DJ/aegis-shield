// Aegis Shield — Prompt Injection Detection & Defense
// https://github.com/Aegis-DJ/aegis-shield

export { scan, isSafe, threatScore, criticalScan } from "./scanner/index.js";
export type { ScanResult, Match, ScannerConfig } from "./scanner/index.js";
export { PATTERNS, patternsByCategory, patternsBySeverity } from "./patterns/index.js";
export type { Pattern, Severity, PatternCategory } from "./patterns/index.js";
