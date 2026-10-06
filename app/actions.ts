"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { checkPin, clearAdminCookie, requireAdmin, setAdminCookie } from "@/lib/auth";
import { updateDB } from "@/lib/store";
import { SHEET_TAG } from "@/lib/sheet";
import type { LogEntry } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/", "layout");
}

export async function login(_: string | null, form: FormData): Promise<string | null> {
  const pin = String(form.get("pin") ?? "");
  if (!checkPin(pin)) {
    await new Promise((r) => setTimeout(r, 800)); // 무작위 대입 지연
    return "PIN이 올바르지 않습니다.";
  }
  await setAdminCookie();
  // 로그인 후 원래 보던 화면으로 (내부 경로만 허용)
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  await clearAdminCookie();
  redirect("/admin");
}

export type DailyRow = Omit<LogEntry, "date">;

export async function saveDaily(date: string, rows: DailyRow[]) {
  await requireAdmin();
  if (!DATE_RE.test(date)) throw new Error("날짜 형식 오류");
  await updateDB((db) => {
    const ids = new Set(db.participants.map((p) => p.id));
    // 시트에서 빠진 참가자의 기록은 건드리지 않음 (다시 추가되면 복원)
    db.logs = db.logs.filter((l) => l.date !== date || !ids.has(l.participantId));
    for (const r of rows) {
      if (!ids.has(r.participantId)) continue;
      const entry: LogEntry = {
        date,
        participantId: r.participantId,
        workout: !!r.workout,
        meal1: !!r.meal1,
        meal2: !!r.meal2,
        penalty: Math.max(0, Math.min(10, Math.round(Number(r.penalty) || 0))),
        memo: String(r.memo ?? "").slice(0, 200),
      };
      // 아무 기록도 없는 행은 저장하지 않음
      if (entry.workout || entry.meal1 || entry.meal2 || entry.penalty || entry.memo) db.logs.push(entry);
    }
    db.logs.sort((a, b) => a.date.localeCompare(b.date));
  });
  refresh();
}

export async function refreshSheet() {
  await requireAdmin();
  updateTag(SHEET_TAG);
  refresh();
}

export async function saveSettings(form: FormData) {
  await requireAdmin();
  const startDate = String(form.get("startDate") ?? "");
  const endDate = String(form.get("endDate") ?? "");
  const inbodyDate = String(form.get("inbodyDate") ?? "");
  if (![startDate, endDate, inbodyDate].every((d) => DATE_RE.test(d)) || endDate < startDate) {
    throw new Error("기간을 확인하세요.");
  }
  await updateDB((db) => {
    db.settings = {
      title: String(form.get("title") ?? "").trim() || db.settings.title,
      startDate,
      endDate,
      inbodyDate,
      daysPerWeek: Math.min(7, Math.max(1, Number(form.get("daysPerWeek")) || 6)),
      targetCount: Math.max(1, Number(form.get("targetCount")) || db.participants.length),
    };
  });
  refresh();
  redirect("/admin");
}
