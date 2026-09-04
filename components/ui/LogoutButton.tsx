"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-error/20 bg-surface py-3.5 text-sm font-semibold text-error transition-colors hover:bg-error/5"
    >
      <LogOut size={18} />
      Se déconnecter
    </button>
  );
}