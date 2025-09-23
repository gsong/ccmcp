import { Text } from "ink";
import type React from "react";

interface StatusIndicatorProps {
  valid: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ valid }) => {
  if (valid) {
    return <Text color="green">✓</Text>;
  }

  return <Text color="red">✗</Text>;
};
