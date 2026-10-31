import { Module } from '@nestjs/common'
import { HealthController } from './health/health.controller'
import { PlayersController } from './players/players.controller'
import { AgoraController } from './agora/agora.controller'
import { SessionModule } from './session/session.module'
import { SupabaseModule } from './supabase/supabase.module'
import { SocketsModule } from './sockets/sockets.module'

@Module({
    imports: [SupabaseModule, SessionModule, SocketsModule],
    controllers: [HealthController, PlayersController, AgoraController],
})
export class AppModule {}
