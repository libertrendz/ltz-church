/* PATH: lib/theme/applyTenantTheme.ts */

import { supabaseBrowser } from "../supabase/client";

export async function applyTenantTheme() {
  try {

    const supabase = supabaseBrowser();

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId) return;

    const { data: user } = await supabase
      .from("usuarios")
      .select("igreja_id")
      .eq("id", userId)
      .single();

    if (!user?.igreja_id) return;

    const { data: igreja } = await supabase
      .from("igrejas")
      .select("cor_primaria")
      .eq("id", user.igreja_id)
      .single();

    const accent = igreja?.cor_primaria;

    if (accent) {
      document.documentElement.style.setProperty("--accent", accent);
    }

  } catch (err) {
    console.warn("Theme load failed", err);
  }
}
