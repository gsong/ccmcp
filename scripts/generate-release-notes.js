#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

/**
 * Get git commits since the last tag
 */
function getCommitsSinceLastTag() {
  try {
    // Get the last tag
    const lastTag = execSync(
      'git describe --tags --abbrev=0 2>/dev/null || echo ""',
      {
        encoding: "utf8",
        cwd: projectRoot,
      },
    ).trim();

    // Get commits since last tag (or all commits if no tags exist)
    const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
    const commits = execSync(`git log ${range} --oneline --no-merges`, {
      encoding: "utf8",
      cwd: projectRoot,
    }).trim();

    return { lastTag, commits };
  } catch (error) {
    console.error("Error getting git commits:", error.message);
    return { lastTag: "", commits: "" };
  }
}

/**
 * Parse conventional commits into categories
 */
function parseCommits(commitString) {
  if (!commitString) return {};

  const commits = commitString.split("\n").filter((line) => line.trim());
  const categories = {
    features: [],
    fixes: [],
    breaking: [],
    improvements: [],
    other: [],
  };

  commits.forEach((commit) => {
    const match = commit.match(/^[a-f0-9]+\s+(.+)$/);
    if (!match) return;

    const message = match[1];

    if (
      message.includes("BREAKING CHANGE") ||
      message.startsWith("feat!") ||
      message.startsWith("fix!")
    ) {
      categories.breaking.push(message);
    } else if (message.startsWith("feat:") || message.startsWith("feat(")) {
      categories.features.push(message);
    } else if (message.startsWith("fix:") || message.startsWith("fix(")) {
      categories.fixes.push(message);
    } else if (
      message.startsWith("perf:") ||
      message.startsWith("refactor:") ||
      message.startsWith("style:")
    ) {
      categories.improvements.push(message);
    } else {
      categories.other.push(message);
    }
  });

  return categories;
}

/**
 * Generate release notes using Claude CLI
 */
async function generateReleaseNotes(categories, _lastTag, newVersion) {
  const commitSummary = Object.entries(categories)
    .filter(([_, commits]) => commits.length > 0)
    .map(
      ([category, commits]) =>
        `${category.toUpperCase()}:\n${commits.map((c) => `- ${c}`).join("\n")}`,
    )
    .join("\n\n");

  if (!commitSummary) {
    return `## [${newVersion}] - ${new Date().toISOString().split("T")[0]}\n\nNo significant changes in this release.`;
  }

  const prompt = `Generate professional release notes for version ${newVersion} based on these conventional commits:

${commitSummary}

Requirements:
- Use markdown format with ## [${newVersion}] - ${new Date().toISOString().split("T")[0]} as header
- Group changes into logical sections (Features, Bug Fixes, Improvements, Breaking Changes)
- Write user-focused descriptions that explain the value/impact
- Keep descriptions concise but informative
- Use bullet points for individual changes
- If there are breaking changes, highlight them prominently
- Focus on what users will experience, not implementation details

Example format:
## [1.2.0] - 2024-03-15

### 🚀 Features
- **New Feature**: Description of what users can now do

### 🐛 Bug Fixes
- **Issue Fixed**: How this improves the user experience

### ⚡ Improvements
- **Performance**: What got better for users

### ⚠️ Breaking Changes
- **Important**: What users need to know/do`;

  try {
    // Write prompt to temporary file
    const tempFile = join(projectRoot, ".tmp-release-prompt.txt");
    writeFileSync(tempFile, prompt);

    // Call Claude CLI
    const claudeOutput = execSync(`claude < "${tempFile}"`, {
      encoding: "utf8",
      cwd: projectRoot,
    });

    // Clean up temp file
    execSync(`rm -f "${tempFile}"`, { cwd: projectRoot });

    return claudeOutput.trim();
  } catch (error) {
    console.error("Error calling Claude CLI:", error.message);

    // Fallback to basic formatting
    return generateBasicReleaseNotes(categories, newVersion);
  }
}

/**
 * Fallback basic release notes generator
 */
function generateBasicReleaseNotes(categories, newVersion) {
  const date = new Date().toISOString().split("T")[0];
  let notes = `## [${newVersion}] - ${date}\n\n`;

  if (categories.breaking.length > 0) {
    notes += `### ⚠️ Breaking Changes\n${categories.breaking.map((c) => `- ${c.replace(/^[^:]+:\s*/, "")}`).join("\n")}\n\n`;
  }

  if (categories.features.length > 0) {
    notes += `### 🚀 Features\n${categories.features.map((c) => `- ${c.replace(/^feat[^:]*:\s*/, "")}`).join("\n")}\n\n`;
  }

  if (categories.fixes.length > 0) {
    notes += `### 🐛 Bug Fixes\n${categories.fixes.map((c) => `- ${c.replace(/^fix[^:]*:\s*/, "")}`).join("\n")}\n\n`;
  }

  if (categories.improvements.length > 0) {
    notes += `### ⚡ Improvements\n${categories.improvements.map((c) => `- ${c.replace(/^[^:]+:\s*/, "")}`).join("\n")}\n\n`;
  }

  if (categories.other.length > 0) {
    notes += `### 📝 Other Changes\n${categories.other.map((c) => `- ${c}`).join("\n")}\n\n`;
  }

  return notes.trim();
}

/**
 * Update CHANGELOG.md
 */
function updateChangelog(releaseNotes) {
  const changelogPath = join(projectRoot, "CHANGELOG.md");
  let changelog = "";

  if (existsSync(changelogPath)) {
    changelog = readFileSync(changelogPath, "utf8");
  } else {
    changelog =
      "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n";
  }

  // Insert new release notes after the header
  const lines = changelog.split("\n");
  const headerEnd = lines.findIndex(
    (line) => line.trim() && !line.startsWith("#"),
  );

  if (headerEnd > 0) {
    lines.splice(headerEnd, 0, releaseNotes, "");
  } else {
    lines.push("", releaseNotes);
  }

  writeFileSync(changelogPath, lines.join("\n"));
  console.log("✅ Updated CHANGELOG.md");
}

/**
 * Main function
 */
async function main() {
  const newVersion = process.argv[2];
  if (!newVersion) {
    console.error("Usage: node generate-release-notes.js <version>");
    process.exit(1);
  }

  console.log(`🔍 Generating release notes for version ${newVersion}...`);

  const { lastTag, commits } = getCommitsSinceLastTag();
  console.log(
    `📋 Found ${commits.split("\n").filter((l) => l.trim()).length} commits since ${lastTag || "project start"}`,
  );

  const categories = parseCommits(commits);
  const releaseNotes = await generateReleaseNotes(
    categories,
    lastTag,
    newVersion,
  );

  updateChangelog(releaseNotes);

  // Output release notes for use in git tag
  console.log("\n📝 Generated release notes:");
  console.log("=".repeat(50));
  console.log(releaseNotes);
  console.log("=".repeat(50));

  // Save release notes to temp file for git tag
  const tagNotesPath = join(projectRoot, ".tmp-tag-notes.txt");
  writeFileSync(tagNotesPath, releaseNotes);
  console.log(`💾 Release notes saved to ${tagNotesPath} for git tagging`);
}

main().catch(console.error);
