import { Module } from '@nestjs/common'
import { RealtimeService } from './realtime.service'
import { SocketsModule } from '../sockets/sockets.module'
import { SupabaseModule } from '../supabase/supabase.module'

@Module({
    imports: [SupabaseModule, SocketsModule],
    providers: [RealtimeService],
})
export class RealtimeModule {}
