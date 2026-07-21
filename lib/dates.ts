// Pure date helpers operating on YYYY-MM-DD strings. UTC arithmetic is used
// internally so results never shift across timezones.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parts(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("-").map(Number);
  return [y, m, d];
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in the machine's local timezone. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = parts(dateStr);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Monday of the week containing the given date. */
export function mondayOf(dateStr: string): string {
  const [y, m, d] = parts(dateStr);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return addDays(dateStr, -((dow + 6) % 7));
}

/** The 7 dates (Mon–Sun) of the week starting at the given Monday. */
export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function dayOfMonth(dateStr: string): number {
  return parts(dateStr)[2];
}

export function monthShort(dateStr: string): string {
  return MONTHS[parts(dateStr)[1] - 1];
}

/** "Jul 6 – Jul 12, 2026" */
export function rangeLabel(start: string, end: string): string {
  const [sy] = parts(start);
  const [ey] = parts(end);
  const s = `${monthShort(start)} ${dayOfMonth(start)}`;
  const e = `${monthShort(end)} ${dayOfMonth(end)}`;
  return sy === ey ? `${s} – ${e}, ${ey}` : `${s}, ${sy} – ${e}, ${ey}`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayISO();
}
