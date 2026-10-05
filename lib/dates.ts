const DAY = 86_400_000;

/** 한국시간 기준 오늘 (YYYY-MM-DD) */
export function todayKST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function toUTC(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd);
}

/** a → b 일수 차 (b - a) */
export function diffDays(a: string, b: string) {
  return Math.round((toUTC(b) - toUTC(a)) / DAY);
}

export function addDays(d: string, n: number) {
  return new Date(toUTC(d) + n * DAY).toISOString().slice(0, 10);
}

export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let i = 0, n = diffDays(start, end); i <= n; i++) out.push(addDays(start, i));
  return out;
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDate(d: string) {
  const [, m, dd] = d.split("-").map(Number);
  const w = WEEKDAY[new Date(toUTC(d)).getUTCDay()];
  return `${m}/${dd} (${w})`;
}
