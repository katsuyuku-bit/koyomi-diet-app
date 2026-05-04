import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn("NEXT_PUBLIC_SUPABASE_URL is missing");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);