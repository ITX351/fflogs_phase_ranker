export function getLogColor(logs: number) {
  if (logs >= 99.5) return "#e5cc80";
  if (logs >= 98.5) return "#e268a8";
  if (logs >= 94.5) return "#ff8000";
  if (logs >= 74.5) return "#a335ee";
  if (logs >= 49.5) return "#0070ff";
  if (logs >= 24.5) return "#1eff00";
  return "#666";
}