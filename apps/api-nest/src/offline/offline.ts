import type { User } from '@supabase/supabase-js'
import type { RealmData } from '@comphub/core'

/**
 * Modo offline de desenvolvimento: a API aceita como token o proprio uid do
 * jogador, sem falar com o Supabase. E um bypass de autenticacao, entao fica
 * desligado em producao mesmo que a env esteja setada por engano.
 */
export function isOfflineMode(): boolean {
    if (process.env.OFFLINE_MODE !== 'true') return false
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_OFFLINE_IN_PRODUCTION !== 'true') {
        return false
    }
    return true
}

/**
 * No modo offline o token e o uid (sem prefixo). Restringimos os caracteres
 * para evitar que headers malformados virem ids estranhos — UUIDs e ids de
 * teste como `dev-user` passam.
 */
export function offlineUidFromToken(token: string | undefined): string | null {
    if (!isOfflineMode() || !token) return null

    const uid = token.trim()
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(uid)) return null

    return uid
}

/** Identidade sintetica no formato do Supabase (`user.user_metadata.email`). */
export function offlineUser(uid: string): User {
    const email = `${uid.slice(0, 8)}@offline.local`

    return {
        id: uid,
        email,
        user_metadata: {
            email,
            avatar_url: '/icon.png',
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date(0).toISOString(),
    } as unknown as User
}

export function offlineUserFromToken(token: string | undefined): User | null {
    const uid = offlineUidFromToken(token)
    return uid ? offlineUser(uid) : null
}

/** Validacao minima do mapa enviado pelo cliente no join offline. */
export function isRealmData(value: unknown): value is RealmData {
    if (!value || typeof value !== 'object') return false

    const map = value as Partial<RealmData>
    if (!Array.isArray(map.rooms)) return false
    if (!map.spawnpoint || typeof map.spawnpoint !== 'object') return false

    return (
        Number.isInteger(map.spawnpoint.roomIndex) &&
        Number.isInteger(map.spawnpoint.x) &&
        Number.isInteger(map.spawnpoint.y)
    )
}
