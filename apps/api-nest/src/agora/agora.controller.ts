import { BadRequestException, Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common'
import { SessionManager } from '@comphub/core'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { User } from '@supabase/supabase-js'

@Controller()
@UseGuards(AuthGuard)
export class AgoraController {
    constructor(private readonly sessions: SessionManager) {}

    @Get('agoraChannel')
    async getAgoraChannel(@CurrentUser() user: User) {
        const session = this.sessions.getPlayerSession(user.id)
        if (!session) {
            throw new BadRequestException('User not in a realm.')
        }

        const channelName = session.getPlayerChannelId(user.id)
        if (!channelName) {
            throw new ForbiddenException('User is not in a voice channel.')
        }

        return { channelName }
    }
}
