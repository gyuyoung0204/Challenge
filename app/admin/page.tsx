import Link from "next/link";
import PinForm from "@/components/PinForm";
import { Field, PageHeader } from "@/components/ui";
import { logout, saveSettings } from "@/app/actions";
import { isAdmin } from "@/lib/auth";
import { formatDate, todayKST } from "@/lib/dates";
import { SHEET_LOG_URL } from "@/lib/sheet";
import { loadWithStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await isAdmin())) return <PinForm />;
  const { error } = await searchParams;
  const { db, sheetError } = await loadWithStatus();
  const s = db.settings;
  const today = todayKST();
  const todayDone = new Set(db.logs.filter((l) => l.date === today).map((l) => l.participantId)).size;

  return (
    <>
      <PageHeader title="관리" sub="관리자 모드 · 모든 데이터는 구글 시트에 저장됩니다" />

      {(error || sheetError) && (
        <p className="mb-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          ⚠️ {error ?? `시트 읽기 오류 — ${sheetError}`}
        </p>
      )}

      <div className="space-y-2">
        <MenuLink href="/admin/daily" icon="📝" title="일일 인증 입력" sub={`오늘 ${formatDate(today)} · ${todayDone}/${db.participants.length}명 기록됨`} />
        <MenuLink href="/admin/participants" icon="👥" title="참가자 · 인바디" sub={`${db.participants.length}명 · 구글 시트 연동`} />
        <a href={SHEET_LOG_URL} target="_blank" rel="noreferrer" className="card flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <div className="flex-1">
            <div className="font-semibold">구글 시트 열기</div>
            <div className="text-xs text-zinc-500">「진행성적」 탭 인증 로그 직접 보기·수정</div>
          </div>
          <span className="text-zinc-400">↗</span>
        </a>
        <a href="/api/export" className="card flex items-center gap-3">
          <span className="text-2xl">💾</span>
          <div className="flex-1">
            <div className="font-semibold">데이터 백업 (JSON)</div>
            <div className="text-xs text-zinc-500">전체 데이터를 파일로 내려받기</div>
          </div>
        </a>
      </div>

      <form action={saveSettings} className="card mt-6 space-y-3">
        <h2 className="font-semibold">⚙️ 챌린지 설정</h2>
        <p className="text-xs text-zinc-400">저장하면 시트에 「앱설정」 탭이 만들어지고 거기에 기록됩니다.</p>
        <Field label="제목">
          <input name="title" defaultValue={s.title} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="시작일">
            <input type="date" name="startDate" defaultValue={s.startDate} className="input" required />
          </Field>
          <Field label="종료일">
            <input type="date" name="endDate" defaultValue={s.endDate} className="input" required />
          </Field>
          <Field label="인바디 측정일">
            <input type="date" name="inbodyDate" defaultValue={s.inbodyDate} className="input" required />
          </Field>
          <Field label="주 루틴 횟수">
            <input type="number" name="daysPerWeek" min={1} max={7} defaultValue={s.daysPerWeek} className="input" />
          </Field>
          <Field label="목표 인원">
            <input type="number" name="targetCount" min={1} defaultValue={s.targetCount} className="input" />
          </Field>
        </div>
        <button className="btn-primary w-full">설정 저장</button>
      </form>

      <form action={logout} className="mt-6">
        <button className="btn-ghost w-full">관리자 로그아웃</button>
      </form>
    </>
  );
}

function MenuLink({ href, icon, title, sub }: { href: string; icon: string; title: string; sub: string }) {
  return (
    <Link href={href} className="card flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-zinc-500">{sub}</div>
      </div>
      <span className="text-zinc-400">›</span>
    </Link>
  );
}
