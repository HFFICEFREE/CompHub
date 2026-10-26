import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { sockets } from './sockets/sockets'
import routes from './routes/routes'
import { supabase } from './supabase'
import { sessionManager } from './session'
import type { RealmData } from './session'
import type { RealtimePostgresUpdatePayload, RealtimePostgresDeletePayload } from '@supabase/supabase-js'

const app = express()
const server = http.createServer(app)

app.use(cors({
    origin: process.env.FRONTEND_URL
}))

// Initialize Socket.IO server
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL
  }
})

app.use(routes())

sockets(io)

type RealmRow = {
    id: string
    map_data: RealmData
    share_id: string
    only_owner: boolean
}

// Encerra a sessão do realm e desliga todo mundo que estava nela.
// (Fica aqui fora de session.ts para não criar ciclo de import com sockets/helpers)
function kickSessionPlayers(realmId: string, reason: string) {
    const players = sessionManager.terminateSession(realmId)
    for (const player of players) {
        io.sockets.sockets.get(player.socketId)?.leave(realmId)
        io.to(player.socketId).emit('kicked', reason)
    }
}

function onRealmUpdate(payload: RealtimePostgresUpdatePayload<RealmRow>) {
    const id = payload.new.id
    const old = payload.old

    if (!old) {
        console.warn(`Realm ${id} updated without previous data. Ensure the realms table has REPLICA IDENTITY FULL.`)
        return
    }

    let refresh = false
    if (JSON.stringify(payload.new.map_data) !== JSON.stringify(old.map_data)) {
        refresh = true
    }
    if (payload.new.share_id !== old.share_id) {
        refresh = true
    }
    if (payload.new.only_owner !== payload.old.only_owner) {
        refresh = true
    }
    if (refresh) {
        kickSessionPlayers(id, "This realm has been changed by the owner.")
    }
}

function onRealmDelete(payload: RealtimePostgresDeletePayload<RealmRow>) {
    // Em DELETE o Supabase envia apenas as colunas da PK em `old`
    if (payload.old.id) {
        kickSessionPlayers(payload.old.id, "This realm is no longer available.")
    }
}

supabase
    .channel('realms')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'realms' }, onRealmUpdate)
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'realms' }, onRealmDelete)
    .subscribe()

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`)
})


export { io }