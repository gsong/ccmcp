import type { McpConfig } from "./mcp-scanner.js";

export async function selectConfigs(
  configs: McpConfig[],
): Promise<McpConfig[]> {
  if (configs.length === 0) {
    console.log("No MCP configs found in ~/.claude/mcp-configs/");
    return [];
  }

  console.log("\nAvailable MCP configs:");
  console.log("======================");

  const validConfigs = configs.filter((config) => config.valid);
  const invalidConfigs = configs.filter((config) => !config.valid);

  // Show valid configs
  validConfigs.forEach((config, index) => {
    console.log(`${index + 1}. ${config.name} - ${config.description}`);
  });

  // Show invalid configs
  if (invalidConfigs.length > 0) {
    console.log("\nInvalid configs (cannot be selected):");
    invalidConfigs.forEach((config) => {
      console.log(
        `   ✗ ${config.name} - ${config.description} (${config.error})`,
      );
    });
  }

  if (validConfigs.length === 0) {
    console.log(
      "\nNo valid configs found. Launching Claude Code without MCP configs...",
    );
    return [];
  }

  console.log(
    "\nEnter config numbers to select (comma-separated, e.g., '1,3,5'):",
  );
  console.log("Press Enter with no input to launch without any configs:");
  console.log("Type 'all' to select all valid configs:");

  const input = await readInput("> ");
  const trimmed = input.trim();

  if (trimmed === "" || trimmed.toLowerCase() === "none") {
    return [];
  }

  if (trimmed.toLowerCase() === "all") {
    return validConfigs;
  }

  try {
    const selectedIndexes = trimmed
      .split(",")
      .map((s) => parseInt(s.trim()) - 1)
      .filter((i) => i >= 0 && i < validConfigs.length);

    const uniqueIndexes = [...new Set(selectedIndexes)];
    return uniqueIndexes.map((i) => validConfigs[i]);
  } catch (error) {
    console.log("Invalid input. Launching without configs...");
    return [];
  }
}

function readInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);

    const onData = (data: Buffer) => {
      process.stdin.off("data", onData);
      process.stdin.pause();
      resolve(data.toString().trim());
    };

    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}
