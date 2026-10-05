import { redirect } from "next/navigation";
import { refreshSheet } from "@/app/actions";
import { GoalBadge, PageHeader, kg, pts } from "@/components/ui";
import { isAdmin } from "@/lib/auth";
import { inbodyScore } from "@/lib/scoring";
import { SHEET_URL } from "@/lib/sheet";
import { loadWithStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ParticipantsAdmin() {
  if (!(await isAdmin())) redirect("/admin");
  const { db, sheetError } = await loadWithStatus();

  return (
    <>
      <PageHeader title="참가자 · 인바디" sub="구글 시트 「참가자 정보」 탭에서 불러옵니다" back="/admin" />

      {sheetError && (
        <p className="mb-3 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ {sheetError} — 마지막으로 불러온 명단을 표시합니다.
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <a href={SHEET_URL} target="_blank" rel="noreferrer" className="btn-ghost">
          📄 시트에서 수정
        </a>
        <form action={refreshSheet}>
          <button className="btn-primary w-full">🔄 지금 불러오기</button>
        </form>
      </div>
      <p className="mb-4 text-xs text-zinc-400">
        시트에서 추가·삭제·수정하면 1분 안에 자동 반영됩니다. 바로 보려면 「지금 불러오기」를 누르세요. 이름이 기록의 기준이므로
        이름을 바꾸면 기존 인증 기록과 연결이 끊어집니다.
      </p>

      <ul className="space-y-2">
        {db.participants.map((p) => (
          <li key={p.id} className="card">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{p.name}</span>
              <GoalBadge goal={p.goal} />
              <span className="num ml-auto text-sm font-semibold">{pts(inbodyScore(p).total)}</span>
            </div>
            <div className="num mt-1 text-xs text-zinc-500">
              체중 {kg(p.startWeight)} → {kg(p.finalWeight)} · 골격근 {kg(p.startMuscle)} → {kg(p.finalMuscle)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
