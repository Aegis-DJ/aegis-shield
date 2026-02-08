#!/usr/bin/env node

/**
 * Aegis Shield CLI — Scan text for prompt injection attacks
 *
 * Usage:
 *   echo "some text" | aegis-shield
 *   aegis-shield --file input.txt
 *   aegis-shield --text "ignore previous instructions"
 */

import { readFileSync } from "fs";
import { scan } from "./scanner/index.js";

function main() {
  const args = process.argv.slice(2);
  let text = "";

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
aegis-shield — Prompt Injection Scanner 🛡️

Usage:
  echo "text" | aegis-shield          Scan from stdin
  aegis-shield --text "..."           Scan inline text
  aegis-shield --file path.txt        Scan a file
  aegis-shield --json                 Output as JSON

Options:
  --text <string>   Text to scan
  --file <path>     File to scan
  --json            JSON output
  --verbose         Show match details
  --help            Show this help
`);
    process.exit(0);
  }

  const jsonOutput = args.includes("--json");
  const verbose = args.includes("--verbose") || args.includes("-v");

  // Get text from args or stdin
  const textIdx = args.indexOf("--text");
  const fileIdx = args.indexOf("--file");

  if (textIdx >= 0 && args[textIdx + 1]) {
    text = args[textIdx + 1];
  } else if (fileIdx >= 0 && args[fileIdx + 1]) {
    text = readFileSync(args[fileIdx + 1], "utf-8");
  } else if (!process.stdin.isTTY) {
    text = readFileSync("/dev/stdin", "utf-8");
  } else {
    console.error("Error: Provide text via --text, --file, or stdin");
    process.exit(1);
  }

  const result = scan(text);

  if (jsonOutput) {
    console.log(JSON.stringify({
      clean: result.clean,
      score: result.score,
      severity: result.severity,
      matchCount: result.matches.length,
      matches: result.matches.map((m) => ({
        id: m.pattern.id,
        name: m.pattern.name,
        category: m.pattern.category,
        severity: m.pattern.severity,
        line: m.line,
        matched: m.matched,
      })),
      stats: result.stats,
    }, null, 2));
  } else {
    console.log("\n🛡️  Aegis Shield — Scan Report\n");
    console.log(`Text length: ${text.length} chars`);
    console.log(`Patterns checked: ${result.stats.patternsChecked}`);
    console.log(`Scan time: ${result.stats.scanTimeMs}ms`);
    console.log(`\n${result.summary}\n`);

    if (verbose && result.matches.length > 0) {
      console.log("─".repeat(60));
      for (const match of result.matches) {
        console.log(`\n[${match.pattern.severity.toUpperCase()}] ${match.pattern.id}: ${match.pattern.name}`);
        console.log(`  Category: ${match.pattern.category}`);
        console.log(`  Line ${match.line}: "${match.matched}"`);
        console.log(`  Context: ${match.context}`);
        console.log(`  ${match.pattern.description}`);
      }
      console.log("\n" + "─".repeat(60));
    }

    // Exit code: 0 = clean, 1 = threats found
    process.exit(result.clean ? 0 : 1);
  }
}

main();
