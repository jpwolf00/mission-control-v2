import { computeWeeklySloSummary } from "../src/domain/slo-metrics.js";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Weekly SLO Report Generator
 * Reads mock events and outputs summary report
 */

interface ReportConfig {
  inputPath: string;
  outputPath: string;
  weekEnding?: string;
}

async function generateWeeklySloReport(config: ReportConfig): Promise<void> {
  const { inputPath, outputPath, weekEnding } = config;

  // Read events
  const eventsData = await fs.readFile(inputPath, "utf-8");
  const events = JSON.parse(eventsData);

  // Compute summary
  const summary = computeWeeklySloSummary(events);

  // Build report
  const report = {
    generatedAt: new Date().toISOString(),
    weekEnding: weekEnding || getWeekEnding(),
    summary,
    recommendations: generateRecommendations(summary),
  };

  // Write output
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

  console.log(`Weekly SLO report generated: ${outputPath}`);
  console.log(`SLO Compliance: ${summary.compliance ? "PASS" : "FAIL"}`);
  console.log(`Total Transitions: ${summary.totalTransitions}`);
  console.log(`Success Rate: ${(summary.successRate * 100).toFixed(2)}%`);
}

function getWeekEnding(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);
  return sunday.toISOString().split("T")[0];
}

function generateRecommendations(summary: any): string[] {
  const recommendations: string[] = [];

  if (summary.stallRate > 0.1) {
    recommendations.push("High stall rate detected. Review agent timeout configuration and session lifecycle.");
  }

  if (summary.successRate < 0.95) {
    recommendations.push("Success rate below 95%. Investigate gate failure patterns and evidence quality.");
  }

  if (summary.dispatchConflictRate > 0.05) {
    recommendations.push("Dispatch conflicts elevated. Consider rate limiting review or lock timeout adjustments.");
  }

  if (summary.p95Latency > 300000) {
    recommendations.push("P95 latency exceeds 5 minutes. Review implementer agent performance and model selection.");
  }

  return recommendations;
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const inputPath = process.argv[2] || "./data/mock-events-weekly.json";
  const outputPath = process.argv[3] || "./dist/weekly-slo-report.json";

  generateWeeklySloReport({ inputPath, outputPath })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Report generation failed:", err);
      process.exit(1);
    });
}

export { generateWeeklySloReport };
