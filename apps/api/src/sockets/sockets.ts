import { Server } from 'socket.io'
import { JoinRealm, Disconnect, OnEventCallback, MovePlayer, Teleport, ChangedSkin, NewMessage } from './socket-types'
import { z } from 'zod'
import { supabase } from '../supabase'
import { users } from '../Users'
import { sessionManager } from '../session'
import { removeExtraSpaces } from '../utils'
import { kickPlayer } from './helpers'
import { formatEmailToName } from '../utils'
import { RateLimiter } from '../rate-limit'

const joiningInProgress = new Set<string>()

// Rate limits por uid. Generosos de propósito: o cliente NÃO retenta
// movimentos perdidos (o personagem continua andando localmente), então
// derrubar um move legítimo causaria desync visual. Mesma filosofia do
// limite de 30 jogadores/sessão: proteger o servidor sem quebrar a UX.
const moveLimiter = new RateLimiter(30, 1_000)
const messageLimiter = new RateLimiter(5, 2_000)
const skinLimiter = new RateLimiter(3, 2_000)
const teleportLimiter = new RateLimiter(5, 2_000)

function protectConnection(io: Server) {
    io.use(async (socket, next) => {
        const access_token = socket.handshake.headers['authorization']?.split(' ')[1]
        const uid = socket.handshake.query.uid as string
        if (!access_token || !uid) {
            const error = new Error("Invalid access token or uid.")
            return next(error)
        } else {
            const { data: user, error: error } = await supabase.auth.getUser(access_token)
            if (error) {
                return next(new Error("Invalid access token."))
            }
            if (!user || user.user.id !== uid) {
                return next(new Error("Invalid uid."))
            }
            users.addUser(uid, user.user)
            next()
        }
    })
}


export function sockets(io: Server) {
    protectConnection(io)

    // Handle a connection
    io.on('connection', (socket) => {

        function on<T>(eventName: string, schema: z.ZodType<T>, callback: OnEventCallback<T>) {
            socket.on(eventName, (data: unknown) => {
                const parsed = schema.safeParse(data)
                if (!parsed.success) return

                const session = sessionManager.getPlayerSession(socket.handshake.query.uid as string)
                if (!session) {
                    return
                }
                callback({ session, data: parsed.data })
            })
        }

        function emit(eventName: string, data: unknown) {
            const session = sessionManager.getPlayerSession(socket.handshake.query.uid as string)
            if (!session) {
                return
            }

            const room = session.getPlayerRoom(socket.handshake.query.uid as string)
            const players = session.getPlayersInRoom(room)

            for (const player of players) {
                if (player.socketId === socket.id) continue

                io.to(player.socketId).emit(eventName, data)
            }
        }

        function emitToSocketIds(socketIds: string[], eventName: string, data: unknown) {
            for (const socketId of socketIds) {
                io.to(socketId).emit(eventName, data)
            }
        }

        socket.on('joinRealm', async (realmData: z.infer<typeof JoinRealm>) => {
            const uid = socket.handshake.query.uid as string
            const rejectJoin = (reason: string) => {
                socket.emit('failedToJoinRoom', reason)
            }

            if (JoinRealm.safeParse(realmData).success === false) {
                return rejectJoin('Invalid request data.')
            }

            if (joiningInProgress.has(uid)) {
                // Bug: faltava return — o fluxo continuava e entrava em duplicidade
                return rejectJoin('Already joining a space.')
            }
            joiningInProgress.add(uid)

            try {
                const session = sessionManager.getSession(realmData.realmId)
                if (session) {
                    const playerCount = session.getPlayerCount()
                    if (playerCount >= 30) {
                        return rejectJoin("Space is full. It's 30 players max.")
                    }
                }

                const { data, error } = await supabase.from('realms').select('owner_id, share_id, map_data, only_owner').eq('id', realmData.realmId).single()

                if (error || !data) {
                    return rejectJoin('Space not found.')
                }
                const { data: profile, error: profileError } = await supabase.from('profiles').select('skin').eq('id', uid).single()
                if (profileError) {
                    return rejectJoin('Failed to get profile.')
                }

                const realm = data

                const join = () => {
                    if (!sessionManager.getSession(realmData.realmId)) {
                        sessionManager.createSession(realmData.realmId, data.map_data)
                    }

                    const currentSession = sessionManager.getPlayerSession(uid)
                    if (currentSession) {
                        kickPlayer(uid, 'You have logged in from another location.')
                    }

                    const user = users.getUser(uid)!
                    const username = formatEmailToName(user.user_metadata.email)
                    sessionManager.addPlayerToSession(socket.id, realmData.realmId, uid, username, profile.skin)
                    const newSession = sessionManager.getPlayerSession(uid)
                    const player = newSession.getPlayer(uid)

                    socket.join(realmData.realmId)
                    socket.emit('joinedRealm')
                    emit('playerJoinedRoom', player)
                }

                // Autorização: dono sempre entra; senão, precisa de link válido
                if (realm.owner_id === uid) {
                    return join()
                }

                if (realm.only_owner) {
                    return rejectJoin('This realm is private right now. Come back later!')
                }

                if (realm.share_id === realmData.shareId) {
                    return join()
                } else {
                    return rejectJoin('The share link has been changed.')
                }
            } catch {
                // Sem este finally, uma exceção deixaria o uid travado em
                // joiningInProgress e o jogador nunca mais conseguiria entrar
                rejectJoin('Failed to join the space.')
            } finally {
                joiningInProgress.delete(uid)
            }
        })

        // Handle a disconnection
        on('disconnect', Disconnect, ({ session }) => {
            const uid = socket.handshake.query.uid as string
            const socketIds = sessionManager.getSocketIdsInRoom(session.id, session.getPlayerRoom(uid))
            const success = sessionManager.logOutBySocketId(socket.id)
            if (success) {
                emitToSocketIds(socketIds, 'playerLeftRoom', uid)
                users.removeUser(uid)
            }
        })

        on('movePlayer', MovePlayer, ({ session, data }) => {
            const uid = socket.handshake.query.uid as string
            const player = session.getPlayer(uid)
            if (!player) return

            if (!moveLimiter.allow(uid)) return

            // O cliente só emite movimentos alcançáveis (BFS dele); como o
            // conjunto de obstáculos do servidor é subconjunto do dele,
            // caminho legítimo sempre passa aqui e atalho é recusado
            if (!session.hasPath(player.room, player.x, player.y, data.x, data.y)) return

            const changedPlayers = session.movePlayer(player.uid, data.x, data.y)

            emit('playerMoved', {
                uid: player.uid,
                x: player.x,
                y: player.y
            })

            for (const uid of changedPlayers) {
                const changedPlayerData = session.getPlayer(uid)

                emitToSocketIds([changedPlayerData.socketId], 'proximityUpdate', {
                    proximityId: changedPlayerData.proximityId
                })
            }
        })  

        on('teleport', Teleport, ({ session, data }) => {
            const uid = socket.handshake.query.uid as string
            const player = session.getPlayer(uid)
            if (!player) return

            if (!teleportLimiter.allow(uid)) return

            // O cliente só emite 'teleport' depois de pisar num tile com
            // teleporter (PlayApp.teleportIfOnTeleportSquare lê o teleporter
            // do tile ATUAL do jogador). Validamos o mesmo: o tile de origem
            // precisa ter um teleporter apontando exatamente para o destino
            // pedido, e o destino precisa existir no mapa.
            const teleporter = session.getTeleporterAt(player.room, player.x, player.y)
            if (!teleporter) return
            if (teleporter.roomIndex !== data.roomIndex || teleporter.x !== data.x || teleporter.y !== data.y) return
            if (!session.map_data.rooms[data.roomIndex]) return

            if (player.room !== data.roomIndex) {
                emit('playerLeftRoom', uid)
                const changedPlayers = session.changeRoom(uid, data.roomIndex, data.x, data.y)
                emit('playerJoinedRoom', player)

                for (const changedUid of changedPlayers) {
                    const changedPlayerData = session.getPlayer(changedUid)

                    emitToSocketIds([changedPlayerData.socketId], 'proximityUpdate', {
                        proximityId: changedPlayerData.proximityId
                    })
                }
            } else {
                const changedPlayers = session.movePlayer(player.uid, data.x, data.y)
                emit('playerTeleported', { uid, x: player.x, y: player.y })

                for (const changedUid of changedPlayers) {
                    const changedPlayerData = session.getPlayer(changedUid)

                    emitToSocketIds([changedPlayerData.socketId], 'proximityUpdate', {
                        proximityId: changedPlayerData.proximityId
                    })
                }
            }
        })

        on('changedSkin', ChangedSkin, ({ session, data }) => {
            const uid = socket.handshake.query.uid as string
            const player = session.getPlayer(uid)
            if (!player) return

            if (!skinLimiter.allow(uid)) return

            player.skin = data
            emit('playerChangedSkin', { uid, skin: player.skin })
        })

        on('sendMessage', NewMessage, ({ data }) => {
            // cannot exceed 300 characters
            if (data.length > 300 || data.trim() === '') return

            const uid = socket.handshake.query.uid as string
            if (!messageLimiter.allow(uid)) return

            const message = removeExtraSpaces(data)

            emit('receiveMessage', { uid, message })
        })
    })
}