"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "랭킹", icon: "🏆" },
  { href: "/routine", label: "루틴", icon: "🏃" },
  { href: "/inbody", label: "인바디", icon: "⚖️" },
  { href: "/admin", label: "관리", icon: "🔐" },
];

export default function BottomNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/p/") : path.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                active(t.href) ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"
              }`}
            >
              <span className={`text-xl ${active(t.href) ? "" : "opacity-60 grayscale"}`}>{t.icon}</span>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
