import 'server-only'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
    OFFLINE_UID_COOKIE,
    makeOfflineUser,
    offlineUidFromToken,
} from './config'
import { OfflineQueryBuilder } from './query'
import { ensureOfflineUser, executeOfflineQuery } from './store'

/**
 * Cliente no formato do Supabase para Server Components e Server Actions.
 * `uidOverride` e o access_token dos server actions (no offline, o proprio
 * uid); sem ele, o usuario vem do cookie definido na tela de signin.
 */
export async function createOfflineServerClient(uidOverride?: string | null): Promise<SupabaseClient> {
    // No Next 15 `cookies()` e assincrono.
    const uid =
        uidOverride === undefined
            ? (await cookies()).get(OFFLINE_UID_COOKIE)?.value ?? null
            : offlineUidFromToken(uidOverride)

    const user = uid ? makeOfflineUser(uid) : null
    const session = uid && user ? { access_token: uid, user } : null

    if (uid) {
        ensureOfflineUser(uid)
    }

    const client = {
        auth: {
            async getUser(token?: string) {
                const tokenUid = token === undefined ? uid : offlineUidFromToken(token)
                const tokenUser = tokenUid ? makeOfflineUser(tokenUid) : null
                return { data: { user: tokenUser }, error: null }
            },
            async getSession() {
                return { data: { session }, error: null }
            },
            async signOut() {
                return { error: null }
            },
        },
        from(table: string) {
            return new OfflineQueryBuilder(table, executeOfflineQuery)
        },
    }

    return client as unknown as SupabaseClient
}
