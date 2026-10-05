import Link from "next/link";
import { GoalBadge, PageHeader, Progress, StatusBadge, pct, pts } from "@/components/ui";
import { formatDate, todayKST } from "@/lib/dates";
import { routineScore } from "@/lib/scoring";
import { loadDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RoutinePage() {
  const db = await loadDB();
  const today = todayKST();
  const names = new Map(db.participants.map((p) => [p.id, p.name]));

  const order = new Map(db.participants.map((p, i) => [p.id, i]));
  const byDate = new Map<string, typeof db.logs>();
  const sorted = db.logs
    .filter((l) => names.has(l.participantId))
    .sort((a, b) => b.date.localeCompare(a.date) || order.get(a.participantId)! - order.get(b.participantId)!);
  for (const l of sorted) byDate.set(l.date, [...(byDate.get(l.date) ?? []), l]);

  return (
    <>
      <PageHeader title="루틴 진행성적" sub="운동·식단 인증 집계 및 일별 기록" />

      <ul className="space-y-2">
        {db.participants.map((p) => {
          const r = routineScore(p.id, db.logs, db.settings, today);
          return (
            <li key={p.id}>
              <Link href={`/p/${p.id}`} className="card block">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{p.name}</span>
                  <GoalBadge goal={p.goal} />
                  <span className="ml-auto">
                    <StatusBadge status={r.status} />
                  </span>
                </div>
                <div className="num mt-2 grid grid-cols-4 gap-1 text-center text-xs">
                  <Cell label="운동" value={`${r.workouts}회`} />
                  <Cell label="식단" value={`${r.meals}회`} />
                  <Cell label="패널티" value={r.penalty ? `-${r.penalty}` : "0"} warn={r.penalty > 0} />
                  <Cell label="루틴점수" value={pts(r.score)} strong />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={r.rate} className="flex-1" />
                  <span className="num w-11 text-right text-[11px] text-zinc-500">{pct(r.rate)}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-2 mt-6 text-sm font-semibold text-zinc-500">📝 일별 인증 로그</h2>
      {byDate.size === 0 && <p className="card text-center text-sm text-zinc-400">아직 기록이 없습니다.</p>}
      <div className="space-y-3">
        {[...byDate].map(([date, logs]) => (
          <section key={date} className="card">
            <h3 className="mb-2 text-sm font-semibold">{formatDate(date)}</h3>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {logs.map((l) => (
                <li key={l.participantId} className="py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-14 font-medium">{names.get(l.participantId)}</span>
                    <Check on={l.workout} label="운동" />
                    <Check on={l.meal1} label="식단1" />
                    <Check on={l.meal2} label="식단2" />
                    {l.penalty > 0 && <span className="ml-auto text-xs font-semibold text-rose-500">-{l.penalty}점</span>}
                  </div>
                  {l.memo && <p className="mt-1 pl-16 text-xs text-zinc-500">{l.memo}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function Cell({ label, value, warn, strong }: { label: string; value: string; warn?: boolean; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-zinc-50 py-1.5 dark:bg-zinc-800/60">
      <div className="text-[10px] text-zinc-400">{label}</div>
      <div className={`font-semibold ${warn ? "text-rose-500" : ""} ${strong ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
        on ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-800"
      }`}
    >
      {label}
    </span>
  );
}
