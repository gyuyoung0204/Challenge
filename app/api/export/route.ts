import { isAdmin } from "@/lib/auth";
import { todayKST } from "@/lib/dates";
import { loadDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const db = await loadDB();
  return new Response(JSON.stringify(db, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="challenge-${todayKST()}.json"`,
    },
  });
}
