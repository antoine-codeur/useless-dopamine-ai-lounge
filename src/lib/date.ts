import { formatISO } from "date-fns";

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function isoNow(): string {
  return formatISO(new Date());
}

export function hoursBetween(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso).getTime();

  if (Number.isNaN(from)) {
    return 0;
  }

  return Math.max(0, Math.floor((to.getTime() - from) / 3_600_000));
}
