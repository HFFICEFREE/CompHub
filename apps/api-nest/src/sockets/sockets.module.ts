import { Module } from '@nestjs/common'
import { GameGateway } from './game.gateway'
import { WsErrorFilter } from './ws-error.filter'

@Module({
    providers: [GameGateway, WsErrorFilter],
    exports: [GameGateway],
})
export class SocketsModule {}
