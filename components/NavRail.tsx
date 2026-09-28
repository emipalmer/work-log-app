"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS = [
  {
    href: "/workspace",
    label: "Workspace",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
        <rect x="2" y="3" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 3v14M9 10h9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: "/outputs",
    label: "Generated content",
    icon: (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden>
        <path d="M10 2l1.6 5.4L17 9l-5.4 1.6L10 16l-1.6-5.4L3 9l5.4-1.6z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/stats",
    label: "Overall stats",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
        <path
          d="M4 16V9M10 16V4M16 16v-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
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
    <nav className="flex w-[60px] shrink-0 flex-col items-center gap-2 bg-rail py-3.5">
      <Link
        href="/workspace"
        className="mb-1.5 grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-accent text-[17px] font-bold text-white"
        title="WorkLog"
      >
        W
      </Link>
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`grid h-9 w-9 place-items-center rounded-[9px] transition-colors ${
              active ? "bg-white/15 text-white" : "text-white/55 hover:bg-rail-hover hover:text-white"
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
        aria-label="Sign out"
        className="grid h-9 w-9 place-items-center rounded-[9px] text-white/55 transition-colors hover:bg-rail-hover hover:text-white"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
          <path
            d="M8 17H5a2 2 0 01-2-2V5a2 2 0 012-2h3M13 14l4-4-4-4M17 10H8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </nav>
  );
}
