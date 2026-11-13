import io, { Socket } from 'socket.io-client'
import { createClient } from '../supabase/client'
import { request } from './requests'

type ConnectionResponse = {
    success: boolean
    errorMessage: string
}

const backend_url: string = process.env.NEXT_PUBLIC_BACKEND_URL as string

class Server {
    public socket: Socket = {} as Socket
    private pendingResolve: ((response: ConnectionResponse) => void) | null = null

    public async connect(
        realmId: string,
        uid: string,
        shareId: string,
        access_token: string,
        offlineData?: { mapData: unknown; skin: string },
    ) {
        // Encerra qualquer conexao anterior (ex.: StrictMode remontando o
        // efeito) antes de criar a nova.
        this.disconnect()

        const socket = io(backend_url, {
        reconnection: true,
        autoConnect: false,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transportOptions: {
            polling: {
                extraHeaders: {
                    'Authorization': `Bearer ${access_token}`
                }
            }
        },
        query: {
            uid
        }
    })
        this.socket = socket

        return new Promise<ConnectionResponse>((resolve) => {
            const finish = (response: ConnectionResponse) => {
                if (this.pendingResolve !== finish) return
                this.pendingResolve = null
                resolve(response)
            }
            this.pendingResolve = finish

            socket.connect()

            socket.on('connect', () => {
                // Ignora conexoes antigas que ainda estavam em andamento.
                if (this.socket !== socket) {
                    socket.disconnect()
                    return
                }

                // No offline o backend nao consulta Supabase: o mapa/skin vao
                // junto no join. Em producao o payload continua identico.
                const joinPayload: Record<string, unknown> = { realmId, shareId }
                if (process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true' && offlineData) {
                    joinPayload.mapData = offlineData.mapData
                    joinPayload.skin = offlineData.skin
                }

                socket.emit('joinRealm', joinPayload)
            })

            socket.on('joinedRealm', () => {
                finish({
                    success: true,
                    errorMessage: ''
                })
            })

            socket.on('failedToJoinRoom', (reason: string) => {
                finish({
                    success: false,
                    errorMessage: reason
                })
            })

            socket.on('connect_error', (err: any) => {
                console.error('Connection error:', err)
                finish({
                    success: false,
                    errorMessage: err.message
                })
            })

            socket.on('disconnect', () => {
                finish({
                    success: false,
                    errorMessage: 'Disconnected from server.'
                })
            })
        })
    }

    public disconnect() {
        const socket = this.socket
        this.socket = {} as Socket

        if (typeof socket.disconnect === 'function') {
            socket.disconnect()
        }

        // Libera um connect em andamento para nao deixar a promise pendurada.
        if (this.pendingResolve) {
            this.pendingResolve({
                success: false,
                errorMessage: 'Connection closed.'
            })
        }
    }

    public async getPlayersInRoom(roomIndex: number) {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return { data: null, error: { message: 'No session provided' } }

        return request('/getPlayersInRoom', {
            roomIndex: roomIndex,
        }, session.access_token)
    }
}

const server = new Server()

export { server }