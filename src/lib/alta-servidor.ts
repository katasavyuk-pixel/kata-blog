import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { altaConfirmada } from "@/lib/alta";

export async function haConfirmadoAlta(): Promise<boolean> {
  const cookie = (await cookies()).get("nbi_subscriber")?.value;
  return altaConfirmada({ supabaseConfigurado: isSupabaseConfigured(), cookie });
}
