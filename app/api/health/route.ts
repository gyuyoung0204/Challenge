// 설정 점검용. 값은 절대 노출하지 않고 존재 여부·형식 문제만 보고
export const dynamic = "force-dynamic";

function check(name: string) {
  const raw = process.env[name];
  if (raw == null || raw === "") return "없음";
  const issues: string[] = [];
  if (raw !== raw.trim()) issues.push("앞뒤 공백");
  if (/^["'].*["']$/.test(raw.trim())) issues.push("따옴표 포함");
  return issues.length ? `있음(문제: ${issues.join(", ")})` : "있음";
}

export async function GET() {
  const pin = process.env.ADMIN_PIN?.trim() ?? "";
  return Response.json({
    ADMIN_PIN: check("ADMIN_PIN"),
    ADMIN_PIN_숫자만: pin ? /^\d+$/.test(pin) : null,
    SESSION_SECRET: check("SESSION_SECRET"),
    SHEET_WEBAPP_URL: check("SHEET_WEBAPP_URL"),
    SHEET_WEBAPP_SECRET: check("SHEET_WEBAPP_SECRET"),
    SHEET_ID: check("SHEET_ID"),
    배포: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    환경: process.env.VERCEL_ENV ?? "local",
  });
}
