import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import type { User } from '@supabase/supabase-js'
import { SupabaseService } from '../supabase/supabase.service'

type AuthedRequest = Request & { user?: User }

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly supabase: SupabaseService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthedRequest>()
        const access_token = request.headers.authorization?.split(' ')[1]

        if (!access_token) {
            throw new UnauthorizedException('No access token provided')
        }

        const { data, error } = await this.supabase.client.auth.getUser(access_token)

        if (error || !data.user) {
            throw new UnauthorizedException('Invalid access token')
        }

        request.user = data.user
        return true
    }
}
