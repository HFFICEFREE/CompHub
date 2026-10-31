import { z } from 'zod'
import type { Session } from '@comphub/core'

export const JoinRealm = z.object({
    realmId: z.string(),
    shareId: z.string(),
})

export const Disconnect = z.any()

export const MovePlayer = z.object({
    x: z.number().int(),
    y: z.number().int(),
})

export const Teleport = z.object({
    x: z.number().int(),
    y: z.number().int(),
    roomIndex: z.number().int(),
})

export const ChangedSkin = z.string()

export const NewMessage = z.string()

export type OnEventCallback<T = unknown> = (args: { session: Session, data: T }) => void