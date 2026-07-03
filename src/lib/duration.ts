/**
 * Human duration with cascading units: milliseconds fold into seconds,
 * seconds into minutes, minutes into hours, hours into days.
 * (Hours and days should realistically never show — but they degrade nicely.)
 */
export function formatDuration(ms: number): string {
  const seconds = ms / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);

  if (minutes < 60) {
    return `${minutes}m ${String(totalSeconds % 60).padStart(2, "0")}s`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
