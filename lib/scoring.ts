import { diffDays } from "./dates";
import type { DB, LogEntry, Participant, Settings } from "./types";

export const ITEMS_PER_DAY = 3; // 운동 1 + 식단 2

const r1 = (n: number) => Math.round(n * 10) / 10;

export interface InbodyScore {
  weightDelta: number | null;
  muscleDelta: number | null;
  weightScore: number | null;
  muscleScore: number | null;
  total: number;
}

/** 체중 변화 1kg당 1점 (컷팅은 감량, 벌크는 증량 방향), 골격근 증량 1kg당 2점 */
export function inbodyScore(p: Participant): InbodyScore {
  const weightDelta =
    p.startWeight != null && p.finalWeight != null ? r1(p.finalWeight - p.startWeight) : null;
  const muscleDelta =
    p.startMuscle != null && p.finalMuscle != null ? r1(p.finalMuscle - p.startMuscle) : null;
  const weightScore = weightDelta == null ? null : r1(p.goal === "cut" ? -weightDelta : weightDelta);
  const muscleScore = muscleDelta == null ? null : r1(muscleDelta * 2);
  return { weightDelta, muscleDelta, weightScore, muscleScore, total: r1((weightScore ?? 0) + (muscleScore ?? 0)) };
}

/** 오늘까지 경과한 챌린지 일수 (시작 전 0, 종료 후 전체 일수) */
export function elapsedDays(s: Settings, today: string) {
  const total = diffDays(s.startDate, s.endDate) + 1;
  return Math.min(Math.max(diffDays(s.startDate, today) + 1, 0), total);
}

export function totalDays(s: Settings) {
  return diffDays(s.startDate, s.endDate) + 1;
}

/** 오늘까지 채워야 할 인증 건수: 경과일 × (주 n회 / 7) × 3 */
export function expectedItems(s: Settings, today: string) {
  const days = elapsedDays(s, today);
  if (days === 0) return 0;
  return Math.max(1, Math.round((days * s.daysPerWeek) / 7)) * ITEMS_PER_DAY;
}

export function itemCount(l: LogEntry) {
  return Number(l.workout) + Number(l.meal1) + Number(l.meal2);
}

export type Status = "대기 중" | "진행 중" | "종료";

export interface RoutineScore {
  workouts: number;
  meals: number;
  certs: number;
  penalty: number;
  score: number;
  rate: number; // 0~1
  status: Status;
}

export function routineScore(pid: string, logs: LogEntry[], s: Settings, today: string): RoutineScore {
  let workouts = 0, meals = 0, penalty = 0;
  for (const l of logs) {
    if (l.participantId !== pid) continue;
    workouts += Number(l.workout);
    meals += Number(l.meal1) + Number(l.meal2);
    penalty += l.penalty;
  }
  const certs = workouts + meals;
  const expected = expectedItems(s, today);
  const status: Status = today > s.endDate ? "종료" : certs > 0 ? "진행 중" : "대기 중";
  return {
    workouts,
    meals,
    certs,
    penalty,
    score: r1(certs - penalty),
    rate: expected ? Math.min(certs / expected, 1) : 0,
    status,
  };
}

export interface Standing {
  participant: Participant;
  inbody: InbodyScore;
  routine: RoutineScore;
  total: number;
  rank: number;
}

export function standings(db: DB, today: string): Standing[] {
  const rows = db.participants.map((p) => {
    const inbody = inbodyScore(p);
    const routine = routineScore(p.id, db.logs, db.settings, today);
    return { participant: p, inbody, routine, total: r1(inbody.total + routine.score), rank: 0 };
  });
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  // 동점자는 같은 순위
  sorted.forEach((r, i) => (r.rank = i > 0 && sorted[i - 1].total === r.total ? sorted[i - 1].rank : i + 1));
  return sorted;
}

export function average(nums: number[]) {
  return nums.length ? r1(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}
