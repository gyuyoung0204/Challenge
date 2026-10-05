import Link from "next/link";
import type { Status } from "@/lib/scoring";
import { GOAL_LABEL, type Goal } from "@/lib/types";

export function GoalBadge({ goal }: { goal: Goal }) {
  const cls =
    goal === "cut"
      ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
      : "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{GOAL_LABEL[goal]}</span>;
}

export function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    "진행 중": "text-emerald-600 dark:text-emerald-400",
    "대기 중": "text-zinc-400",
    종료: "text-violet-600 dark:text-violet-400",
  };
  const icon = { "진행 중": "🏃", "대기 중": "⏳", 종료: "🏁" }[status];
  return (
    <span className={`text-xs font-medium ${map[status]}`}>
      {status} {icon}
    </span>
  );
}

export function Progress({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${className}`}>
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card p-3">
      <div className="text-[11px] font-medium text-zinc-500">{label}</div>
      <div className="num mt-1 text-lg font-bold leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-400">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return (
    <header className="mb-4 mt-2">
      {back && (
        <Link href={back} className="mb-2 inline-block text-sm text-zinc-500">
          ← 뒤로
        </Link>
      )}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-zinc-500">{sub}</p>}
    </header>
  );
}

export const pts = (n: number | null) => (n == null ? "–" : `${n.toFixed(1)}점`);
export const kg = (n: number | null) => (n == null ? "–" : `${n.toFixed(1)}kg`);
export const signed = (n: number | null, unit = "kg") => (n == null ? "–" : `${n > 0 ? "+" : ""}${n.toFixed(1)}${unit}`);
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
