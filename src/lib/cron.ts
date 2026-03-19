// Simple cron expression parser and next-run calculator
// Supports: minute hour day-of-month month day-of-week

interface CronFields {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

function parseField(field: string, min: number, max: number): number[] | null {
  if (field === "*") return Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // Handle */n
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2));
    if (isNaN(step) || step <= 0) return null;
    return Array.from({ length: Math.ceil((max - min + 1) / step) }, (_, i) => min + i * step);
  }

  // Handle comma-separated values
  const values = field.split(",").map((v) => {
    // Handle ranges like 1-5
    if (v.includes("-")) {
      const [start, end] = v.split("-").map(Number);
      if (isNaN(start) || isNaN(end)) return null;
      return Array.from({ length: end - start + 1 }, (_, i) => i + start);
    }
    const num = parseInt(v);
    if (isNaN(num) || num < min || num > max) return null;
    return [num];
  });

  if (values.some((v) => v === null)) return null;
  return values.flat() as number[];
}

export function parseCron(expression: string): CronFields | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const minute = parseField(parts[0], 0, 59);
  const hour = parseField(parts[1], 0, 23);
  const dayOfMonth = parseField(parts[2], 1, 31);
  const month = parseField(parts[3], 1, 12);
  const dayOfWeek = parseField(parts[4], 0, 6);

  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) return null;

  return { minute, hour, dayOfMonth, month, dayOfWeek };
}

export function getNextRun(expression: string): Date | null {
  const fields = parseCron(expression);
  if (!fields) return null;

  const now = new Date();
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // Search up to 366 days ahead
  for (let i = 0; i < 527040; i++) {
    if (
      fields.month.includes(candidate.getMonth() + 1) &&
      fields.dayOfMonth.includes(candidate.getDate()) &&
      fields.dayOfWeek.includes(candidate.getDay()) &&
      fields.hour.includes(candidate.getHours()) &&
      fields.minute.includes(candidate.getMinutes())
    ) {
      return candidate;
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
}

export function describeCron(expression: string): string {
  const presets: Record<string, string> = {
    "0 * * * *": "Every hour",
    "0 0 * * *": "Daily at midnight",
    "0 9 * * *": "Daily at 9:00 AM",
    "0 9 * * 1-5": "Weekdays at 9:00 AM",
    "*/15 * * * *": "Every 15 minutes",
    "*/30 * * * *": "Every 30 minutes",
    "0 0 * * 0": "Weekly on Sunday",
    "0 0 1 * *": "Monthly on the 1st",
  };

  return presets[expression] || expression;
}
