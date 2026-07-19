"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, LayoutDashboard, ClipboardList, ShieldCheck, Users, Bot,
  BarChart3, Map, FileText, Settings2, Cog, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const NAV = [
  { href: "/", key: "nav.home", icon: Home },
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/service-requests", key: "nav.requests", icon: ClipboardList },
  { href: "/inspections", key: "nav.inspections", icon: ShieldCheck },
  { href: "/citizens", key: "nav.citizens", icon: Users },
  { href: "/ai-assistant", key: "nav.ai", icon: Bot },
  { href: "/analytics", key: "nav.analytics", icon: BarChart3 },
  { href: "/maps", key: "nav.maps", icon: Map },
  { href: "/reports", key: "nav.reports", icon: FileText },
  { href: "/administration", key: "nav.admin", icon: Settings2 },
  { href: "/settings", key: "nav.settings", icon: Cog },
  { href: "/about", key: "nav.about", icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-hair bg-surface/70 backdrop-blur lg:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white font-bold">31</div>
        <div className="leading-tight">
          <div className="text-sm font-bold">NYC 311</div>
          <div className="text-[0.65rem] text-muted">AI Management</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map(({ href, key, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-brand/15 text-ink" : "text-muted hover:bg-overlay/5 hover:text-ink",
              )}
            >
              <Icon size={17} className={active ? "text-brand" : ""} />
              {t(key)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-hair px-5 py-3 text-[0.65rem] text-muted">
        v0.1 · vertical slice
      </div>
    </aside>
  );
}
