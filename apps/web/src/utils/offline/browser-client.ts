import type { SupabaseClient } from '@supabase/supabase-js'
import {
    OFFLINE_UID_COOKIE,
    makeOfflineUser,
    newOfflineUid,
    offlineUidFromToken,
} from './config'
import { OfflineQueryBuilder, type OfflineQueryResult, type OfflineQuerySpec } from './query'

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null

    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
    return match ? decodeURIComponent(match[1]) : null
}

function readStoredUid(): string | null {
    if (typeof window === 'undefined') return null

    try {
        return window.localStorage.getItem(OFFLINE_UID_COOKIE)
    } catch {
        return null
    }
}

function currentUid(): string | null {
    // Sessao do navegador = cookie. O localStorage guarda a identidade para
    // recuperar o mesmo mundo local no proximo sign in, mas nao autentica
    // sozinho (senao o sign out pareceria nao fazer efeito no client).
    return offlineUidFromToken(readCookie(OFFLINE_UID_COOKIE))
}

function persistUid(uid: string): void {
    if (typeof document !== 'undefined') {
        // Cookie nao-httpOnly: o browser e os Server Components precisam ler.
        document.cookie = `${OFFLINE_UID_COOKIE}=${encodeURIComponent(uid)}; path=/; max-age=31536000; samesite=lax`
    }

    try {
        window.localStorage.setItem(OFFLINE_UID_COOKIE, uid)
    } catch {
        // localStorage indisponivel (modo privado antigo): o cookie basta.
    }
}

function clearSessionCookie(): void {
    if (typeof document !== 'undefined') {
        document.cookie = `${OFFLINE_UID_COOKIE}=; path=/; max-age=0; samesite=lax`
    }
    // O uid continua no localStorage: o proximo "sign in" recupera o mesmo
    // mundo local em vez de criar outro usuario do zero.
}

async function runQuery(spec: OfflineQuerySpec): Promise<OfflineQueryResult> {
    try {
        const response = await fetch('/api/offline/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(spec),
            cache: 'no-store',
        })

        if (!response.ok) {
            return { data: null, error: { message: `Offline API error (${response.status}).` } }
        }

        return (await response.json()) as OfflineQueryResult
    } catch (error) {
        return {
            data: null,
            error: { message: error instanceof Error ? error.message : 'Offline API unavailable.' },
        }
    }
}

/**
 * Cliente de browser que fala com o store local via `/api/offline/query`.
 * A interface imita o subconjunto do Supabase usado pelo app.
 */
export function createOfflineBrowserClient(): SupabaseClient {
    const client = {
        auth: {
            async getUser() {
                const uid = currentUid()
                return { data: { user: uid ? makeOfflineUser(uid) : null }, error: null }
            },
            async getSession() {
                const uid = currentUid()
                const user = uid ? makeOfflineUser(uid) : null
                return {
                    data: { session: uid && user ? { access_token: uid, user } : null },
                    error: null,
                }
            },
            async signInWithOAuth() {
                // Reaproveita a identidade anterior (localStorage) para o
                // mesmo navegador voltar ao mundo local que ja criou.
                const uid = offlineUidFromToken(readStoredUid()) ?? newOfflineUid()
                persistUid(uid)

                // O Supabase real navega o browser; reproduzimos o mesmo fluxo.
                window.location.assign('/app')
                return { data: { provider: 'offline', url: '/app' }, error: null }
            },
            async signOut() {
                clearSessionCookie()
                return { error: null }
            },
        },
        from(table: string) {
            return new OfflineQueryBuilder(table, runQuery)
        },
    }

    return client as unknown as SupabaseClient
}
