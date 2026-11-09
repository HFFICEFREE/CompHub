import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client'
import type { RealmData } from '@comphub/core'
import { AppModule } from '../app.module'

const UID = 'devuser'

function makeRealmData(): RealmData {
    return {
        spawnpoint: { roomIndex: 0, x: 0, y: 0 },
        rooms: [{ name: 'Sala', tilemap: {} }],
    }
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

describe('modo offline (Socket.io + HTTP)', () => {
    let app: INestApplication
    let baseUrl: string
    const clients: ClientSocket[] = []
    const originalOfflineMode = process.env.OFFLINE_MODE

    beforeAll(async () => {
        process.env.OFFLINE_MODE = 'true'

        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
        app = moduleRef.createNestApplication()
        await app.listen(0)
        baseUrl = (await app.getUrl()).replace('::1', 'localhost')
    })

    afterAll(async () => {
        for (const client of clients) client.close()
        await app.close()

        if (originalOfflineMode === undefined) delete process.env.OFFLINE_MODE
        else process.env.OFFLINE_MODE = originalOfflineMode
    })

    function connect(uid = UID, token = uid): Promise<ClientSocket> {
        return new Promise((resolve, reject) => {
            const socket = ioClient(baseUrl, {
                transports: ['polling'],
                forceNew: true,
                reconnection: false,
                query: { uid },
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
                reject(new Error(err.message))
            })
        })
    }

    it('aceita o uid como token no handshake', async () => {
        const socket = await connect()
        expect(socket.connected).toBe(true)
        socket.close()
    })

    it('recusa uid diferente do token', async () => {
        await expect(connect('outro-uid', UID)).rejects.toThrow('Invalid uid.')
    })

    it('entra no realm com o mapa enviado pelo cliente', async () => {
        const socket = await connect()
        const joined = waitFor(socket, 'joinedRealm')

        socket.emit('joinRealm', {
            realmId: 'realm-offline',
            shareId: 'share-ignorado',
            mapData: makeRealmData(),
            skin: '002',
        })

        await joined

        const res = await request(app.getHttpServer())
            .get('/getPlayersInRoom?roomIndex=0')
            .set('Authorization', `Bearer ${UID}`)
            .expect(200)

        expect(res.body.players).toEqual([
            expect.objectContaining({ uid: UID, x: 0, y: 0, skin: '002', username: 'devuser' }),
        ])

        socket.close()
    })

    it('recusa join offline sem mapa valido', async () => {
        const socket = await connect()
        const failed = waitFor<string>(socket, 'failedToJoinRoom')

        socket.emit('joinRealm', { realmId: 'realm-sem-mapa', shareId: 'x' })

        expect(await failed).toBe('Invalid map data.')
        socket.close()
    })

    it('responde getPlayerCounts com o token offline', async () => {
        const socket = await connect()
        const joined = waitFor(socket, 'joinedRealm')
        socket.emit('joinRealm', {
            realmId: 'realm-contagem',
            shareId: 'share-ignorado',
            mapData: makeRealmData(),
        })
        await joined

        const res = await request(app.getHttpServer())
            .get('/getPlayerCounts?realmIds=realm-contagem,realm-vazio')
            .set('Authorization', `Bearer ${UID}`)
            .expect(200)

        expect(res.body.playerCounts).toEqual([1, 0])
        socket.close()
    })
})
