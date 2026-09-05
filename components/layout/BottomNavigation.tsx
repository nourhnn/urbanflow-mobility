"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Leaf,
  Home,
  Route,
  UserRound,
} from "lucide-react";

const navigation = [
  {
    label: "Accueil",
    href: "/accueil",
    icon: Home,
  },
  {
    label: "Trajets",
    href: "/trajets",
    icon: Route,
  },
  {
    label: "Impact",
    href: "/recompenses",
    icon: Leaf,
  },
  {
    label: "Profil",
    href: "/profil",
    icon: UserRound,
  },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-surface/95 px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[64px] flex-col items-center gap-1.5 transition-colors ${
                active
                  ? "text-primary"
                  : "text-subtle hover:text-secondary"
              }`}
            >
              <div
                className={`flex h-9 w-11 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-primary-soft" : ""
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>

              <span className="text-[11px] font-semibold">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}