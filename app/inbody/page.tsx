import Link from "next/link";
import PinForm from "@/components/PinForm";
import { GoalBadge, PageHeader, kg, pts, signed } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { average, inbodyScore } from "@/lib/scoring";
import { isAdmin } from "@/lib/auth";
import { loadDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function InbodyPage() {
  // 체중·골격근 수치는 관리자 전용
  if (!(await isAdmin())) return <PinForm next="/inbody" message="인바디 정보는 관리자만 볼 수 있습니다." />;
  const db = await loadDB();
  const rows = db.participants.map((p) => ({ p, s: inbodyScore(p) }));

  return (
    <>
      <PageHeader
        title="인바디 채점표"
        sub={`${formatDate(db.settings.inbodyDate)} 동시 측정 · 체중 1kg=1점 · 골격근 1kg=2점`}
      />

      <ul className="space-y-2">
        {rows.map(({ p, s }) => (
          <li key={p.id}>
            <Link href={`/p/${p.id}`} className="card block">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{p.name}</span>
                <GoalBadge goal={p.goal} />
                <span className="num ml-auto text-lg font-bold">{pts(s.total)}</span>
              </div>
              <div className="num mt-2 grid grid-cols-2 gap-2 text-sm">
                <Metric label="체중" from={p.startWeight} to={p.finalWeight} delta={s.weightDelta} score={s.weightScore} />
                <Metric label="골격근" from={p.startMuscle} to={p.finalMuscle} delta={s.muscleDelta} score={s.muscleScore} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {rows.length > 0 && (
        <div className="card num mt-3 grid grid-cols-3 text-center text-xs">
          <div>
            <div className="text-zinc-400">평균 체중점수</div>
            <div className="mt-0.5 font-semibold">{pts(average(rows.map((r) => r.s.weightScore ?? 0)))}</div>
          </div>
          <div>
            <div className="text-zinc-400">평균 근육점수</div>
            <div className="mt-0.5 font-semibold">{pts(average(rows.map((r) => r.s.muscleScore ?? 0)))}</div>
          </div>
          <div>
            <div className="text-zinc-400">평균 총점</div>
            <div className="mt-0.5 font-semibold">{pts(average(rows.map((r) => r.s.total)))}</div>
          </div>
        </div>
      )}
    </>
  );
}

function Metric(props: { label: string; from: number | null; to: number | null; delta: number | null; score: number | null }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800/60">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-zinc-500">{props.label}</span>
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{pts(props.score)}</span>
      </div>
      <div className="mt-1 text-[13px]">
        {kg(props.from)} → <b>{kg(props.to)}</b>
      </div>
      <div className="text-[11px] text-zinc-400">{signed(props.delta)}</div>
    </div>
  );
}
