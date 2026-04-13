const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export type DayCode = (typeof DOW)[number];

export function utcTimeFromHoursMinutes(hours: number, minutes: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

export function parseDateOnlyUtc(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) throw new Error("invalid_date");
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
}

export function dayCodeFromDateUtc(d: Date): DayCode {
  return DOW[d.getUTCDay()];
}

export function timeToMinutes(t: Date): number {
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}

export function parseHHMM(s: string): { h: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) throw new Error("invalid_time");
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error("invalid_time");
  return { h, m: min };
}

export function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}
