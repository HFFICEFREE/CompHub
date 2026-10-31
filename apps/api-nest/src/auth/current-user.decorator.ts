import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { User } from '@supabase/supabase-js'

// Param decorator que expoe o usuario validado pelo AuthGuard.
// Equivalente ao `user.user` que cada rota do Express resolvia a mao.
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => {
    return context.switchToHttp().getRequest().user
})
