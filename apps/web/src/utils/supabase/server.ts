import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isOfflineMode } from "@/utils/offline/config";
import { createOfflineServerClient } from "@/utils/offline/server-client";

export const createClient = async () => {
  if (isOfflineMode()) {
    return createOfflineServerClient();
  }

  // No Next 15 `cookies()` e assincrono.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `setAll` foi chamado de um Server Component. Pode ser ignorado
            // se houver middleware renovando a sessao.
          }
        },
      },
    },
  );
};

export const createUserClient = async (accessToken: string) => {
  if (isOfflineMode()) {
    return createOfflineServerClient(accessToken);
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
};
