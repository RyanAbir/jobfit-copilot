import { createClient } from "@supabase/supabase-js";

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("Supabase admin client can only be used on the server.");
  }
}

function getAdminSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return { supabaseUrl, serviceRoleKey };
}

export function createAdminClient() {
  assertServerOnly();

  const { supabaseUrl, serviceRoleKey } = getAdminSupabaseConfig();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
