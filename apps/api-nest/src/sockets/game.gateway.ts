import { Logger, UseFilters } from '@nestjs/common'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import type { User } from '@supabase/supabase-js'
import type { z } from 'zod'
import {
    ChangedSkin,
    JoinRealm,
    MovePlayer,
    NewMessage,
    RateLimiter,
    SessionManager,
    Teleport,
    formatEmailToName,
    removeExtraSpaces,
} from '@comphub/core'
import { SupabaseService } from '../supabase/supabase.service'
import { getAllowedOrigins } from '../config/origins'
import { getTokenExpirationMs } from '../auth/token-expiry'
import { WsErrorFilter } from './ws-error.filter'

// Todos os handlers retornam void de proposito: no Nest o valor de retorno
// de um @SubscribeMessage vira um evento enviado ao cliente, entao o
// `return rejectJoin(...)` do Express teria que virar `rejectJoin(); return`.
@UseFilters(WsErrorFilter)
@WebSocketGateway({
    cors: { origin: getAllowedOrigins(process.env.FRONTEND_URL) },
})
export class GameGateway implements OnGatewayInit {
    @WebSocketServer()
    server!: Server

    private readonly logger = new Logger(GameGateway.name)

    // Rate limits por uid. Generosos de proposito: o cliente NAO retenta
    // movimentos perdidos (o personagem continua andando localmente), entao
    // derrubar um move legitimo causaria desync visual. Mesma filosofia do
    // limite de 30 jogadores/sessao: proteger o servidor sem quebrar a UX.
    private readonly moveLimiter = new RateLimiter(30, 1_000)
    private readonly messageLimiter = new RateLimiter(5, 2_000)
    private readonly skinLimiter = new RateLimiter(3, 2_000)
    private readonly teleportLimiter = new RateLimiter(5, 2_000)

    private readonly joiningInProgress = new Set<string>()

    constructor(
        private readonly sessions: SessionManager,
        private readonly supabase: SupabaseService,
    ) {}

    afterInit(server: Server): void {
        server.use(async (socket, next) => {
            const access_token = socket.handshake.headers['authorization']?.split(' ')[1]
            const uid = socket.handshake.query.uid as string

            if (!access_token || !uid) {
                return next(new Error('Invalid access token or uid.'))
            }

            const { data: user, error } = await this.supabase.client.auth.getUser(access_token)
            if (error) {
                return next(new Error('Invalid access token.'))
            }
            if (!user || user.user.id !== uid) {
                return next(new Error('Invalid uid.'))
            }

            // Em vez do registro global `users` do Express: o usuario validado
            // vive no proprio socket, entao nao ha estado compartilhado a limpar
            // nem risco de um segundo socket do mesmo uid apagar o registro do
            // primeiro.
            socket.data.user = user.user

            const expiresAt = getTokenExpirationMs(access_token)
            if (expiresAt !== null) {
                const timeout = setTimeout(() => {
                    socket.disconnect(true)
                }, Math.max(0, expiresAt - Date.now()))
                socket.once('disconnect', () => clearTimeout(timeout))
            }

            next()
        })

        this.logger.log('Handshake de autenticacao registrado')
    }

    // ---------------------------------------------------------------- helpers

    private uidOf(socket: Socket): string {
        return socket.handshake.query.uid as string
    }

    private userOf(socket: Socket): User {
        return socket.data.user as User
    }

    private sessionOf(socket: Socket) {
        return this.sessions.getPlayerSession(this.uidOf(socket))
    }

    /** Envia para todos da sala atual, exceto o remetente (helper `emit` do Express). */
    private emitToOthersInRoom(socket: Socket, eventName: string, data: unknown): void {
        const uid = this.uidOf(socket)
        const session = this.sessions.getPlayerSession(uid)
        if (!session) return

        for (const player of session.getPlayersInRoom(session.getPlayerRoom(uid))) {
            if (player.socketId === socket.id) continue
            this.server.to(player.socketId).emit(eventName, data)
        }
    }

    private emitToSocketIds(socketIds: string[], eventName: string, data: unknown): void {
        for (const socketId of socketIds) {
            this.server.to(socketId).emit(eventName, data)
        }
    }

    /** Espelho de apps/api/src/sockets/helpers.ts (que usa o `io` do Express). */
    private kickFromSession(uid: string, reason: string): void {
        const session = this.sessions.getPlayerSession(uid)
        if (!session) return

        for (const player of session.getPlayersInRoom(session.getPlayerRoom(uid))) {
            if (player.uid === uid) {
                this.server.to(player.socketId).emit('kicked', reason)
            } else {
                this.server.to(player.socketId).emit('playerLeftRoom', uid)
            }
        }

        const player = session.getPlayer(uid)
        this.server.sockets.sockets.get(player.socketId)?.leave(session.id)
        this.sessions.logOutPlayer(uid)
    }

    // ---------------------------------------------------------------- eventos

    @SubscribeMessage('joinRealm')
    async onJoinRealm(
        @ConnectedSocket() socket: Socket,
        @MessageBody() realmData: z.infer<typeof JoinRealm>,
    ): Promise<void> {
        const uid = this.uidOf(socket)
        const rejectJoin = (reason: string): void => {
            socket.emit('failedToJoinRoom', reason)
        }

        if (JoinRealm.safeParse(realmData).success === false) {
            rejectJoin('Invalid request data.')
            return
        }

        if (this.joiningInProgress.has(uid)) {
            // Bug: faltava return — o fluxo continuava e entrava em duplicidade
            rejectJoin('Already joining a space.')
            return
        }
        this.joiningInProgress.add(uid)

        try {
            const session = this.sessions.getSession(realmData.realmId)
            if (session && session.getPlayerCount() >= 30) {
                rejectJoin("Space is full. It's 30 players max.")
                return
            }

            const { data, error } = await this.supabase.client
                .from('realms')
                .select('owner_id, share_id, map_data, only_owner')
                .eq('id', realmData.realmId)
                .single()

            if (error || !data) {
                rejectJoin('Space not found.')
                return
            }

            const { data: profile, error: profileError } = await this.supabase.client
                .from('profiles')
                .select('skin')
                .eq('id', uid)
                .single()

            if (profileError) {
                rejectJoin('Failed to get profile.')
                return
            }

            const join = (): void => {
                if (!this.sessions.getSession(realmData.realmId)) {
                    this.sessions.createSession(realmData.realmId, data.map_data)
                }

                if (this.sessions.getPlayerSession(uid)) {
                    this.kickFromSession(uid, 'You have logged in from another location.')
                }

                const user = this.userOf(socket)
                const username = formatEmailToName(user.user_metadata.email)

                if (!this.sessions.addPlayerToSession(socket.id, realmData.realmId, uid, username, profile.skin)) {
                    rejectJoin('Failed to join the space.')
                    return
                }

                const newSession = this.sessions.getPlayerSession(uid)
                const player = newSession.getPlayer(uid)

                socket.join(realmData.realmId)
                socket.emit('joinedRealm')
                this.emitToOthersInRoom(socket, 'playerJoinedRoom', player)
            }

            // Autorizacao: dono sempre entra; senao, precisa de link valido
            if (data.owner_id === uid) {
                join()
                return
            }

            if (data.only_owner) {
                rejectJoin('This realm is private right now. Come back later!')
                return
            }

            if (data.share_id === realmData.shareId) {
                join()
            } else {
                rejectJoin('The share link has been changed.')
            }
        } catch {
            // Sem este finally, uma excecao deixaria o uid travado em
            // joiningInProgress e o jogador nunca mais conseguiria entrar
            rejectJoin('Failed to join the space.')
        } finally {
            this.joiningInProgress.delete(uid)
        }
    }

    @SubscribeMessage('movePlayer')
    onMovePlayer(
        @ConnectedSocket() socket: Socket,
        @MessageBody() rawData: unknown,
    ): void {
        const parsed = MovePlayer.safeParse(rawData)
        if (!parsed.success) return

        const session = this.sessionOf(socket)
        if (!session) return

        const uid = this.uidOf(socket)
        const player = session.getPlayer(uid)
        if (!player) return

        if (!this.moveLimiter.allow(uid)) return

        if (!session.isWalkable(player.room, parsed.data.x, parsed.data.y)) return

        // O cliente so emite movimentos alcancaveis (BFS dele); como o
        // conjunto de obstaculos do servidor e subconjunto do dele,
        // caminho legitimo sempre passa aqui e atalho e recusado
        if (!session.hasPath(player.room, player.x, player.y, parsed.data.x, parsed.data.y)) return

        const changedPlayers = session.movePlayer(player.uid, parsed.data.x, parsed.data.y)

        this.emitToOthersInRoom(socket, 'playerMoved', {
            uid: player.uid,
            x: player.x,
            y: player.y,
        })

        this.emitProximityUpdate(changedPlayers)
    }

    @SubscribeMessage('teleport')
    onTeleport(@ConnectedSocket() socket: Socket, @MessageBody() rawData: unknown): void {
        const parsed = Teleport.safeParse(rawData)
        if (!parsed.success) return

        const session = this.sessionOf(socket)
        if (!session) return

        const uid = this.uidOf(socket)
        const player = session.getPlayer(uid)
        if (!player) return

        if (!this.teleportLimiter.allow(uid)) return

        // O cliente so emite 'teleport' depois de pisar num tile com
        // teleporter (PlayApp.teleportIfOnTeleportSquare le o teleporter
        // do tile ATUAL do jogador). Validamos o mesmo: o tile de origem
        // precisa ter um teleporter apontando exatamente para o destino
        // pedido, e o destino precisa existir no mapa.
        const teleporter = session.getTeleporterAt(player.room, player.x, player.y)
        if (!teleporter) return
        if (teleporter.roomIndex !== parsed.data.roomIndex) return
        if (teleporter.x !== parsed.data.x || teleporter.y !== parsed.data.y) return
        if (!session.isWalkable(parsed.data.roomIndex, parsed.data.x, parsed.data.y)) return

        if (player.room !== parsed.data.roomIndex) {
            this.emitToOthersInRoom(socket, 'playerLeftRoom', uid)
            const changedPlayers = session.changeRoom(uid, parsed.data.roomIndex, parsed.data.x, parsed.data.y)
            this.emitToOthersInRoom(socket, 'playerJoinedRoom', player)
            this.emitProximityUpdate(changedPlayers)
        } else {
            const changedPlayers = session.movePlayer(player.uid, parsed.data.x, parsed.data.y)
            this.emitToOthersInRoom(socket, 'playerTeleported', { uid, x: player.x, y: player.y })
            this.emitProximityUpdate(changedPlayers)
        }
    }

    @SubscribeMessage('changedSkin')
    onChangedSkin(@ConnectedSocket() socket: Socket, @MessageBody() rawData: unknown): void {
        const parsed = ChangedSkin.safeParse(rawData)
        if (!parsed.success) return

        const session = this.sessionOf(socket)
        if (!session) return

        const uid = this.uidOf(socket)
        const player = session.getPlayer(uid)
        if (!player) return

        if (!this.skinLimiter.allow(uid)) return

        player.skin = parsed.data
        this.emitToOthersInRoom(socket, 'playerChangedSkin', { uid, skin: player.skin })
    }

    @SubscribeMessage('sendMessage')
    onSendMessage(@ConnectedSocket() socket: Socket, @MessageBody() rawData: unknown): void {
        const parsed = NewMessage.safeParse(rawData)
        if (!parsed.success) return

        // cannot exceed 300 characters
        if (parsed.data.length > 300 || parsed.data.trim() === '') return

        const uid = this.uidOf(socket)
        if (!this.messageLimiter.allow(uid)) return

        const message = removeExtraSpaces(parsed.data)

        this.emitToOthersInRoom(socket, 'receiveMessage', { uid, message })
    }

    handleDisconnect(socket: Socket): void {
        const uid = this.uidOf(socket)
        const session = this.sessions.getPlayerSession(uid)
        if (!session) return

        const socketIds = this.sessions.getSocketIdsInRoom(session.id, session.getPlayerRoom(uid))
        const success = this.sessions.logOutBySocketId(socket.id)
        if (success) {
            this.emitToSocketIds(socketIds, 'playerLeftRoom', uid)
        }
    }

    // ------------------------------------------------------------- interno

    private emitProximityUpdate(changedPlayers: string[]): void {
        for (const uid of changedPlayers) {
            const player = this.sessions.getPlayerSession(uid)?.getPlayer(uid)
            if (!player) continue

            this.emitToSocketIds([player.socketId], 'proximityUpdate', {
                proximityId: player.proximityId,
            })
        }
    }
}
