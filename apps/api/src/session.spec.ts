import { RealmData, Session, SessionManager, defaultSkin } from './session'

function makeRealmData(roomCount = 1): RealmData {
    return {
        spawnpoint: { roomIndex: 0, x: 0, y: 0 },
        rooms: Array.from({ length: roomCount }, (_, i) => ({
            name: `Room ${i}`,
            tilemap: {},
        })),
    }
}

describe('Session', () => {
    let session: Session

    beforeEach(() => {
        session = new Session('realm-1', makeRealmData())
    })

    it('adiciona o jogador no spawnpoint', () => {
        session.addPlayer('socket-1', 'uid-1', 'Alice', defaultSkin)

        const player = session.getPlayer('uid-1')
        expect(player).toMatchObject({ x: 0, y: 0, room: 0, socketId: 'socket-1', skin: defaultSkin })
        expect(session.getPlayerCount()).toBe(1)
        expect(session.getPlayersInRoom(0)).toHaveLength(1)
    })

    it('mantém os demais jogadores no índice quando alguém sai do mesmo tile', () => {
        // Dois jogadores nascem exatamente no mesmo tile (spawnpoint)
        session.addPlayer('socket-1', 'uid-1', 'Alice', defaultSkin)
        session.addPlayer('socket-2', 'uid-2', 'Bob', defaultSkin)
        expect(session.getPlayerCount()).toBe(2)

        session.removePlayer('uid-1')

        // Regressão: removePlayer apagava o Set inteiro da coordenada,
        // fazendo o Bob "sumir" do índice de posições (quebra a proximidade)
        const players = session.getPlayersInRoom(0)
        expect(players).toHaveLength(1)
        expect(players[0].uid).toBe('uid-2')

        // O Bob ainda deve estar indexado na coordenada (0, 0)
        const changed = session.movePlayer('uid-2', 0, 0)
        expect(session.getPlayer('uid-2')).toMatchObject({ x: 0, y: 0 })
        // mover para o mesmo tile não deveria inventar estado inconsistente
        expect(changed).toBeDefined()
        expect(session.getPlayerCount()).toBe(1)
    })

    it('movePlayer atualiza o índice de posições (coordenada antiga é liberada)', () => {
        session.addPlayer('socket-1', 'uid-1', 'Alice', defaultSkin)

        session.movePlayer('uid-1', 5, 5)

        expect(session.getPlayer('uid-1')).toMatchObject({ x: 5, y: 5 })
        // Mover de volta para o tile original não pode quebrar nada
        session.movePlayer('uid-1', 0, 0)
        expect(session.getPlayer('uid-1')).toMatchObject({ x: 0, y: 0 })
        expect(session.getPlayerCount()).toBe(1)
    })

    it('jogadores próximos (<= 3 tiles) compartilham o mesmo proximityId', () => {
        session.addPlayer('socket-1', 'uid-1', 'Alice', defaultSkin)
        session.addPlayer('socket-2', 'uid-2', 'Bob', defaultSkin)

        // Ambos nascem juntos; mover o Alice propaga o grupo para os dois
        const changed = session.movePlayer('uid-1', 2, 2)

        const alice = session.getPlayer('uid-1')
        const bob = session.getPlayer('uid-2')

        expect(alice.proximityId).not.toBeNull()
        expect(alice.proximityId).toBe(bob.proximityId)
        expect(changed.sort()).toEqual(['uid-1', 'uid-2'])
    })

    it('jogadores distantes não compartilham proximityId', () => {
        session.addPlayer('socket-1', 'uid-1', 'Alice', defaultSkin)
        session.addPlayer('socket-2', 'uid-2', 'Bob', defaultSkin)

        // Alice sai do alcance (raio é 3 tiles)
        session.movePlayer('uid-1', 10, 10)

        expect(session.getPlayer('uid-1').proximityId).toBeNull()
    })

    it('jogadores em salas diferentes nunca compartilham proximidade', () => {
        const multiRoom = new Session('realm-2', makeRealmData(2))
        multiRoom.addPlayer('socket-1', 'uid-1', 'Alice', defaultSkin)
        multiRoom.addPlayer('socket-2', 'uid-2', 'Bob', defaultSkin)

        // Forma o grupo na sala 0 (adjacentes)
        const joined = multiRoom.movePlayer('uid-1', 1, 1)
        expect(joined.sort()).toEqual(['uid-1', 'uid-2'])
        expect(multiRoom.getPlayer('uid-1').proximityId).not.toBeNull()

        // Bob sai de sala: Alice, que ficou para trás, sai do grupo
        multiRoom.changeRoom('uid-2', 1, 0, 0)
        const changed = multiRoom.movePlayer('uid-1', 2, 2)

        expect(multiRoom.getPlayer('uid-1').proximityId).toBeNull()
        expect(changed).toContain('uid-1')
        expect(multiRoom.getPlayersInRoom(1)).toHaveLength(1)
        expect(multiRoom.getPlayersInRoom(0)).toHaveLength(1)
    })

    it('changeRoom move os índices de sala e de coordenada', () => {
        const multiRoom = new Session('realm-3', makeRealmData(2))
        multiRoom.addPlayer('socket-1', 'uid-1', 'Alice', defaultSkin)

        multiRoom.changeRoom('uid-1', 1, 4, 4)

        expect(multiRoom.getPlayerRoom('uid-1')).toBe(1)
        expect(multiRoom.getPlayersInRoom(0)).toHaveLength(0)
        expect(multiRoom.getPlayersInRoom(1)).toHaveLength(1)
        expect(multiRoom.getPlayer('uid-1')).toMatchObject({ x: 4, y: 4 })
    })
})

describe('SessionManager', () => {
    let manager: SessionManager

    beforeEach(() => {
        manager = new SessionManager()
    })

    it('faz o roundtrip de entrada/saída e limpa todos os índices', () => {
        manager.createSession('realm-1', makeRealmData())
        manager.addPlayerToSession('socket-1', 'realm-1', 'uid-1', 'Alice', defaultSkin)

        expect(manager.getPlayerSession('uid-1')).toBeDefined()
        expect(manager.getSocketIdsInRoom('realm-1', 0)).toEqual(['socket-1'])

        const left = manager.logOutBySocketId('socket-1')
        expect(left).toBe(true)
        expect(manager.getSession('realm-1')).toBeUndefined()
        expect(manager.getPlayerSession('uid-1')).toBeUndefined()
    })

    it('destrói a sessão quando o último jogador sai (vazamento de memória)', () => {
        manager.createSession('realm-1', makeRealmData())
        manager.addPlayerToSession('socket-1', 'realm-1', 'uid-1', 'Alice', defaultSkin)
        manager.addPlayerToSession('socket-2', 'realm-1', 'uid-2', 'Bob', defaultSkin)

        manager.logOutBySocketId('socket-1')
        // Ainda tem gente online: a sessão permanece
        expect(manager.getSession('realm-1')).toBeDefined()

        manager.logOutBySocketId('socket-2')
        // Regressão: sessões ficavam para sempre na memória
        expect(manager.getSession('realm-1')).toBeUndefined()
    })

    it('logOutPlayer é seguro quando a sessão já foi terminada', () => {
        manager.createSession('realm-1', makeRealmData())
        manager.addPlayerToSession('socket-1', 'realm-1', 'uid-1', 'Alice', defaultSkin)

        manager.terminateSession('realm-1')

        // Regressão: antes explodia (TypeError) e deixava os índices internos vazando
        expect(() => manager.logOutBySocketId('socket-1')).not.toThrow()
        expect(manager.getPlayerSession('uid-1')).toBeUndefined()
    })

    it('terminateSession devolve os jogadores e limpa os índices', () => {
        manager.createSession('realm-1', makeRealmData())
        manager.addPlayerToSession('socket-1', 'realm-1', 'uid-1', 'Alice', defaultSkin)
        manager.addPlayerToSession('socket-2', 'realm-1', 'uid-2', 'Bob', defaultSkin)

        const players = manager.terminateSession('realm-1')

        expect(players.map((p) => p.uid).sort()).toEqual(['uid-1', 'uid-2'])
        expect(players.every((p) => Boolean(p.socketId))).toBe(true)
        expect(manager.getSession('realm-1')).toBeUndefined()
        expect(manager.getPlayerSession('uid-1')).toBeUndefined()
        expect(manager.getPlayerSession('uid-2')).toBeUndefined()
    })

    it('logOutPlayer idempotente para jogador sem sessão', () => {
        expect(() => manager.logOutPlayer('nunca-entrou')).not.toThrow()
        expect(manager.logOutBySocketId('socket-fantasma')).toBe(false)
    })
})
