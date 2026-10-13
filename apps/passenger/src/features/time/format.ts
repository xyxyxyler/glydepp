/**
 * Africa/Accra date formatting. Accra is UTC+0 all year (no DST), so UTC fields are exact —
 * no Intl time-zone support needed on device.
 */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Tue 14 Oct" */
export function formatAccraDate(ms: number): string {
  const d = new Date(ms);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Day key for grouping: "2026-10-14". */
export const accraDayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** "Today" / "Yesterday" / "Tue 14 Oct". */
export function relativeDayLabel(ms: number, now = Date.now()): string {
  const day = accraDayKey(ms);
  if (day === accraDayKey(now)) return 'Today';
  if (day === accraDayKey(now - 86_400_000)) return 'Yesterday';
  return formatAccraDate(ms);
}
