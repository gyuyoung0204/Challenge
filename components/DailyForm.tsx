"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveDaily, type DailyRow } from "@/app/actions";
import { addDays, formatDate } from "@/lib/dates";
import type { LogEntry } from "@/lib/types";

type Props = {
  date: string;
  startDate: string;
  endDate: string;
  participants: { id: string; name: string }[];
  entries: LogEntry[];
};

const ITEMS = [
  { key: "workout", label: "운동" },
  { key: "meal1", label: "식단1" },
  { key: "meal2", label: "식단2" },
] as const;

export default function DailyForm({ date, startDate, endDate, participants, entries }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rows, setRows] = useState<DailyRow[]>(() =>
    participants.map((p) => {
      const e = entries.find((x) => x.participantId === p.id);
      return {
        participantId: p.id,
        workout: e?.workout ?? false,
        meal1: e?.meal1 ?? false,
        meal2: e?.meal2 ?? false,
        penalty: e?.penalty ?? 0,
        memo: e?.memo ?? "",
      };
    }),
  );
  const [dirty, setDirty] = useState(false);

  const patch = (i: number, p: Partial<DailyRow>) => {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
    setDirty(true);
    setMsg(null);
  };

  const go = (d: string) => {
    if (dirty && !confirm("저장하지 않은 변경사항이 있습니다. 이동할까요?")) return;
    router.push(`/admin/daily?date=${d}`);
  };

  const penalizeMissing = () => {
    setRows((rs) => rs.map((r) => (r.workout || r.meal1 || r.meal2 ? r : { ...r, penalty: Math.max(r.penalty, 1) })));
    setDirty(true);
  };

  const save = () =>
    start(async () => {
      try {
        await saveDaily(date, rows);
        setDirty(false);
        setMsg({ ok: true, text: "저장되었습니다." });
        router.refresh();
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "저장 실패" });
      }
    });

  const outOfRange = date < startDate || date > endDate;

  return (
    <div className="space-y-3">
      <div className="card flex items-center gap-2 p-2">
        <button type="button" onClick={() => go(addDays(date, -1))} className="btn-ghost px-3">
          ‹
        </button>
        <input type="date" value={date} onChange={(e) => e.target.value && go(e.target.value)} className="input flex-1 text-center" />
        <button type="button" onClick={() => go(addDays(date, 1))} className="btn-ghost px-3">
          ›
        </button>
      </div>
      <p className="text-center text-sm font-semibold">
        {formatDate(date)}
        {outOfRange && <span className="ml-2 text-xs font-normal text-amber-600">챌린지 기간 외</span>}
      </p>

      {participants.map((p, i) => {
        const r = rows[i];
        return (
          <div key={p.id} className="card space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              <div className="flex items-center gap-1">
                <span className="mr-1 text-xs text-zinc-500">패널티</span>
                <button type="button" onClick={() => patch(i, { penalty: Math.max(0, r.penalty - 1) })} className="btn-ghost h-8 w-8 p-0">
                  −
                </button>
                <span className={`num w-7 text-center font-bold ${r.penalty ? "text-rose-500" : "text-zinc-400"}`}>
                  {r.penalty ? `-${r.penalty}` : 0}
                </span>
                <button type="button" onClick={() => patch(i, { penalty: Math.min(10, r.penalty + 1) })} className="btn-ghost h-8 w-8 p-0">
                  +
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ITEMS.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => patch(i, { [it.key]: !r[it.key] })}
                  aria-pressed={r[it.key]}
                  className={`btn py-3 ${
                    r[it.key]
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
                  }`}
                >
                  {r[it.key] ? "✓ " : ""}
                  {it.label}
                </button>
              ))}
            </div>
            <input
              value={r.memo}
              onChange={(e) => patch(i, { memo: e.target.value })}
              placeholder="메모 / 특이사항"
              maxLength={200}
              className="input py-2 text-sm"
            />
          </div>
        );
      })}

      <button type="button" onClick={penalizeMissing} className="btn-danger w-full">
        미인증자 패널티 -1 일괄 적용
      </button>

      <div className="sticky bottom-20 z-10 pt-2">
        {msg && (
          <p className={`mb-2 rounded-xl px-3 py-2 text-center text-sm ${msg.ok ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-600/10 text-rose-600"}`}>
            {msg.text}
          </p>
        )}
        <button type="button" onClick={save} disabled={pending} className="btn-primary w-full py-3.5 text-base shadow-lg">
          {pending ? "저장 중…" : dirty ? "저장하기 •" : "저장하기"}
        </button>
      </div>
    </div>
  );
}
