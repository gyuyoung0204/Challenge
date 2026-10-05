export type Goal = "cut" | "bulk";

export interface Participant {
  id: string;
  name: string;
  goal: Goal;
  startWeight: number | null;
  startMuscle: number | null;
  finalWeight: number | null;
  finalMuscle: number | null;
}

export interface LogEntry {
  date: string; // YYYY-MM-DD (KST)
  participantId: string;
  workout: boolean;
  meal1: boolean;
  meal2: boolean;
  penalty: number; // 감점 (양수로 저장, 1 = -1점)
  memo: string;
}

export interface Settings {
  title: string;
  startDate: string;
  endDate: string;
  inbodyDate: string;
  daysPerWeek: number; // 주 n회 루틴
  targetCount: number; // 목표 완주 인원
}

export interface DB {
  version: 1;
  settings: Settings;
  participants: Participant[];
  logs: LogEntry[];
}

export const GOAL_LABEL: Record<Goal, string> = { cut: "컷팅", bulk: "벌크" };
