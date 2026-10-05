import { redirect } from "next/navigation";
import DailyForm from "@/components/DailyForm";
import { PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/auth";
import { todayKST } from "@/lib/dates";
import { loadDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DailyPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const { date: q } = await searchParams;
  const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : todayKST();
  const db = await loadDB();
  const entries = db.logs.filter((l) => l.date === date);

  return (
    <>
      <PageHeader title="일일 인증 입력" back="/admin" />
      <DailyForm
        key={date}
        date={date}
        startDate={db.settings.startDate}
        endDate={db.settings.endDate}
        participants={db.participants.map((p) => ({ id: p.id, name: p.name }))}
        entries={entries}
      />
    </>
  );
}
