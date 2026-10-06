"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { checkPin, clearAdminCookie, isAdmin, requireAdmin, setAdminCookie } from "@/lib/auth";
import { postToSheet, SHEET_TAG } from "@/lib/sheet";
import { loadWithStatus } from "@/lib/store";
import type { LogEntry, Settings } from "@/lib/types";

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

/** 해당 날짜의 인증을 시트 「진행성적」 로그에 저장. 실패 시 오류 메시지 반환 */
export async function saveDaily(date: string, rows: DailyRow[]): Promise<string | null> {
  if (!(await isAdmin())) return "관리자 PIN이 필요합니다.";
  if (!DATE_RE.test(date)) return "날짜 형식 오류";
  try {
    const { db } = await loadWithStatus();
    const names = new Set(db.participants.map((p) => p.name));
    const entries = rows
      .filter((r) => names.has(r.participantId))
      .map((r) => ({
        name: r.participantId,
        workout: !!r.workout,
        meal1: !!r.meal1,
        meal2: !!r.meal2,
        penalty: Math.max(0, Math.min(10, Math.round(Number(r.penalty) || 0))),
        memo: String(r.memo ?? "").slice(0, 200),
      }))
      // 아무 기록도 없는 행은 시트에서 지움
      .filter((e) => e.workout || e.meal1 || e.meal2 || e.penalty || e.memo);
    // names: 이 날짜에서 교체할 대상(현재 참가자). 시트에서 빠진 참가자의 기록은 건드리지 않음
    await postToSheet("saveDaily", { date, names: [...names], rows: entries });
  } catch (e) {
    return e instanceof Error ? e.message : "저장 실패";
  }
  updateTag(SHEET_TAG);
  refresh();
  return null;
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
    redirect(`/admin?error=${encodeURIComponent("기간을 확인하세요.")}`);
  }
  const settings: Settings = {
    title: String(form.get("title") ?? "").trim() || "운동 챌린지",
    startDate,
    endDate,
    inbodyDate,
    daysPerWeek: Math.min(7, Math.max(1, Number(form.get("daysPerWeek")) || 6)),
    targetCount: Math.max(1, Number(form.get("targetCount")) || 1),
  };
  try {
    await postToSheet("saveSettings", { settings });
  } catch (e) {
    redirect(`/admin?error=${encodeURIComponent(e instanceof Error ? e.message : "저장 실패")}`);
  }
  updateTag(SHEET_TAG);
  refresh();
  redirect("/admin");
}
