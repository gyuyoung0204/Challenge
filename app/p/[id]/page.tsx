import { notFound } from "next/navigation";
import { GoalBadge, PageHeader, Progress, Stat, StatusBadge, kg, pct, pts, signed } from "@/components/ui";
import { dateRange, formatDate, todayKST } from "@/lib/dates";
import { itemCount, standings } from "@/lib/scoring";
import { isAdmin } from "@/lib/auth";
import { loadDB } from "@/lib/store";

export const dynamic = "force-dynamic";

const HEAT = [
  "bg-zinc-200 dark:bg-zinc-800",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-400 dark:bg-emerald-700",
  "bg-emerald-600 dark:bg-emerald-500",
];

export default async function ParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const [db, admin] = await Promise.all([loadDB(), isAdmin()]);
  const today = todayKST();
  const row = standings(db, today).find((r) => r.participant.id === id);
  if (!row) notFound();
  const { participant: p, inbody, routine } = row;

  const logs = db.logs.filter((l) => l.participantId === id);
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const days = dateRange(db.settings.startDate, db.settings.endDate);

  return (
    <>
      <PageHeader title={p.name} back="/" />
      <div className="-mt-3 mb-4 flex items-center gap-2">
        <GoalBadge goal={p.goal} />
        <StatusBadge status={routine.status} />
        <span className="ml-auto text-sm text-zinc-500">종합 {row.rank}위</span>
      </div>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="종합 총점" value={pts(row.total)} />
        <Stat label="인바디" value={pts(inbody.total)} />
        <Stat label="루틴" value={pts(routine.score)} />
      </section>

      <section className="card mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">루틴 달성률</span>
          <span className="num font-semibold">{pct(routine.rate)}</span>
        </div>
        <Progress value={routine.rate} className="mt-2" />
        <div className="num mt-2 flex justify-between text-xs text-zinc-500">
          <span>운동 {routine.workouts}회</span>
          <span>식단 {routine.meals}회</span>
          <span className={routine.penalty ? "text-rose-500" : ""}>패널티 -{routine.penalty}</span>
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(0.85rem,1fr))] gap-1">
          {days.map((d) => {
            const l = byDate.get(d);
            const n = l ? itemCount(l) : 0;
            const future = d > today;
            return (
              <div
                key={d}
                title={`${formatDate(d)} ${n}/3${l?.penalty ? ` (-${l.penalty})` : ""}`}
                className={`aspect-square rounded-[3px] ${HEAT[n]} ${future ? "opacity-30" : ""} ${
                  l?.penalty ? "ring-1 ring-rose-500" : ""
                } ${d === today ? "outline outline-1 outline-offset-1 outline-zinc-500" : ""}`}
              />
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">하루 1칸 · 진할수록 인증 많음 · 빨간 테두리 = 패널티</p>
      </section>

      {/* 체중·골격근 수치는 관리자에게만 표시 */}
      {admin && (
        <section className="card num mt-3 text-sm">
          <h2 className="mb-2 font-semibold">인바디 <span className="text-xs font-normal text-zinc-400">관리자만 보임</span></h2>
          <table className="w-full text-left">
            <thead className="text-xs text-zinc-400">
              <tr>
                <th className="font-normal"></th>
                <th className="font-normal">시작</th>
                <th className="font-normal">최종</th>
                <th className="font-normal">변화</th>
                <th className="text-right font-normal">점수</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 text-zinc-500">체중</td>
                <td>{kg(p.startWeight)}</td>
                <td>{kg(p.finalWeight)}</td>
                <td>{signed(inbody.weightDelta)}</td>
                <td className="text-right font-semibold">{pts(inbody.weightScore)}</td>
              </tr>
              <tr>
                <td className="py-1 text-zinc-500">골격근</td>
                <td>{kg(p.startMuscle)}</td>
                <td>{kg(p.finalMuscle)}</td>
                <td>{signed(inbody.muscleDelta)}</td>
                <td className="text-right font-semibold">{pts(inbody.muscleScore)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      <h2 className="mb-2 mt-6 text-sm font-semibold text-zinc-500">인증 기록</h2>
      {logs.length === 0 ? (
        <p className="card text-center text-sm text-zinc-400">아직 기록이 없습니다.</p>
      ) : (
        <ul className="card divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
          {[...logs].reverse().map((l) => (
            <li key={l.date} className="py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{formatDate(l.date)}</span>
                <span className="num text-xs">
                  {[l.workout && "운동", l.meal1 && "식단1", l.meal2 && "식단2"].filter(Boolean).join(" · ") || "미인증"}
                  {l.penalty > 0 && <b className="ml-2 text-rose-500">-{l.penalty}</b>}
                </span>
              </div>
              {l.memo && <p className="mt-0.5 text-xs text-zinc-500">{l.memo}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
