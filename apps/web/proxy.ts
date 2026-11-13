import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"
import { isOfflineMode } from "@/utils/offline/config"

export async function proxy(request: NextRequest) {
  // Sem Supabase nao ha sessao para renovar; deixa o cookie offline intacto.
  if (isOfflineMode()) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
