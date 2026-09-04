import { createClient } from "@/lib/supabase/client";

export async function canUseLocation() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data } = await supabase
    .from("profiles")
    .select("location_enabled")
    .eq("id", user.id)
    .single();

  return data?.location_enabled ?? true;
}