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

/** Apps Script 주소 형식만 판별 (ID는 노출하지 않음) */
function webappUrlInfo() {
  const u = process.env.SHEET_WEBAPP_URL?.trim();
  if (!u) return null;
  return {
    script_google_com: u.startsWith("https://script.google.com/"),
    끝이_exec: u.endsWith("/exec"),
    끝이_dev_테스트용: u.endsWith("/dev"),
    회사도메인_제한주소: /\/a\/macros\//.test(u) ? u.match(/\/a\/macros\/([^/]+)/)?.[1] : false,
  };
}

export async function GET() {
  const pin = process.env.ADMIN_PIN?.trim() ?? "";
  return Response.json({
    ADMIN_PIN: check("ADMIN_PIN"),
    ADMIN_PIN_숫자만: pin ? /^\d+$/.test(pin) : null,
    SESSION_SECRET: check("SESSION_SECRET"),
    SHEET_WEBAPP_URL: check("SHEET_WEBAPP_URL"),
    SHEET_WEBAPP_URL_형식: webappUrlInfo(),
    SHEET_WEBAPP_SECRET: check("SHEET_WEBAPP_SECRET"),
    SHEET_ID: check("SHEET_ID"),
    배포: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    환경: process.env.VERCEL_ENV ?? "local",
  });
}
