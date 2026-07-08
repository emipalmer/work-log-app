"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  {
    href: "/week",
    label: "Weekly log",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    href: "/outputs",
    label: "Generated content",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3z" />
        <path d="M19 14l.9 2.4L22 17.3l-2.1.9L19 20.6l-.9-2.4-2.1-.9 2.1-.9L19 14z" />
      </svg>
    ),
  },
  {
    href: "/stats",
    label: "Overall stats",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
      </svg>
    ),
  },
];

export default function NavRail({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="w-14 shrink-0 bg-slate-700 flex flex-col items-center py-3 gap-1">
      <div className="text-lg mb-2" title="WorkLog">
        📓
      </div>
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`p-2.5 rounded-lg transition-colors ${
              active
                ? "bg-slate-500/60 text-white"
                : "text-slate-300 hover:bg-slate-600 hover:text-white"
            }`}
          >
            {item.icon}
          </Link>
        );
      })}
      <div className="flex-1" />
      <button
        onClick={logout}
        title={`Sign out (${email})`}
        className="p-2.5 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    </nav>
  );
}
