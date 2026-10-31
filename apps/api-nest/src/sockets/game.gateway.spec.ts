import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client'
import { SessionManager, defaultSkin, type RealmData } from '@comphub/core'
import { AppModule } from '../app.module'
import { SupabaseService } from '../supabase/supabase.service'

const SHARE_ID = 'share-1'

function makeRealmData(): RealmData {
    return {
        spawnpoint: { roomIndex: 0, x: 0, y: 0 },
        rooms: [
            {
                name: 'Principal',
                tilemap: {
                    // Destino bloqueado: usado para provar que o servidor
                    // recusa movimento para tile impassable
                    '5, 5': { impassable: true },
                },
            },
        ],
    }
}

type RealmRow = {
    owner_id: string
    share_id: string
    map_data: RealmData
    only_owner: boolean
}

function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 4_000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout esperando o evento '${event}'`)), timeoutMs)
        socket.once(event, (payload: T) => {
            clearTimeout(timer)
            resolve(payload)
        })
    })
}

function settle(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('GameGateway (Socket.io)', () => {
    let app: INestApplication
    let sessions: SessionManager
    let baseUrl: string
    let realms: Map<string, RealmRow>
    const clients: ClientSocket[] = []

    beforeAll(async () => {
        sessions = new SessionManager()
        realms = new Map()

        const supabaseMock = {
            client: {
                auth: {
                    getUser: jest.fn(async (token: string) => {
                        if (token === 'token-invalido') {
                            return { data: { user: null }, error: { message: 'invalid token' } }
                        }
                        if (token === 'token-fixo') {
                            return {
                                data: { user: { id: 'uid-fixo', user_metadata: { email: 'fixo@ex.com' } } },
                                error: null,
                            }
                        }
                        const uid = token.split(':')[1]
                        if (!uid) {
                            return { data: { user: null }, error: { message: 'invalid token' } }
                        }
                        return {
                            data: { user: { id: uid, user_metadata: { email: `${uid}@ex.com` } } },
                            error: null,
                        }
                    }),
                },
                from: jest.fn((table: string) => ({
                    select: () => ({
                        eq: (_column: string, value: string) => ({
                            single: async () => {
                                if (table === 'profiles') {
                                    return { data: { skin: defaultSkin }, error: null }
                                }
                                const realm = realms.get(value)
                                if (!realm) return { data: null, error: { message: 'not found' } }
                                return { data: realm, error: null }
                            },
                        }),
                    }),
                })),
            },
        }

        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(SessionManager)
            .useValue(sessions)
            .overrideProvider(SupabaseService)
            .useValue(supabaseMock)
            .compile()

        app = moduleRef.createNestApplication()
        await app.listen(0)
        baseUrl = (await app.getUrl()).replace('::1', 'localhost')
    })

    afterAll(async () => {
        for (const client of clients) client.close()
        await app.close()
    })

    /** Conecta um cliente. O mock de auth deriva o uid do proprio token (`token:<uid>`). */
    function connect(uid: string, opts: { token?: string; queryUid?: string } = {}): Promise<ClientSocket> {
        const token = opts.token ?? `token:${uid}`
        return new Promise((resolve, reject) => {
            const socket = ioClient(baseUrl, {
                transports: ['polling'],
                forceNew: true,
                reconnection: false,
                query: { uid: opts.queryUid ?? uid },
                extraHeaders: { Authorization: `Bearer ${token}` },
            })
            clients.push(socket)

            const timer = setTimeout(() => reject(new Error('Timeout na conexao')), 4_000)
            socket.once('connect', () => {
                clearTimeout(timer)
                resolve(socket)
            })
            socket.once('connect_error', (err) => {
                clearTimeout(timer)
                reject(Object.assign(new Error(err.message), { socket }))
            })
        })
    }

    /** Conecta sem resolver a promessa — para observar connect_error. */
    function attemptConnection(
        opts: { token?: string; uid?: string },
    ): Promise<{ message: string; socket: ClientSocket }> {
        return new Promise((resolve) => {
            const socket = ioClient(baseUrl, {
                transports: ['polling'],
                forceNew: true,
                reconnection: false,
                query: { uid: opts.uid ?? 'uid-x' },
                extraHeaders: { Authorization: `Bearer ${opts.token ?? 'token:x'}` },
            })
            clients.push(socket)

            socket.once('connect_error', (err) => resolve({ message: err.message, socket }))
            socket.once('connect', () => resolve({ message: 'CONECTOU', socket }))
        })
    }

    async function join(socket: ClientSocket, realmId: string, shareId = SHARE_ID): Promise<void> {
        const joined = waitFor(socket, 'joinedRealm')
        socket.emit('joinRealm', { realmId, shareId })
        await joined
    }

    async function positionOf(uid: string): Promise<{ x: number; y: number }> {
        const res = await request(app.getHttpServer())
            .get('/getPlayersInRoom?roomIndex=0')
            .set('Authorization', `Bearer token:${uid}`)
            .expect(200)

        return res.body.players.find((p: { uid: string }) => p.uid === uid)
    }

    function givenRealm(id: string, ownerId: string, overrides: Partial<RealmRow> = {}): void {
        realms.set(id, {
            owner_id: ownerId,
            share_id: SHARE_ID,
            map_data: makeRealmData(),
            only_owner: false,
            ...overrides,
        })
    }

    describe('handshake', () => {
        it('rejeita conexao sem token de acesso', async () => {
            const { message, socket } = await attemptConnection({ token: '' })
            expect(message).toBe('Invalid access token or uid.')
            socket.close()
        })

        it('rejeita token invalido', async () => {
            const { message, socket } = await attemptConnection({ token: 'token-invalido' })
            expect(message).toBe('Invalid access token.')
            socket.close()
        })

        it('rejeita uid que nao corresponde ao token', async () => {
            const { message, socket } = await attemptConnection({ token: 'token-fixo', uid: 'outro-uid' })
            expect(message).toBe('Invalid uid.')
            socket.close()
        })
    })

    describe('joinRealm', () => {
        it('rejeita realm inexistente', async () => {
            const socket = await connect('uid-nao-existe')

            const failed = waitFor<string>(socket, 'failedToJoinRoom')
            socket.emit('joinRealm', { realmId: 'sem-cadastro', shareId: SHARE_ID })
            expect(await failed).toBe('Space not found.')

            socket.close()
        })

        it('rejeita payload malformado', async () => {
            const socket = await connect('uid-payload-ruim')

            const failed = waitFor<string>(socket, 'failedToJoinRoom')
            socket.emit('joinRealm', { realmId: 123 })
            expect(await failed).toBe('Invalid request data.')

            socket.close()
        })

        it('adiciona o dono na sessao e notifica os demais da sala', async () => {
            const uidDono = 'uid-dono'
            givenRealm('realm-dono', uidDono)

            const observador = await connect('uid-observador')
            await join(observador, 'realm-dono')

            const joined = waitFor(observador, 'playerJoinedRoom')
            const dono = await connect(uidDono)
            await join(dono, 'realm-dono')

            const player = await joined
            expect(player).toMatchObject({ uid: uidDono, x: 0, y: 0, room: 0, skin: defaultSkin })

            observador.close()
            dono.close()
        })

        it('bloqueia quando o realm e only_owner e quem entra nao e o dono', async () => {
            const uidDono = 'uid-dono-privado'
            givenRealm('realm-privado', uidDono, { only_owner: true })

            const socket = await connect('uid-intruso')
            const failed = waitFor<string>(socket, 'failedToJoinRoom')
            socket.emit('joinRealm', { realmId: 'realm-privado', shareId: SHARE_ID })
            expect(await failed).toBe('This realm is private right now. Come back later!')

            socket.close()
        })

        it('recusa quando o share link mudou', async () => {
            const uidDono = 'uid-dono-link'
            givenRealm('realm-link', uidDono)

            const socket = await connect('uid-link-antigo')
            const failed = waitFor<string>(socket, 'failedToJoinRoom')
            socket.emit('joinRealm', { realmId: 'realm-link', shareId: 'share-antigo' })
            expect(await failed).toBe('The share link has been changed.')

            socket.close()
        })
    })

    describe('movePlayer', () => {
        it('aceita destino multi-tile: o cliente emite o fim do BFS, nao passo a passo', async () => {
            // Regressao do #45: exigir adjacencia (distancia == 1) rejeitava
            // todo movimento legitimo — o jogador andava so no cliente e os
            // demais o viam parado, com a proximidade dessincronizada.
            const uid = 'uid-move-multi'
            givenRealm('realm-move-multi', uid)

            const socket = await connect(uid)
            await join(socket, 'realm-move-multi')

            socket.emit('movePlayer', { x: 3, y: 3 })
            await settle(250)

            expect(await positionOf(uid)).toMatchObject({ x: 3, y: 3 })

            socket.close()
        })

        it('recusa destino em tile impassable', async () => {
            const uid = 'uid-move-bloqueado'
            givenRealm('realm-move-bloqueado', uid)

            const socket = await connect(uid)
            await join(socket, 'realm-move-bloqueado')

            socket.emit('movePlayer', { x: 5, y: 5 })
            await settle(250)

            expect(await positionOf(uid)).toMatchObject({ x: 0, y: 0 })

            socket.close()
        })

        it('recusa coordenada nao inteira e fora de alcance', async () => {
            const uid = 'uid-move-invalido'
            givenRealm('realm-move-invalido', uid)

            const socket = await connect(uid)
            await join(socket, 'realm-move-invalido')

            socket.emit('movePlayer', { x: 1.5, y: 1 })
            socket.emit('movePlayer', { x: 99_999, y: 99_999 })
            await settle(250)

            expect(await positionOf(uid)).toMatchObject({ x: 0, y: 0 })

            socket.close()
        })

        it('aplica o rate limit por jogador (30/s): o 31o movimento e descartado', async () => {
            const uid = 'uid-move-ratelimit'
            givenRealm('realm-move-ratelimit', uid)

            const socket = await connect(uid)
            await join(socket, 'realm-move-ratelimit')

            for (let i = 0; i < 30; i++) {
                socket.emit('movePlayer', { x: 1, y: 1 })
            }
            // 31o: outro destino, fora da janela — tem que ser engolido
            socket.emit('movePlayer', { x: 3, y: 3 })
            await settle(400)

            expect(await positionOf(uid)).toMatchObject({ x: 1, y: 1 })

            socket.close()
        })
    })

    describe('disconnect', () => {
        it('faz logout e notifica a sala com playerLeftRoom', async () => {
            const uidSai = 'uid-sai'
            const uidFica = 'uid-fica'
            givenRealm('realm-saida', uidSai)

            const quemFica = await connect(uidFica)
            await join(quemFica, 'realm-saida')

            const quemSai = await connect(uidSai)
            await join(quemSai, 'realm-saida')

            const notified = waitFor<string>(quemFica, 'playerLeftRoom')
            quemSai.close()

            expect(await notified).toBe(uidSai)

            // Saiu da sessao: a rota HTTP nao deve mais ve-lo
            const res = await request(app.getHttpServer())
                .get('/getPlayersInRoom?roomIndex=0')
                .set('Authorization', `Bearer token:${uidSai}`)
                .expect(400)
            expect(res.body.message).toBe('User not in a realm.')

            quemFica.close()
        })
    })
})
