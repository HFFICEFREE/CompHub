import { Logger } from '@nestjs/common'
import type { RealtimePostgresDeletePayload, RealtimePostgresUpdatePayload } from '@supabase/supabase-js'
import { RealtimeService, type RealmRow } from './realtime.service'
import type { GameGateway } from '../sockets/game.gateway'
import type { SupabaseService } from '../supabase/supabase.service'

function realmRow(overrides: Partial<RealmRow> = {}): RealmRow {
    return {
        id: 'realm-1',
        map_data: {
            spawnpoint: { roomIndex: 0, x: 0, y: 0 },
            rooms: [{ name: 'Sala', tilemap: {} }],
        },
        share_id: 'share-1',
        only_owner: false,
        ...overrides,
    }
}

function updatePayload(neu: RealmRow, old: Partial<RealmRow>): RealtimePostgresUpdatePayload<RealmRow> {
    return { new: neu, old } as unknown as RealtimePostgresUpdatePayload<RealmRow>
}

function deletePayload(old: Partial<RealmRow>): RealtimePostgresDeletePayload<RealmRow> {
    return { old } as unknown as RealtimePostgresDeletePayload<RealmRow>
}

describe('RealtimeService', () => {
    let kickSessionPlayers: jest.Mock
    let service: RealtimeService

    function makeService(options: { hasCredentials: boolean; channel?: jest.Mock }): RealtimeService {
        kickSessionPlayers = jest.fn()
        const gateway = { kickSessionPlayers } as unknown as GameGateway

        const channel = options.channel ?? jest.fn()
        const supabase = {
            hasCredentials: options.hasCredentials,
            client: { channel },
        } as unknown as SupabaseService

        return new RealtimeService(supabase, gateway)
    }

    describe('onApplicationBootstrap (inscricao)', () => {
        it('nao abre canal quando nao ha credenciais', () => {
            const channel = jest.fn()
            service = makeService({ hasCredentials: false, channel })

            service.onApplicationBootstrap()

            expect(channel).not.toHaveBeenCalled()
        })

        it('assina UPDATE e DELETE da tabela realms e faz subscribe', () => {
            const on = jest.fn().mockReturnThis()
            const subscribe = jest.fn().mockReturnThis()
            const channel = jest.fn().mockReturnValue({ on, subscribe })
            service = makeService({ hasCredentials: true, channel })

            service.onApplicationBootstrap()

            expect(channel).toHaveBeenCalledWith('realms')
            expect(on).toHaveBeenCalledTimes(2)
            expect(on.mock.calls[0][0]).toBe('postgres_changes')
            expect(on.mock.calls[0][1]).toMatchObject({ event: 'UPDATE', table: 'realms', schema: 'public' })
            expect(on.mock.calls[1][1]).toMatchObject({ event: 'DELETE', table: 'realms', schema: 'public' })
            expect(subscribe).toHaveBeenCalledTimes(1)
        })

        it('desinscreve o canal no shutdown', () => {
            const unsubscribe = jest.fn()
            const on = jest.fn().mockReturnThis()
            const subscribe = jest.fn().mockReturnValue({ unsubscribe })
            const channel = jest.fn().mockReturnValue({ on, subscribe })
            service = makeService({ hasCredentials: true, channel })

            service.onApplicationBootstrap()
            service.onModuleDestroy()

            expect(unsubscribe).toHaveBeenCalledTimes(1)
        })

        it('nao quebra no shutdown quando nunca chegou a assinar', () => {
            service = makeService({ hasCredentials: false })

            expect(() => service.onModuleDestroy()).not.toThrow()
        })
    })

    describe('onRealmUpdate', () => {
        it('derruba a sessao quando o map_data muda', () => {
            service = makeService({ hasCredentials: false })
            const antigo = realmRow()
            const novo = realmRow({
                map_data: {
                    spawnpoint: { roomIndex: 0, x: 0, y: 0 },
                    rooms: [{ name: 'Sala', tilemap: { '1, 1': { impassable: true } } }],
                },
            })

            service.onRealmUpdate(updatePayload(novo, antigo))

            expect(kickSessionPlayers).toHaveBeenCalledWith('realm-1', 'This realm has been changed by the owner.')
        })

        it('derruba a sessao quando o share_id muda (link de convite rotacionou)', () => {
            service = makeService({ hasCredentials: false })

            service.onRealmUpdate(updatePayload(realmRow({ share_id: 'share-2' }), realmRow()))

            expect(kickSessionPlayers).toHaveBeenCalledWith('realm-1', 'This realm has been changed by the owner.')
        })

        it('derruba a sessao quando o only_owner muda (entrou/saiu do modo privado)', () => {
            service = makeService({ hasCredentials: false })

            service.onRealmUpdate(updatePayload(realmRow({ only_owner: true }), realmRow()))

            expect(kickSessionPlayers).toHaveBeenCalledWith('realm-1', 'This realm has been changed by the owner.')
        })

        it('nao derruba quando nada relevante mudou', () => {
            service = makeService({ hasCredentials: false })

            // mesmos valores em todos os campos que disparam refresh
            service.onRealmUpdate(updatePayload(realmRow(), realmRow()))

            expect(kickSessionPlayers).not.toHaveBeenCalled()
        })

        it('ignora update quando nao ha payload old (undefined)', () => {
            const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
            service = makeService({ hasCredentials: false })

            service.onRealmUpdate(updatePayload(realmRow(), undefined as unknown as Partial<RealmRow>))

            expect(kickSessionPlayers).not.toHaveBeenCalled()
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('REPLICA IDENTITY FULL'))
            warn.mockRestore()
        })

        it('com old vazio (REPLICA IDENTITY ausente) derruba a sessao — comportamento herdado do Express', () => {
            // `!{}` e false no Express: o guard `if (!old)` so pega old
            // ausente. O payload sem colunas antigas compara map_data contra
            // undefined, da refresh=true e cai no kick. Conservador (derruba
            // em vez de deixar mundo stale) e mantido em paridade.
            service = makeService({ hasCredentials: false })

            service.onRealmUpdate(updatePayload(realmRow(), {} as Partial<RealmRow>))

            expect(kickSessionPlayers).toHaveBeenCalledWith('realm-1', 'This realm has been changed by the owner.')
        })
    })

    describe('onRealmDelete', () => {
        it('derruba a sessao quando o realm e apagado', () => {
            service = makeService({ hasCredentials: false })

            service.onRealmDelete(deletePayload({ id: 'realm-1' }))

            expect(kickSessionPlayers).toHaveBeenCalledWith('realm-1', 'This realm is no longer available.')
        })

        it('nao faz nada quando o payload nao traz a PK', () => {
            service = makeService({ hasCredentials: false })

            service.onRealmDelete(deletePayload({}))

            expect(kickSessionPlayers).not.toHaveBeenCalled()
        })
    })
})
