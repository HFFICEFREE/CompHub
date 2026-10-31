import { Module } from '@nestjs/common'
import { HealthController } from './health/health.controller'
import { PlayersController } from './players/players.controller'
import { AgoraController } from './agora/agora.controller'
import { SessionModule } from './session/session.module'
import { SupabaseModule } from './supabase/supabase.module'
import { SocketsModule } from './sockets/sockets.module'
import { RealtimeModule } from './realtime/realtime.module'

@Module({
    imports: [SupabaseModule, SessionModule, SocketsModule, RealtimeModule],
    controllers: [HealthController, PlayersController, AgoraController],
})
export class AppModule {}
