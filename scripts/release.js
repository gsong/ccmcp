#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

/**
 * Execute a command with proper error handling
 */
function exec(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    const result = execSync(command, {
      encoding: "utf8",
      cwd: projectRoot,
      stdio: ["inherit", "pipe", "pipe"],
    });
    console.log(`✅ ${description} completed`);
    return result;
  } catch (error) {
    console.error(`❌ Failed: ${description}`);
    console.error(`Command: ${command}`);
    console.error(`Error: ${error.message}`);
    if (error.stdout) console.error(`Stdout: ${error.stdout}`);
    if (error.stderr) console.error(`Stderr: ${error.stderr}`);
    process.exit(1);
  }
}

/**
 * Check if working directory is clean
 */
function validateWorkingDirectory() {
  console.log("🔍 Checking working directory status...");
  try {
    const status = execSync("git status --porcelain", {
      encoding: "utf8",
      cwd: projectRoot,
    });

    if (status.trim()) {
      console.error(
        "❌ Working directory is not clean. Please commit or stash changes first.",
      );
      console.error("Uncommitted changes:");
      console.error(status);
      process.exit(1);
    }
    console.log("✅ Working directory is clean");
  } catch (error) {
    console.error("❌ Failed to check git status:", error.message);
    process.exit(1);
  }
}

/**
 * Validate version type
 */
function validateVersionType(versionType) {
  const validTypes = ["patch", "minor", "major"];
  if (!validTypes.includes(versionType)) {
    console.error(`❌ Invalid version type: ${versionType}`);
    console.error(`Valid types: ${validTypes.join(", ")}`);
    process.exit(1);
  }
}

/**
 * Get the new version after bumping
 */
function getNewVersion(versionType) {
  console.log(`🔄 Calculating new ${versionType} version...`);
  try {
    const result = execSync(
      `pnpm version ${versionType} --no-git-tag-version`,
      {
        encoding: "utf8",
        cwd: projectRoot,
      },
    );
    const newVersion = result.trim();
    console.log(`✅ New version will be: ${newVersion}`);
    return newVersion;
  } catch (error) {
    console.error(`❌ Failed to calculate new version:`, error.message);
    process.exit(1);
  }
}

/**
 * Show confirmation prompt
 */
function confirmRelease(versionType, newVersion) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 RELEASE CONFIRMATION`);
  console.log("=".repeat(60));
  console.log(`Version type: ${versionType}`);
  console.log(`New version: ${newVersion}`);
  console.log(`Repository: ${getRepoInfo()}`);
  console.log("\nThis will:");
  console.log("  1. Generate release notes");
  console.log("  2. Commit version bump");
  console.log("  3. Create and push git tag (triggers CI publish to npm)");
  console.log("  4. Create GitHub release");
  console.log("  5. Clean up temporary files");
  console.log("=".repeat(60));

  // In a real interactive environment, you'd want to prompt for confirmation
  // For now, we'll proceed automatically but this structure allows for easy addition
  console.log("🔄 Proceeding with release...\n");
}

/**
 * Get repository information
 */
function getRepoInfo() {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(projectRoot, "package.json"), "utf8"),
    );
    return packageJson.repository?.url || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Run the complete release process
 */
function runRelease(versionType, newVersion) {
  console.log(
    `🚀 Starting ${versionType} release process for ${newVersion}...\n`,
  );

  // Step 1: Generate release notes
  exec(
    `pnpm run _release:generate-notes ${newVersion}`,
    "Generating release notes",
  );

  // Step 2: Stage all changes
  exec("git add .", "Staging changes");

  // Step 3: Commit changes
  exec(
    `git commit -m "chore: release ${newVersion}"`,
    "Committing release changes",
  );

  // Step 4: Create annotated tag with release notes
  exec(
    `git tag -a "${newVersion}" -F .tmp-tag-notes.txt`,
    "Creating git tag with release notes",
  );

  // Step 5: Push changes and tags
  exec("git push --follow-tags", "Pushing changes and tags to remote");

  // Step 6: Create GitHub release (before cleaning up temp files)
  exec(
    `gh release create "${newVersion}" --title "${newVersion}" --notes-file .tmp-tag-notes.txt`,
    "Creating GitHub release",
  );

  // Step 7: Clean up temporary files (after GitHub release)
  exec("pnpm run _release:clean-files", "Cleaning up temporary files");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎉 Release ${newVersion} completed successfully!`);
  console.log("=".repeat(60));
  console.log(`✅ Version ${newVersion} has been:`);
  console.log("   • Committed and tagged in git");
  console.log("   • Pushed to remote repository");
  console.log("   • Release notes generated and added to CHANGELOG.md");
  console.log("   • GitHub release created");
  console.log("   • GitHub Actions will build and publish to npm");
  console.log("=".repeat(60));
}

/**
 * Main function
 */
function main() {
  const versionType = process.argv[2];

  if (!versionType) {
    console.error("❌ Version type is required");
    console.error("Usage: node scripts/release.js <patch|minor|major>");
    console.error("\nExamples:");
    console.error("  node scripts/release.js patch   # 1.0.0 → 1.0.1");
    console.error("  node scripts/release.js minor   # 1.0.0 → 1.1.0");
    console.error("  node scripts/release.js major   # 1.0.0 → 2.0.0");
    process.exit(1);
  }

  validateVersionType(versionType);
  validateWorkingDirectory();

  const newVersion = getNewVersion(versionType);
  confirmRelease(versionType, newVersion);
  runRelease(versionType, newVersion);
}

main();
