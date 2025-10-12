import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function getPackageVersion(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, "../package.json"), "utf8"),
  );
  return packageJson.version;
}

export function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function formatConfigDisplayName(
  filename: string,
  serverNames: string[],
): string {
  // Remove .json extension from filename for display
  const baseFilename = filename.replace(/\.json$/i, "");

  if (serverNames.length === 0) {
    return baseFilename;
  }

  if (serverNames.length === 1 && serverNames[0] === baseFilename) {
    // Single server matching filename - show only server name
    return serverNames[0];
  }

  if (serverNames.length === 1) {
    // Single server not matching filename - show filename → server-name
    return `${baseFilename} → ${serverNames[0]}`;
  }

  // Multiple servers - show filename → server1, server2, ...
  return `${baseFilename} → ${serverNames.join(", ")}`;
}
