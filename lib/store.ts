import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import { seedDB } from "./seed";
import { fetchSheetParticipants } from "./sheet";
import type { DB } from "./types";

const KEY = "challenge:db";
const FILE = path.join(process.cwd(), ".data", "db.json");

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

async function loadStored(): Promise<DB> {
  const r = redis();
  if (r) {
    const db = await r.get<DB>(KEY);
    if (db) return db;
    const seeded = seedDB();
    await r.set(KEY, seeded);
    return seeded;
  }
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as DB;
  } catch {
    const seeded = seedDB();
    // 저장소 미설정(Vercel 등)이어도 열람은 되도록 저장 실패는 무시. 쓰기 시에만 오류
    await saveDB(seeded).catch(() => {});
    return seeded;
  }
}

export async function saveDB(db: DB) {
  const r = redis();
  if (r) {
    await r.set(KEY, db);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("저장소가 설정되지 않았습니다. Vercel에 Upstash Redis를 연결하세요.");
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2), "utf8");
}

/** 예전 데이터(p1, p2 … id)를 이름 id로 이전 */
function migrate(db: DB) {
  const rename = new Map(db.participants.filter((p) => p.id !== p.name).map((p) => [p.id, p.name]));
  if (!rename.size) return false;
  for (const p of db.participants) p.id = p.name;
  for (const l of db.logs) l.participantId = rename.get(l.participantId) ?? l.participantId;
  return true;
}

export interface Loaded {
  db: DB;
  sheetError: string | null; // 시트를 못 읽어 마지막 저장본을 쓰는 경우
}

/** 저장소 + 구글 시트(참가자 정보). 참가자는 항상 시트가 원본 */
export async function loadWithStatus(): Promise<Loaded> {
  const db = await loadStored();
  let changed = migrate(db);
  let sheetError: string | null = null;
  try {
    const participants = await fetchSheetParticipants();
    if (JSON.stringify(participants) !== JSON.stringify(db.participants)) {
      db.participants = participants; // 시트 장애 대비 마지막 정상본 보관
      changed = true;
    }
  } catch (e) {
    sheetError = e instanceof Error ? e.message : "시트 읽기 실패";
  }
  if (changed) await saveDB(db).catch(() => {});
  return { db, sheetError };
}

export async function loadDB(): Promise<DB> {
  return (await loadWithStatus()).db;
}

/** 읽고-수정-저장. 관리자 1명이 쓰는 구조라 낙관적 잠금은 생략 */
export async function updateDB(fn: (db: DB) => void) {
  const { db } = await loadWithStatus();
  fn(db);
  await saveDB(db);
  return db;
}
