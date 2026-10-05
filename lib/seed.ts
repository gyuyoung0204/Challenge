import type { DB } from "./types";

// 초기값. 참가자는 실행 시 구글 시트에서 덮어씀 (시트를 못 읽을 때만 이 값 사용)
export function seedDB(): DB {
  return {
    version: 1,
    settings: {
      title: "2026 하반기 운동 챌린지",
      startDate: "2026-10-06",
      endDate: "2026-12-30",
      inbodyDate: "2026-12-31",
      daysPerWeek: 6,
      targetCount: 8,
    },
    participants: [
      { id: "기문석", name: "기문석", goal: "cut", startWeight: 78.5, startMuscle: 34.0, finalWeight: 75.2, finalMuscle: 34.8 },
      { id: "김동규", name: "김동규", goal: "cut", startWeight: 74.0, startMuscle: 33.5, finalWeight: 71.5, finalMuscle: 34.2 },
      { id: "김동현", name: "김동현", goal: "bulk", startWeight: 68.0, startMuscle: 31.0, finalWeight: 72.0, finalMuscle: 32.5 },
      { id: "양민경", name: "양민경", goal: "bulk", startWeight: 52.0, startMuscle: 20.5, finalWeight: 54.0, finalMuscle: 21.8 },
      { id: "박은숙", name: "박은숙", goal: "bulk", startWeight: 55.0, startMuscle: 21.0, finalWeight: 56.5, finalMuscle: 22.0 },
      { id: "최지영", name: "최지영", goal: "bulk", startWeight: 58.0, startMuscle: 22.0, finalWeight: 60.0, finalMuscle: 23.2 },
    ],
    logs: [
      {
        date: "2026-10-06",
        participantId: "기문석",
        workout: true,
        meal1: true,
        meal2: true,
        penalty: 0,
        memo: "상체 웨이트 & 닭가슴살 샐러드",
      },
    ],
  };
}
