import { createClient } from "@supabase/supabase-js";

// Estes dois valores são públicos por design (a segurança fica nas regras/RLS
// do banco). A chave secreta NUNCA fica aqui.
export const SUPABASE_URL = "https://ipdjyirkdiplkjnybych.supabase.co";
export const SUPABASE_KEY = "sb_publishable_vZOlQteZt384OsNlS0rrrg_tfq8LRsZ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
