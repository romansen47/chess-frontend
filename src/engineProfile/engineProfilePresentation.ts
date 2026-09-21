import type { UciOptionConfig } from "../engineConfigTypes";

export interface ProfileOptionEditorState {
  name: string;
  option: UciOptionConfig;
  value: string;
}

export function optionHint(
  option: UciOptionConfig,
  labels: {
    defaultLabel: string;
    minLabel: string;
    maxLabel: string;
    emptyLabel: string;
  },
): string {
  const parts: string[] = [];
  if (option.defaultValue !== null) {
    parts.push(
      `${labels.defaultLabel} ${
        option.defaultValue === "" ? labels.emptyLabel : option.defaultValue
      }`,
    );
  }
  if (option.min !== null) parts.push(`${labels.minLabel} ${option.min}`);
  if (option.max !== null) parts.push(`${labels.maxLabel} ${option.max}`);
  return parts.join(" · ");
}

export function displayOptionValue(
  option: UciOptionConfig,
  value: string,
  emptyLabel: string,
): string {
  if (option.type === "check") {
    return value.toLowerCase() === "true" ? "true" : "false";
  }
  return value === "" ? emptyLabel : value;
}
