import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export type Resource = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  requires_email: boolean;
  download_count: number;
};

/** Published lead magnets. Returns [] when Supabase isn't configured yet (Fase 0/scaffolding). */
export async function getPublishedResources(): Promise<Resource[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("resources")
    .select("id, slug, title, description, requires_email, download_count")
    .eq("published", true)
    .order("created_at", { ascending: false });
  return (data as Resource[] | null) ?? [];
}
