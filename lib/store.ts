import "server-only";
import { seedDB } from "./seed";
import { fetchSheetLogs, fetchSheetParticipants, fetchSheetSettings } from "./sheet";
import type { DB } from "./types";

// 모든 데이터의 원본은 구글 시트. 시트를 못 읽을 때를 대비해 마지막 정상값을 메모리에 보관
let lastGood: DB = seedDB();

export interface Loaded {
  db: DB;
  sheetError: string | null; // 일부를 못 읽어 마지막 정상값을 쓰는 경우
}

export async function loadWithStatus(): Promise<Loaded> {
  const [participants, logs, settings] = await Promise.allSettled([
    fetchSheetParticipants(),
    fetchSheetLogs(),
    fetchSheetSettings(),
  ]);
  const errors: string[] = [];
  const pick = <T,>(r: PromiseSettledResult<T>, fallback: T, label: string) => {
    if (r.status === "fulfilled") return r.value;
    errors.push(`${label}: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
    return fallback;
  };

  const db: DB = {
    version: 1,
    participants: pick(participants, lastGood.participants, "참가자 정보"),
    logs: pick(logs, lastGood.logs, "진행성적"),
    // 「앱설정」 탭이 없으면 기본값
    settings: { ...seedDB().settings, ...(pick(settings, lastGood.settings, "앱설정") ?? {}) },
  };
  if (!errors.length) lastGood = db;
  return { db, sheetError: errors.length ? errors.join(" / ") : null };
}

export async function loadDB(): Promise<DB> {
  return (await loadWithStatus()).db;
}
