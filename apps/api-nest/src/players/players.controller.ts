import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common'
import { SessionManager } from '@comphub/core'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { User } from '@supabase/supabase-js'
import { GetPlayerCounts, GetPlayersInRoom } from './players.schemas'

@Controller()
@UseGuards(AuthGuard)
export class PlayersController {
    constructor(private readonly sessions: SessionManager) {}

    @Get('getPlayersInRoom')
    async getPlayersInRoom(@Query() query: Record<string, string>, @CurrentUser() user: User) {
        const params = GetPlayersInRoom.safeParse(query)
        if (!params.success) {
            throw new BadRequestException('Invalid parameters')
        }

        const session = this.sessions.getPlayerSession(user.id)
        if (!session) {
            throw new BadRequestException('User not in a realm.')
        }

        const players = session.getPlayersInRoom(params.data.roomIndex).map(({ uid, username, x, y, skin }) => ({
            uid,
            username,
            x,
            y,
            skin,
        }))

        return { players }
    }

    @Get('getPlayerCounts')
    async getPlayerCounts(@Query() query: Record<string, string>) {
        const params = GetPlayerCounts.safeParse(query)
        if (!params.success) {
            throw new BadRequestException('Invalid parameters')
        }

        if (params.data.realmIds.length > 100) {
            throw new BadRequestException('Too many server IDs')
        }

        const playerCounts: number[] = []
        for (const realmId of params.data.realmIds) {
            const session = this.sessions.getSession(realmId)
            playerCounts.push(session ? session.getPlayerCount() : 0)
        }

        return { playerCounts }
    }
}
