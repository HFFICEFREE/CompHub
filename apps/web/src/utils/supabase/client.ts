import { createBrowserClient } from "@supabase/ssr";
import { isOfflineMode } from "@/utils/offline/config";
import { createOfflineBrowserClient } from "@/utils/offline/browser-client";

export const createClient = () => {
  if (isOfflineMode()) {
    return createOfflineBrowserClient();
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
};
