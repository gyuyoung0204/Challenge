import Link from "next/link";
import { GoalBadge, Progress, Stat, StatusBadge, pct, pts } from "@/components/ui";
import { diffDays, formatDate, todayKST } from "@/lib/dates";
import { average, elapsedDays, standings, totalDays } from "@/lib/scoring";
import { loadDB } from "@/lib/store";

export const dynamic = "force-dynamic";

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function Home() {
  const db = await loadDB();
  const today = todayKST();
  const s = db.settings;
  const rows = standings(db, today);
  const total = totalDays(s);
  const elapsed = elapsedDays(s, today);
  const dday = diffDays(today, s.endDate);
  const certs = db.logs.reduce((n, l) => n + Number(l.workout) + Number(l.meal1) + Number(l.meal2), 0);
  const leader = rows[0];

  return (
    <>
      <header className="mb-4 mt-2">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {today < s.startDate ? `시작까지 D-${diffDays(today, s.startDate)}` : dday >= 0 ? `종료까지 D-${dday}` : "챌린지 종료"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{s.title}</h1>
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <span>{formatDate(s.startDate)}</span>
          <Progress value={total ? elapsed / total : 0} className="flex-1" />
          <span>{formatDate(s.endDate)}</span>
        </div>
        <p className="num mt-1 text-right text-[11px] text-zinc-400">
          {elapsed}/{total}일차
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="평균 종합" value={pts(average(rows.map((r) => r.total)))} />
        <Stat label="평균 달성률" value={pct(average(rows.map((r) => r.routine.rate * 1000)) / 1000)} />
        <Stat label="누적 인증" value={`${certs}건`} sub={`${rows.length}/${s.targetCount}명 참가`} />
      </section>

      {leader && (
        <Link href={`/p/${leader.participant.id}`} className="card mt-3 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-white dark:from-amber-500/10 dark:to-zinc-900">
          <span className="text-3xl">👑</span>
          <div className="flex-1">
            <div className="text-xs text-zinc-500">현재 종합 1위</div>
            <div className="text-lg font-bold">{leader.participant.name}</div>
          </div>
          <div className="num text-xl font-bold text-amber-600 dark:text-amber-400">{pts(leader.total)}</div>
        </Link>
      )}

      <h2 className="mb-2 mt-6 text-sm font-semibold text-zinc-500">종합 랭킹</h2>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.participant.id}>
            <Link href={`/p/${r.participant.id}`} className="card flex items-center gap-3 active:bg-zinc-50 dark:active:bg-zinc-800">
              <div className="num w-8 text-center text-lg font-bold text-zinc-400">{MEDAL[r.rank - 1] ?? r.rank}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{r.participant.name}</span>
                  <GoalBadge goal={r.participant.goal} />
                  <span className="ml-auto">
                    <StatusBadge status={r.routine.status} />
                  </span>
                </div>
                <div className="num mt-1 flex gap-3 text-xs text-zinc-500">
                  <span>인바디 {pts(r.inbody.total)}</span>
                  <span>루틴 {pts(r.routine.score)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress value={r.routine.rate} className="flex-1" />
                  <span className="num w-11 text-right text-[11px] text-zinc-500">{pct(r.routine.rate)}</span>
                </div>
              </div>
              <div className="num text-right text-lg font-bold">{pts(r.total)}</div>
            </Link>
          </li>
        ))}
      </ul>

      <details className="card mt-6 text-sm">
        <summary className="cursor-pointer font-semibold">📢 공식 룰</summary>
        <ul className="mt-3 space-y-1.5 text-zinc-600 dark:text-zinc-400">
          <li>📅 기간: {s.startDate.replaceAll("-", ".")} ~ {s.endDate.replaceAll("-", ".")} (총 {total}일)</li>
          <li>⚡ 필수 루틴: 주 {s.daysPerWeek}회 (운동 1회 + 식단 2회)</li>
          <li>📸 인증: 당일 24시까지 사진 필수 (미제출 -1점)</li>
          <li>⚖️ 인바디: {formatDate(s.inbodyDate)} 동시 측정 제출</li>
          <li>🎯 채점: 체중 변화 1kg당 1점 / 골격근 증량 1kg당 2점</li>
          <li>✅ 루틴 점수: 인증 1건당 1점 − 패널티</li>
          <li>🤝 양심 룰: 정직한 기록과 상호 응원으로 완주!</li>
        </ul>
      </details>
    </>
  );
}
