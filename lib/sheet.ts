import "server-only";
import type { Goal, LogEntry, Participant, Settings } from "./types";

export const SHEET_ID = process.env.SHEET_ID ?? "1B4QzQ9y2sXeo_lew00-5Cb8ZIhhdh3USyTfJB_t8jSc";
export const SHEET_GID = process.env.SHEET_GID ?? "0"; // 「참가자 정보」 탭
export const SHEET_LOG_GID = process.env.SHEET_LOG_GID ?? "1065201099"; // 「진행성적」 탭
export const SETTINGS_SHEET = "앱설정";
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${SHEET_GID}`;
export const SHEET_LOG_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${SHEET_LOG_GID}`;
export const SHEET_TAG = "sheet";

/** 따옴표·쉼표·줄바꿈을 처리하는 최소 CSV 파서 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows;
}

const kg = (s: string | undefined) => {
  const n = parseFloat(String(s ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** 「참가자,목표 구분,…」 헤더 아래부터 「합계」 전까지가 참가자 행. id는 이름 */
export function parseParticipants(csv: string): Participant[] {
  const rows = parseCSV(csv);
  const head = rows.findIndex((r) => r[0]?.trim() === "참가자");
  if (head < 0) throw new Error("시트에서 「참가자」 헤더를 찾지 못했습니다.");
  const out: Participant[] = [];
  for (const r of rows.slice(head + 1)) {
    const name = r[0]?.trim();
    if (!name) continue;
    if (name.startsWith("합계")) break;
    if (out.some((p) => p.id === name)) continue;
    out.push({
      id: name,
      name,
      goal: (r[1]?.includes("벌크") ? "bulk" : "cut") as Goal,
      startWeight: kg(r[2]),
      startMuscle: kg(r[3]),
      finalWeight: kg(r[4]),
      finalMuscle: kg(r[5]),
    });
  }
  return out;
}

/** 2026-10-06, 2026. 10. 6, 2026/10/6 → 2026-10-06 */
function normDate(s: string) {
  const m = s.trim().match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
}

/** 「인증 일자」 헤더 아래 A~G열: 일자, 참가자, 운동, 식단1, 식단2, 패널티, 메모 */
export function parseLogs(csv: string): LogEntry[] {
  const rows = parseCSV(csv);
  const head = rows.findIndex((r) => r[0]?.trim() === "인증 일자");
  if (head < 0) throw new Error("시트에서 「인증 일자」 헤더를 찾지 못했습니다.");
  const out: LogEntry[] = [];
  for (const r of rows.slice(head + 1)) {
    const date = normDate(r[0] ?? "");
    const name = r[1]?.trim();
    if (!date || !name) continue;
    out.push({
      date,
      participantId: name,
      workout: r[2]?.trim() === "완료",
      meal1: r[3]?.trim() === "완료",
      meal2: r[4]?.trim() === "완료",
      penalty: Math.abs(kg(r[5]) ?? 0),
      memo: r[6]?.trim() ?? "",
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** 「앱설정」 탭(key,value). 탭이 없으면 구글이 첫 탭을 돌려주므로 헤더로 판별 */
export function parseSettings(csv: string): Partial<Settings> | null {
  const rows = parseCSV(csv);
  if (rows[0]?.[0]?.trim() !== "key") return null;
  const kv = Object.fromEntries(rows.slice(1).map((r) => [r[0]?.trim(), r[1]?.trim() ?? ""]));
  const s: Partial<Settings> = {};
  if (kv.title) s.title = kv.title;
  for (const k of ["startDate", "endDate", "inbodyDate"] as const) {
    const d = normDate(kv[k] ?? "");
    if (d) s[k] = d;
  }
  for (const k of ["daysPerWeek", "targetCount"] as const) {
    const n = Number(kv[k]);
    if (n > 0) s[k] = n;
  }
  return s;
}

async function fetchCSV(url: string) {
  const res = await fetch(url, { next: { revalidate: 60, tags: [SHEET_TAG] } });
  if (!res.ok) throw new Error(`시트 읽기 실패 (HTTP ${res.status})`);
  return res.text();
}

const exportURL = (gid: string) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;

export async function fetchSheetParticipants() {
  return parseParticipants(await fetchCSV(exportURL(SHEET_GID)));
}

export async function fetchSheetLogs() {
  return parseLogs(await fetchCSV(exportURL(SHEET_LOG_GID)));
}

export async function fetchSheetSettings() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SETTINGS_SHEET)}`;
  return parseSettings(await fetchCSV(url));
}

/** Apps Script 웹앱으로 쓰기 (google-apps-script/Code.gs) */
export async function postToSheet(action: string, payload: Record<string, unknown>) {
  const url = process.env.SHEET_WEBAPP_URL;
  const secret = process.env.SHEET_WEBAPP_SECRET;
  if (!url || !secret) throw new Error("시트 쓰기 설정이 없습니다. SHEET_WEBAPP_URL / SHEET_WEBAPP_SECRET 환경변수를 확인하세요.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret, action, ...payload }),
    cache: "no-store",
  });
  const text = await res.text();
  let data: { ok?: boolean; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`시트 저장 실패 (HTTP ${res.status}). Apps Script 배포 설정(액세스: 모든 사용자)을 확인하세요.`);
  }
  if (!data.ok) throw new Error(`시트 저장 실패: ${data.error ?? "알 수 없는 오류"}`);
}
