import "server-only";
import type { Goal, Participant } from "./types";

export const SHEET_ID = process.env.SHEET_ID ?? "1B4QzQ9y2sXeo_lew00-5Cb8ZIhhdh3USyTfJB_t8jSc";
export const SHEET_GID = process.env.SHEET_GID ?? "0"; // 「참가자 정보」 탭
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${SHEET_GID}`;
export const SHEET_TAG = "sheet-participants";

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

/** 시트 CSV를 읽음. 60초 캐시, 관리 화면에서 즉시 새로고침 가능 */
export async function fetchSheetParticipants(): Promise<Participant[]> {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`,
    { next: { revalidate: 60, tags: [SHEET_TAG] } },
  );
  if (!res.ok) throw new Error(`시트 읽기 실패 (HTTP ${res.status})`);
  return parseParticipants(await res.text());
}
