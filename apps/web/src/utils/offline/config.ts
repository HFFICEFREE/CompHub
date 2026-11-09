import type { User } from '@supabase/supabase-js'

/** Cookie lido pelos Server Components para saber quem e o jogador offline. */
export const OFFLINE_UID_COOKIE = 'comphub_offline_uid'

/** Avatar local (o Next serve `app/icon.png` em `/icon.png`). */
export const OFFLINE_AVATAR_URL = '/icon.png'

/**
 * `NEXT_PUBLIC_*` e inlined pelo Next no bundle do browser. No servidor a
 * mesma env e lida em runtime. Sem a flag, o app usa Supabase normalmente.
 */
export function isOfflineMode(): boolean {
    if (process.env.NEXT_PUBLIC_OFFLINE_MODE !== 'true') return false
    // Mesma protecao do backend: builds de producao nao entram em offline por
    // acidente. Para um build local de producao, opte explicitamente.
    if (
        process.env.NODE_ENV === 'production' &&
        process.env.NEXT_PUBLIC_ALLOW_OFFLINE_IN_PRODUCTION !== 'true'
    ) {
        return false
    }
    return true
}

export function offlineEmailForUid(uid: string): string {
    return `${uid.slice(0, 8)}@offline.local`
}

/** Mesmo formato sintetico do backend (`apps/api-nest/src/offline/offline.ts`). */
export function makeOfflineUser(uid: string): User {
    const email = offlineEmailForUid(uid)

    return {
        id: uid,
        email,
        user_metadata: {
            email,
            avatar_url: OFFLINE_AVATAR_URL,
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date(0).toISOString(),
    } as unknown as User
}

/**
 * No modo offline o access_token e o proprio uid (sem JWT). A mesma
 * validacao existe no backend para que um token malformado nao vire id.
 */
export function offlineUidFromToken(token: string | null | undefined): string | null {
    if (!isOfflineMode() || !token) return null

    const uid = token.trim()
    return /^[A-Za-z0-9._-]{1,128}$/.test(uid) ? uid : null
}

export function newOfflineUid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `offline-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
