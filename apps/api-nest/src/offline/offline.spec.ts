import {
    isOfflineMode,
    isRealmData,
    offlineUidFromToken,
    offlineUser,
    offlineUserFromToken,
} from './offline'

describe('modo offline', () => {
    const original = {
        OFFLINE_MODE: process.env.OFFLINE_MODE,
        NODE_ENV: process.env.NODE_ENV,
        ALLOW_OFFLINE_IN_PRODUCTION: process.env.ALLOW_OFFLINE_IN_PRODUCTION,
    }

    afterEach(() => {
        process.env.OFFLINE_MODE = original.OFFLINE_MODE
        process.env.NODE_ENV = original.NODE_ENV
        process.env.ALLOW_OFFLINE_IN_PRODUCTION = original.ALLOW_OFFLINE_IN_PRODUCTION

        if (original.OFFLINE_MODE === undefined) delete process.env.OFFLINE_MODE
        if (original.ALLOW_OFFLINE_IN_PRODUCTION === undefined) {
            delete process.env.ALLOW_OFFLINE_IN_PRODUCTION
        }
    })

    it('so ativa com OFFLINE_MODE=true', () => {
        delete process.env.OFFLINE_MODE
        expect(isOfflineMode()).toBe(false)

        process.env.OFFLINE_MODE = 'true'
        expect(isOfflineMode()).toBe(true)
    })

    it('nunca ativa em producao sem opt-in explicito', () => {
        process.env.OFFLINE_MODE = 'true'
        process.env.NODE_ENV = 'production'
        delete process.env.ALLOW_OFFLINE_IN_PRODUCTION
        expect(isOfflineMode()).toBe(false)

        process.env.ALLOW_OFFLINE_IN_PRODUCTION = 'true'
        expect(isOfflineMode()).toBe(true)
    })

    it('aceita o uid como token e recusa valores malformados', () => {
        process.env.OFFLINE_MODE = 'true'

        expect(offlineUidFromToken('dev-user')).toBe('dev-user')
        expect(offlineUidFromToken('00000000-0000-4000-8000-000000000000')).toBe(
            '00000000-0000-4000-8000-000000000000',
        )
        expect(offlineUidFromToken('../etc/passwd')).toBeNull()
        expect(offlineUidFromToken('')).toBeNull()
        expect(offlineUidFromToken('a'.repeat(129))).toBeNull()
    })

    it('ignora o token quando o modo esta desligado', () => {
        delete process.env.OFFLINE_MODE
        expect(offlineUidFromToken('dev-user')).toBeNull()
        expect(offlineUserFromToken('dev-user')).toBeNull()
    })

    it('sintetiza o usuario no formato do Supabase', () => {
        process.env.OFFLINE_MODE = 'true'

        const user = offlineUserFromToken('devuser')
        expect(user).toMatchObject({
            id: 'devuser',
            email: 'devuser@offline.local',
            user_metadata: {
                email: 'devuser@offline.local',
                avatar_url: '/icon.png',
            },
        })
        expect(offlineUser('devuser')).toEqual(user)
    })

    it('valida o mapa enviado no join offline', () => {
        const valid = {
            spawnpoint: { roomIndex: 0, x: 1, y: 2 },
            rooms: [{ name: 'Sala', tilemap: {} }],
        }

        expect(isRealmData(valid)).toBe(true)
        expect(isRealmData({ rooms: [] })).toBe(false)
        expect(isRealmData({ spawnpoint: { roomIndex: 0, x: 0, y: 0 } })).toBe(false)
        expect(isRealmData({ spawnpoint: { roomIndex: 0.5, x: 0, y: 0 }, rooms: [] })).toBe(false)
        expect(isRealmData(null)).toBe(false)
        expect(isRealmData('mapa')).toBe(false)
    })
})
