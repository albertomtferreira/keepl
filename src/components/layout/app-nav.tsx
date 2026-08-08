"use client";

import {
  CalendarDays,
  Home,
  Library,
  Plus,
  Search,
  Settings,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/people", label: "People", icon: UsersRound },
  { href: "/memories", label: "Memories", icon: Library },
  { href: "/search", label: "Search", icon: Search },
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r bg-white/70 px-4 py-6 md:flex md:flex-col">
        <Link href="/home" className="px-2 text-xl font-semibold tracking-normal">
          Keepl
        </Link>
        <nav className="mt-8 grid gap-1">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
          ))}
        </nav>
        <Button asChild className="mt-6 justify-start gap-2">
          <Link href="/people/new">
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Link>
        </Button>
        <div className="mt-auto">
          <NavLink
            item={{ href: "/settings", label: "Settings", icon: Settings }}
            active={pathname.startsWith("/settings")}
          />
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-[0.7rem] font-medium text-muted-foreground",
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "bg-[#f1ede4] text-foreground"
                : "hover:bg-muted",
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

function NavLink({
  item,
  active,
}: {
  item: (typeof primaryNav)[number];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground",
        active ? "bg-[#f1ede4] text-foreground" : "hover:bg-muted hover:text-foreground",
      )}
    >
      <item.icon className="size-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
