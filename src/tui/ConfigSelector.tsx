import { Box, Text, useApp, useInput } from "ink";
import type React from "react";
import { useCallback, useState } from "react";
import type { McpConfig } from "../mcp-scanner.js";
import { ConfigPreview } from "./ConfigPreview.js";
import { ErrorDisplay } from "./ErrorDisplay.js";

interface ConfigSelectorProps {
  configs: McpConfig[];
  onSelect: (selectedConfigs: McpConfig[]) => void;
  configDir: string;
}

export const ConfigSelector: React.FC<ConfigSelectorProps> = ({
  configs,
  onSelect,
  configDir,
}) => {
  const { exit } = useApp();
  const validConfigs = configs.filter((config) => config.valid);
  const invalidConfigs = configs.filter((config) => !config.valid);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingPreview, setShowingPreview] = useState(false);
  const [showingInvalidConfigs, setShowingInvalidConfigs] = useState(false);
  const [expandedInvalidConfigs, setExpandedInvalidConfigs] = useState<
    Set<number>
  >(new Set());

  const currentConfig = validConfigs[currentIndex] || null;

  // Handle keyboard input
  useInput(
    (
      input: string,
      key: {
        ctrl?: boolean;
        upArrow?: boolean;
        downArrow?: boolean;
        return?: boolean;
      },
    ) => {
      if (input === "q" || (key.ctrl && input === "c")) {
        exit();
        return;
      }

      if (key.upArrow && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }

      if (key.downArrow && currentIndex < validConfigs.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }

      // Toggle selection with spacebar
      if (input === " ") {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(currentIndex)) {
          newSelection.delete(currentIndex);
        } else {
          newSelection.add(currentIndex);
        }
        setSelectedIndices(newSelection);
      }

      // Select all valid configs with 'a'
      if (input === "a") {
        const allIndices = new Set(validConfigs.map((_, index) => index));
        setSelectedIndices(allIndices);
      }

      // Clear all selections with 'c'
      if (input === "c") {
        setSelectedIndices(new Set());
      }

      // Toggle preview with 'p'
      if (input === "p") {
        setShowingPreview(!showingPreview);
      }

      // Toggle showing invalid configs with 'i'
      if (input === "i") {
        setShowingInvalidConfigs(!showingInvalidConfigs);
      }

      // Toggle error details for invalid configs with 'e' when viewing invalid configs
      if (input === "e" && showingInvalidConfigs && invalidConfigs.length > 0) {
        const newExpanded = new Set(expandedInvalidConfigs);
        if (newExpanded.size === invalidConfigs.length) {
          // If all are expanded, collapse all
          newExpanded.clear();
        } else {
          // Otherwise, expand all
          invalidConfigs.forEach((_, index) => {
            newExpanded.add(index);
          });
        }
        setExpandedInvalidConfigs(newExpanded);
      }

      // Confirm selection with Enter
      if (key.return) {
        const selectedConfigs = Array.from(selectedIndices)
          .map((index) => validConfigs[index])
          .filter((config): config is McpConfig => config !== undefined);
        onSelect(selectedConfigs);
        exit();
      }
    },
  );

  const renderConfigItem = useCallback(
    (config: McpConfig, index: number) => {
      const isSelected = selectedIndices.has(index);
      const isCurrent = index === currentIndex;
      const checkbox = isSelected ? "[x]" : "[ ]";

      return (
        <Box key={config.path}>
          <Text inverse={isCurrent} bold={isCurrent}>
            {checkbox} {config.description}
          </Text>
        </Box>
      );
    },
    [selectedIndices, currentIndex],
  );

  if (validConfigs.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">
          No valid MCP configs found in {configDir || "~/.claude/mcp-configs/"}
        </Text>
        <Text>Press any key to launch Claude Code without configs...</Text>
        {invalidConfigs.length > 0 && invalidConfigs[0] && (
          <ErrorDisplay config={invalidConfigs[0]} expanded />
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Available MCP Configs</Text>
        <Text>
          Use ↑/↓ to navigate, Space to select/deselect, Enter to confirm
        </Text>
        <Text>
          Keys: (a)ll, (c)lear, (p)review
          {invalidConfigs.length > 0 && ", (i)nvalid configs"}, (q)uit
        </Text>
      </Box>

      {/* Main content area */}
      <Box flexGrow={1}>
        {/* Left panel - Config list */}
        <Box flexDirection="column" flexBasis="50%" marginRight={2}>
          <Text bold>Valid Configs ({validConfigs.length}):</Text>
          <Box flexDirection="column" marginTop={1}>
            {validConfigs.map(renderConfigItem)}
          </Box>
        </Box>

        {/* Right panel - Preview */}
        {showingPreview && (
          <Box flexBasis="50%">
            <ConfigPreview config={currentConfig} width={50} height={20} />
          </Box>
        )}
      </Box>

      {/* Show invalid configs if requested - full width */}
      {showingInvalidConfigs && invalidConfigs.length > 0 && (
        <Box flexDirection="column" marginTop={2}>
          <Text bold color="red">
            Invalid Configs ({invalidConfigs.length}):
          </Text>
          <Text>Press 'e' to toggle error details</Text>
          {invalidConfigs.map((config, index) => (
            <ErrorDisplay
              key={config.path}
              config={config}
              expanded={expandedInvalidConfigs.has(index)}
            />
          ))}
        </Box>
      )}

      {/* Footer - Selection summary */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text>
          Selected: {selectedIndices.size} config(s)
          {selectedIndices.size > 0 && (
            <Text color="blue">
              {" "}
              -{" "}
              {Array.from(selectedIndices)
                .map((index) => validConfigs[index]?.name)
                .join(", ")}
            </Text>
          )}
        </Text>
      </Box>
    </Box>
  );
};
