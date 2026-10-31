import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { SessionManager, defaultSkin, type RealmData } from '@comphub/core'
import { AppModule } from './app.module'
import { SupabaseService } from './supabase/supabase.service'

function makeRealmData(roomCount = 1): RealmData {
    return {
        spawnpoint: { roomIndex: 0, x: 0, y: 0 },
        rooms: Array.from({ length: roomCount }, (_, i) => ({
            name: `Room ${i}`,
            tilemap: {},
        })),
    }
}

describe('Rotas HTTP (getPlayersInRoom, getPlayerCounts, agoraChannel)', () => {
    let app: INestApplication
    let sessions: SessionManager
    let getUser: jest.Mock

    const validToken = 'token-valido'
    const uid = 'uid-1'

    beforeAll(async () => {
        sessions = new SessionManager()
        getUser = jest.fn()

        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(SessionManager)
            .useValue(sessions)
            .overrideProvider(SupabaseService)
            .useValue({ client: { auth: { getUser } } })
            .compile()

        app = moduleRef.createNestApplication()
        await app.init()

        sessions.createSession('realm-1', makeRealmData(2))
        sessions.addPlayerToSession('socket-1', 'realm-1', uid, 'Alice', defaultSkin)
    })

    afterAll(async () => {
        await app.close()
    })

    beforeEach(() => {
        getUser.mockReset()
        getUser.mockResolvedValue({ data: { user: { id: uid } }, error: null })
    })

    function authed(req: request.Test): request.Test {
        return req.set('Authorization', `Bearer ${validToken}`)
    }

    describe('autenticacao (guard comum)', () => {
        it('rejeita sem header Authorization com 401', async () => {
            const res = await request(app.getHttpServer()).get('/getPlayersInRoom?roomIndex=0').expect(401)
            expect(res.body.message).toBe('No access token provided')
        })

        it('rejeita token invalido com 401', async () => {
            getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } })

            const res = await authed(request(app.getHttpServer()).get('/getPlayersInRoom?roomIndex=0')).expect(401)
            expect(res.body.message).toBe('Invalid access token')
        })
    })

    describe('GET /getPlayersInRoom', () => {
        it('retorna os jogadores da sala sem dados internos de socket', async () => {
            const res = await authed(request(app.getHttpServer()).get('/getPlayersInRoom?roomIndex=0')).expect(200)

            expect(res.body.players).toHaveLength(1)
            expect(res.body.players[0]).toEqual({ uid, username: 'Alice', x: 0, y: 0, skin: defaultSkin })
            // Paridade com o DTO publico do Express: socketId/proximityId/room
            // nao podem aparecer na resposta (regressao do PR #43)
            expect(res.body.players[0]).not.toHaveProperty('socketId')
            expect(res.body.players[0]).not.toHaveProperty('proximityId')
        })

        it('valida a querystring com 400', async () => {
            const res = await authed(request(app.getHttpServer()).get('/getPlayersInRoom')).expect(400)
            expect(res.body.message).toBe('Invalid parameters')
        })

        it('responde 400 quando o usuario nao esta em nenhum realm', async () => {
            getUser.mockResolvedValue({ data: { user: { id: 'uid-fora' } }, error: null })

            const res = await authed(request(app.getHttpServer()).get('/getPlayersInRoom?roomIndex=0')).expect(400)
            expect(res.body.message).toBe('User not in a realm.')
        })
    })

    describe('GET /getPlayerCounts', () => {
        it('retorna a contagem de realms existentes e 0 para os demais', async () => {
            const res = await authed(
                request(app.getHttpServer()).get('/getPlayerCounts?realmIds=realm-1,realm-inexistente'),
            ).expect(200)

            expect(res.body.playerCounts).toEqual([1, 0])
        })

        it('rejeita mais de 100 realms com 400', async () => {
            const realmIds = Array.from({ length: 101 }, (_, i) => `r${i}`).join(',')

            const res = await authed(request(app.getHttpServer()).get(`/getPlayerCounts?realmIds=${realmIds}`)).expect(
                400,
            )
            expect(res.body.message).toBe('Too many server IDs')
        })
    })

    describe('GET /agoraChannel', () => {
        it('deriva o canal de voz quando o jogador esta em proximidade', async () => {
            sessions.getSession('realm-1').getPlayer(uid).proximityId = 'prox-1'

            const res = await authed(request(app.getHttpServer()).get('/agoraChannel')).expect(200)
            expect(res.body.channelName).toMatch(/^[0-9a-f]{16}$/)
        })

        it('responde 403 quando nao ha canal de voz', async () => {
            sessions.getSession('realm-1').getPlayer(uid).proximityId = null

            const res = await authed(request(app.getHttpServer()).get('/agoraChannel')).expect(403)
            expect(res.body.message).toBe('User is not in a voice channel.')
        })

        it('responde 400 quando o usuario nao esta em nenhum realm', async () => {
            getUser.mockResolvedValue({ data: { user: { id: 'uid-fora' } }, error: null })

            const res = await authed(request(app.getHttpServer()).get('/agoraChannel')).expect(400)
            expect(res.body.message).toBe('User not in a realm.')
        })
    })
})
